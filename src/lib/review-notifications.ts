import { randomUUID } from "crypto";

import { createActivityLog } from "@/lib/activity";
import { recordBookingEvent } from "@/lib/booking-events";
import { sendNotificationChannel } from "@/lib/notification-channels";
import { createPatientActivity } from "@/lib/patient-activity";
import { generateReviewLink } from "@/lib/review-link";
import { getRenderedEmailTemplate } from "@/lib/server-email-templates";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

type ReviewRequestBooking = {
  id: string | number;
  full_name?: string | null;
  email?: string | null;
  clinic_name?: string | null;
  treatment?: string | null;
  review_token?: string | null;
  review_request_count?: number | null;
};

export async function sendReviewRequest(
  booking: ReviewRequestBooking,
  options: { resent?: boolean } = {}
) {
  const reviewToken = booking.review_token || randomUUID();
  const reviewLink = generateReviewLink(String(booking.id), reviewToken);
  const templateVariables = {
    nombre: booking.full_name || "Paciente",
    tratamiento: cleanBrandText(booking.treatment) || "tu tratamiento",
    clinica: cleanBrandText(booking.clinic_name) || "la clinica",
  };
  const { error: tokenError } = await supabase
    .from("bookings")
    .update({ review_token: reviewToken })
    .eq("id", booking.id);

  if (tokenError) {
    throw new Error("La migracion de enlaces seguros de opinion no esta aplicada.");
  }

  const renderedTemplate = await getRenderedEmailTemplate({
    key: "review_request_patient",
    variables: templateVariables,
  });

  if (!renderedTemplate) {
    return {
      status: "skipped" as const,
    };
  }

  const result = await sendNotificationChannel({
    channel: "email",
    recipient: booking.email,
    subject: renderedTemplate.subject,
    title: renderedTemplate.title,
    message: renderedTemplate.message,
    ctaLabel: renderedTemplate.ctaLabel || "Compartir mi experiencia",
    ctaUrl: reviewLink,
    relatedBookingId: booking.id,
  });

  if (result.status !== "sent") {
    return result;
  }

  const now = new Date().toISOString();
  const { error: trackingError } = await supabase
    .from("bookings")
    .update({
      review_requested_at: now,
      review_sent: true,
      review_request_count: Number(booking.review_request_count || 0) + 1,
    })
    .eq("id", booking.id);

  if (trackingError) {
    throw new Error("No se pudo registrar el envio de la solicitud de opinion.");
  }

  await createActivityLog({
    title: options.resent ? "Solicitud de opinion reenviada" : "Solicitud de opinion enviada",
    description: `${booking.full_name || "Paciente"} - ${
      cleanBrandText(booking.clinic_name) || "Consulta"
    }`,
  });

  await createPatientActivity({
    patientName: booking.full_name || "Paciente",
    title: options.resent ? "Opinion solicitada nuevamente" : "Opinion solicitada",
    description: "Se envio un enlace seguro para compartir su experiencia.",
    type: "review",
  });

  await recordBookingEvent({
    bookingId: booking.id,
    eventType: "review_requested",
    actorType: "system",
    resultingStatus: "Completada",
    description: options.resent
      ? "Se reenvio la solicitud de opinion."
      : "Se envio la solicitud de opinion.",
  });

  return result;
}

function cleanBrandText(value?: string | null) {
  return (value || "")
    .replace(/ELARA/gi, "EncuentraTuClinica")
    .replace(/Especialista independiente/gi, "Consulta independiente");
}
