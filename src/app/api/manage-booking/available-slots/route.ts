import { NextResponse } from "next/server";

import {
  getAvailableBookingSlots,
  getTreatmentDuration,
} from "@/lib/booking-availability";
import { patientReschedulableStatuses } from "@/lib/booking-lifecycle";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token") || "";
    const date = searchParams.get("date") || "";

    if (!token || !isDate(date)) {
      return NextResponse.json({ error: "Datos no validos" }, { status: 400 });
    }

    if (date < new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: "Selecciona una fecha futura" }, { status: 400 });
    }

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, specialist_name, treatment, duration_minutes, status")
      .eq("cancellation_token", token)
      .maybeSingle();

    if (!booking || !patientReschedulableStatuses.includes(booking.status)) {
      return NextResponse.json({ error: "La cita no puede reprogramarse" }, { status: 404 });
    }

    const durationMinutes =
      Number(booking.duration_minutes) ||
      (await getTreatmentDuration(booking.treatment));

    const availability = await getAvailableBookingSlots({
      specialistName: booking.specialist_name,
      bookingDate: date,
      durationMinutes,
      bookingId: booking.id,
    });

    return NextResponse.json(availability);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    );
  }
}
