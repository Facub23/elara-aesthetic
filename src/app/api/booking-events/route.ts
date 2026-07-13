import { NextResponse } from "next/server";

import { hasAdminPermission } from "@/lib/admin-access";
import { isBookingInAdminScope } from "@/lib/admin-scope";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const admin = await getAdminRequestContext();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAdminPermission(admin, "bookings")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bookingId = new URL(req.url).searchParams.get("bookingId") || "";

  if (!bookingId) {
    return NextResponse.json({ error: "Booking id requerido" }, { status: 400 });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id,clinic_name,specialist_name")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || !(await isBookingInAdminScope(admin, booking))) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("booking_events")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Ejecuta la migracion del historial de reservas." },
      { status: 503 }
    );
  }

  return NextResponse.json({ events: data || [] });
}
