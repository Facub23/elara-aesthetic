import { NextResponse } from "next/server";

import { hasAdminPermission } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { isBookingInAdminScope } from "@/lib/admin-scope";
import { recordBookingEvent } from "@/lib/booking-events";
import { syncBookingToGoogleCalendar } from "@/lib/google-calendar";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAdminPermission(admin, "calendar")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const bookingId = body.bookingId;

  if (!bookingId) {
    return NextResponse.json({ success: false, error: "Falta reserva" }, { status: 400 });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (
    !booking ||
    !(await isBookingInAdminScope(admin, booking))
  ) {
    return NextResponse.json({ success: false, error: "Reserva no encontrada" }, { status: 404 });
  }

  const result = await syncBookingToGoogleCalendar(booking);

  const { data: updatedBooking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  await recordBookingEvent({
    bookingId,
    eventType: "google_calendar_sync",
    actorType: "admin",
    resultingStatus: updatedBooking?.status || booking.status,
    description: result.error
      ? "La sincronizacion manual con Google Calendar fallo."
      : result.skipped
        ? "La sincronizacion manual con Google Calendar no tenia conexion activa."
        : "La reserva se sincronizo manualmente con Google Calendar.",
    metadata: {
      google_calendar_event_id:
        updatedBooking?.google_calendar_event_id || booking.google_calendar_event_id || null,
      google_calendar_sync_status:
        updatedBooking?.google_calendar_sync_status || booking.google_calendar_sync_status || null,
    },
  });

  return NextResponse.json({
    success: true,
    result: {
      skipped: Boolean(result.skipped),
      synced: Boolean(result.synced),
      cancelled: Boolean(result.cancelled),
      error: result.error instanceof Error ? result.error.message : null,
    },
    booking: updatedBooking || booking,
  });
}
