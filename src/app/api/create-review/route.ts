import { NextResponse } from "next/server";

import { recordBookingEvent } from "@/lib/booking-events";
import { getBookingStatusKey } from "@/lib/booking-status";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const bookingId = String(body.booking_id || "").trim();
    const reviewToken = String(body.review_token || "").trim();
    const rating = Number(body.rating);
    const review = String(body.review || "").trim();

    if (
      !bookingId ||
      !reviewToken ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      review.length < 10 ||
      review.length > 1500
    ) {
      return NextResponse.json(
        { error: "Comprueba la puntuacion y escribe una opinion de 10 a 1500 caracteres." },
        { status: 400 }
      );
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id,full_name,clinic_name,specialist_name,treatment,status")
      .eq("id", bookingId)
      .eq("review_token", reviewToken)
      .maybeSingle();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    if (!booking) {
      return NextResponse.json({ error: "El enlace de opinion no es valido." }, { status: 404 });
    }

    if (getBookingStatusKey(booking.status) !== "completed") {
      return NextResponse.json(
        { error: "Solo se permiten opiniones de citas completadas." },
        { status: 409 }
      );
    }

    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existingReview) {
      return NextResponse.json(
        { error: "Esta reserva ya tiene una opinion registrada." },
        { status: 409 }
      );
    }

    const { error } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      patient_name: booking.full_name,
      clinic_name: booking.clinic_name,
      specialist_name: booking.specialist_name,
      treatment: booking.treatment,
      rating,
      review,
      status: "Pendiente",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await recordBookingEvent({
      bookingId,
      eventType: "review_submitted",
      actorType: "patient",
      resultingStatus: booking.status,
      description: "El paciente envio una opinion verificada.",
      metadata: {
        rating,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
