import { NextResponse } from "next/server";

import {
  getBookingTime,
  getTreatmentDuration,
  normalizeBookingDate,
  validateBookingSlot,
} from "@/lib/booking-availability";
import { patientReschedulableStatuses } from "@/lib/booking-lifecycle";
import { recordBookingEvent } from "@/lib/booking-events";
import { notifyBookingUpdated } from "@/lib/booking-notifications";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = cleanText(body.token);
    const date = cleanText(body.date);
    const time = cleanText(body.time);

    if (
      !token ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^\d{2}:\d{2}$/.test(time)
    ) {
      return NextResponse.json({ error: "Datos no validos" }, { status: 400 });
    }

    if (date < new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: "Selecciona una fecha futura" }, { status: 400 });
    }

    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("cancellation_token", token)
      .maybeSingle();

    if (!booking || !patientReschedulableStatuses.includes(booking.status)) {
      return NextResponse.json({ error: "La cita no puede reprogramarse" }, { status: 404 });
    }

    const previousDate = normalizeBookingDate(booking.booking_date || "");
    const previousTime = getBookingTime(booking);

    if (previousDate === date && previousTime === time) {
      return NextResponse.json(
        { error: "Selecciona un horario diferente al actual" },
        { status: 400 }
      );
    }

    const durationMinutes =
      Number(booking.duration_minutes) ||
      (await getTreatmentDuration(booking.treatment));

    const validationError = await validateBookingSlot({
      bookingId: booking.id,
      specialistName: booking.specialist_name,
      bookingDate: date,
      bookingTime: time,
      durationMinutes,
    });

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 409 });
    }

    const { data: updated, error } = await supabase
      .from("bookings")
      .update({
        booking_date: `${date} ${time}`,
        booking_time: time,
        status: "Reprogramada",
        rescheduled_at: new Date().toISOString(),
        rescheduled_by: "patient",
        previous_booking_date: previousDate,
        previous_booking_time: previousTime,
        reminder_24h_sent_at: null,
        reminder_2h_sent_at: null,
      })
      .eq("id", booking.id)
      .in("status", patientReschedulableStatuses)
      .select("*")
      .maybeSingle();

    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "Ese horario acaba de reservarse. Elige otro disponible." },
        { status: 409 }
      );
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json(
        { error: "La cita fue actualizada mientras realizabas el cambio" },
        { status: 409 }
      );
    }

    await recordBookingEvent({
      bookingId: updated.id,
      eventType: "rescheduled",
      actorType: "patient",
      resultingStatus: "Reprogramada",
      description: "El paciente eligio un nuevo horario disponible.",
      metadata: {
        previous_date: previousDate,
        previous_time: previousTime,
        next_date: date,
        next_time: time,
      },
    });

    await notifyBookingUpdated(updated, {
      previousDate,
      previousTime,
      updatedBy: "patient",
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    );
  }
}
