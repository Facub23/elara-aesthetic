import { createHash, randomUUID } from "crypto";
import { NextResponse } from "next/server";

import {
  blockingStatuses,
  getTreatmentDuration,
  validateBookingSlot,
} from "@/lib/booking-availability";
import { recordBookingEvent } from "@/lib/booking-events";
import { notifyBookingCreated } from "@/lib/booking-notifications";
import { getSiteUrl } from "@/lib/site-url";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { getTreatmentName } from "@/lib/treatment-utils";

type SpecialistRecord = {
  clinic_id?: string | number | null;
  clinic_name?: string | null;
  treatments?: Array<string | { name?: string | null }> | null;
};

function normalize(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function hashSubmissionValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function exceedsSubmissionLimit(req: Request, email: string) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipAddress = forwardedFor || req.headers.get("x-real-ip") || "local-request";
  const fingerprints = [
    { value: hashSubmissionValue(`email:${email}`), maximum: 4 },
    { value: hashSubmissionValue(`ip:${ipAddress}`), maximum: 20 },
  ];
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const cleanupBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("booking_submission_attempts")
    .delete()
    .lt("created_at", cleanupBefore);

  for (const fingerprint of fingerprints) {
    const { count, error } = await supabase
      .from("booking_submission_attempts")
      .select("id", { count: "exact", head: true })
      .eq("fingerprint", fingerprint.value)
      .gte("created_at", since);

    if (error) {
      // Allow reservations until the optional protection migration is installed.
      return false;
    }

    if ((count || 0) >= fingerprint.maximum) {
      return true;
    }
  }

  await supabase.from("booking_submission_attempts").insert(
    fingerprints.map((fingerprint) => ({ fingerprint: fingerprint.value }))
  );

  return false;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const clinic_name = cleanText(body.clinic_name);
    const specialist_name = cleanText(body.specialist_name);
    const full_name = cleanText(body.full_name);
    const email = cleanText(body.email).toLowerCase();
    const phone = cleanText(body.phone);
    const booking_date = cleanText(body.booking_date);
    const booking_time = cleanText(body.booking_time);
    const treatment = cleanText(body.treatment);
    const booking_source = cleanText(body.booking_source);
    const source_url = cleanText(body.source_url);
    const booking_context = body.booking_context;

    if (cleanText(body.website)) {
      return NextResponse.json({
        success: true,
        status: "Pendiente confirmacion",
      });
    }

    if (
      !specialist_name ||
      !full_name ||
      !email ||
      !booking_date ||
      !booking_time ||
      !treatment
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Faltan datos",
        },
        {
          status: 400,
        }
      );
    }

    if (!isDate(booking_date) || !isTime(booking_time)) {
      return NextResponse.json(
        { success: false, error: "Fecha u hora no validas" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Email invalido" },
        { status: 400 }
      );
    }

    if (await exceedsSubmissionLimit(req, email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Has realizado varias solicitudes. Espera unos minutos y vuelve a intentarlo.",
        },
        { status: 429 }
      );
    }

    const { data: specialist, error: specialistError } = await supabase
      .from("specialists")
      .select("clinic_id,clinic_name,treatments")
      .eq("name", specialist_name)
      .maybeSingle();

    if (specialistError) {
      return NextResponse.json(
        {
          success: false,
          error: specialistError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!specialist) {
      return NextResponse.json(
        {
          success: false,
          error: "Especialista no encontrado",
        },
        {
          status: 404,
        }
      );
    }

    const specialistRecord = specialist as SpecialistRecord;
    const { data: selectedClinic } = clinic_name
      ? await supabase
          .from("clinics")
          .select("id,name")
          .eq("name", clinic_name)
          .maybeSingle()
      : { data: null };

    const isIndependentSpecialist =
      !specialistRecord.clinic_id && !specialistRecord.clinic_name;
    const belongsToClinic = isIndependentSpecialist
      ? !clinic_name || normalize(clinic_name) === normalize("Especialista independiente")
      : (selectedClinic?.id &&
          specialistRecord.clinic_id &&
          String(selectedClinic.id) === String(specialistRecord.clinic_id)) ||
        normalize(specialistRecord.clinic_name) === normalize(clinic_name);

    if (!belongsToClinic) {
      return NextResponse.json(
        {
          success: false,
          error: "El especialista no pertenece al lugar de atencion seleccionado",
        },
        {
          status: 409,
        }
      );
    }

    const offersTreatment = (specialistRecord.treatments || []).some(
      (item) => normalize(getTreatmentName(item)) === normalize(treatment)
    );

    if (!offersTreatment) {
      return NextResponse.json(
        {
          success: false,
          error: "El especialista no ofrece el tratamiento seleccionado",
        },
        {
          status: 409,
        }
      );
    }

    const bookingDateTime = `${booking_date} ${booking_time}`;
    const durationMinutes = await getTreatmentDuration(treatment);

    const { data: repeatedBooking } = await supabase
      .from("bookings")
      .select("id")
      .ilike("email", email)
      .eq("specialist_name", specialist_name)
      .eq("booking_date", bookingDateTime)
      .eq("booking_time", booking_time)
      .in("status", blockingStatuses)
      .maybeSingle();

    if (repeatedBooking) {
      return NextResponse.json(
        {
          success: false,
          error: "Ya tienes una solicitud activa para ese horario. Revisa tu email de confirmacion.",
        },
        { status: 409 }
      );
    }

    const validationError = await validateBookingSlot({
      specialistName: specialist_name,
      bookingDate: booking_date,
      bookingTime: booking_time,
      durationMinutes,
    });

    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: validationError,
        },
        {
          status: 409,
        }
      );
    }

    const status = "Pendiente confirmacion";
    const confirmationToken = randomUUID();
    const cancellationToken = randomUUID();
    const confirmationExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const bookingPayload = {
      clinic_name: isIndependentSpecialist
        ? "Especialista independiente"
        : clinic_name,
      specialist_name,
      full_name,
      email,
      phone: phone || null,
      booking_date: bookingDateTime,
      booking_time,
      treatment,
      duration_minutes: durationMinutes,
      status,
      confirmation_token: confirmationToken,
      confirmation_expires_at: confirmationExpiresAt,
      cancellation_token: cancellationToken,
      confirmed_by_client: false,
      booking_source: booking_source || "direct",
      source_url: source_url || null,
      booking_context:
        typeof booking_context === "object" && booking_context !== null
          ? booking_context
          : {},
    };

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert([bookingPayload])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "Ese horario acaba de reservarse. Selecciona otro hueco disponible.",
          },
          { status: 409 }
        );
      }

      const missingMarketplaceColumns =
        error.message.includes("booking_source") ||
        error.message.includes("source_url") ||
        error.message.includes("booking_context");

      if (missingMarketplaceColumns) {
        const {
          booking_source: _bookingSource,
          source_url: _sourceUrl,
          booking_context: _bookingContext,
          ...fallbackPayload
        } = bookingPayload;
        const { data: fallbackBooking, error: fallbackError } = await supabase
          .from("bookings")
          .insert([fallbackPayload])
          .select()
          .single();

        if (!fallbackError) {
          const baseUrl = getSiteUrl();

          await recordBookingEvent({
            bookingId: fallbackBooking.id,
            eventType: "created",
            actorType: "patient",
            resultingStatus: status,
            description: "Solicitud de reserva enviada desde el marketplace.",
            metadata: { booking_date, booking_time },
          });

          await notifyBookingCreated(fallbackBooking, {
            confirmationUrl: `${baseUrl}/confirm-booking?token=${confirmationToken}`,
            cancellationUrl: `${baseUrl}/cancel-booking?token=${cancellationToken}`,
          });

          return NextResponse.json({
            success: true,
            status,
          });
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    const baseUrl = getSiteUrl();

    await recordBookingEvent({
      bookingId: booking.id,
      eventType: "created",
      actorType: "patient",
      resultingStatus: status,
      description: "Solicitud de reserva enviada desde el marketplace.",
      metadata: { booking_date, booking_time },
    });

    await notifyBookingCreated(booking, {
      confirmationUrl: `${baseUrl}/confirm-booking?token=${confirmationToken}`,
      cancellationUrl: `${baseUrl}/cancel-booking?token=${cancellationToken}`,
    });

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error interno",
      },
      {
        status: 500,
      }
    );
  }
}
