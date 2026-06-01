import "server-only";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export type BookingEventActor = "patient" | "admin" | "system";

export async function recordBookingEvent({
  bookingId,
  eventType,
  actorType = "system",
  resultingStatus,
  description,
  metadata = {},
}: {
  bookingId?: string | number | null;
  eventType: string;
  actorType?: BookingEventActor;
  resultingStatus?: string | null;
  description?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}) {
  if (!bookingId) return;

  const { error } = await supabase.from("booking_events").insert({
    booking_id: bookingId,
    event_type: eventType,
    actor_type: actorType,
    resulting_status: resultingStatus || null,
    description: description || null,
    metadata,
  });

  if (error && !error.message.includes("booking_events")) {
    console.error("No se pudo registrar el historial de la reserva:", error.message);
  }
}
