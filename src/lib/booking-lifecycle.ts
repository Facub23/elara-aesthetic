import "server-only";

import { createActivityLog } from "@/lib/activity";
import { createAdminNotification } from "@/lib/admin-notifications";
import { recordBookingEvent } from "@/lib/booking-events";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export const pendingConfirmationStatuses = [
  "Pendiente",
  "Pendiente confirmacion",
  "Pendiente confirmación",
];

export const cancellableBookingStatuses = [
  ...pendingConfirmationStatuses,
  "Confirmada",
  "Reprogramada",
];

export const patientReschedulableStatuses = [
  "Confirmada",
  "Reprogramada",
];

export function isConfirmationExpired(booking: {
  confirmation_expires_at?: string | null;
}) {
  return Boolean(
    booking.confirmation_expires_at &&
      new Date(booking.confirmation_expires_at).getTime() <= Date.now()
  );
}

export async function expirePendingBooking(booking: {
  id: string | number;
  full_name?: string | null;
  specialist_name?: string | null;
}) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "Expirada",
      expired_at: now,
    })
    .eq("id", booking.id)
    .in("status", pendingConfirmationStatuses)
    .select("id")
    .maybeSingle();

  if (error || !data) return false;

  await Promise.all([
    recordBookingEvent({
      bookingId: booking.id,
      eventType: "expired",
      actorType: "system",
      resultingStatus: "Expirada",
      description: "La solicitud no se confirmo dentro del plazo disponible.",
    }),
    createActivityLog({
      title: "Solicitud de reserva expirada",
      description: `${booking.full_name || "Paciente"} - ${booking.specialist_name || "Especialista"}`,
    }),
    createAdminNotification({
      title: "Hueco liberado por expiracion",
      description: `${booking.full_name || "Paciente"} no confirmo la solicitud dentro del plazo.`,
      type: "booking",
      relatedBookingId: booking.id,
    }),
  ]);

  return true;
}
