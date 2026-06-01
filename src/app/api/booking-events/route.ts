import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookingId = new URL(req.url).searchParams.get("bookingId") || "";

  if (!bookingId) {
    return NextResponse.json({ error: "Booking id requerido" }, { status: 400 });
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
