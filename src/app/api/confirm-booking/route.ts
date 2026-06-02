import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  expirePendingBooking,
  isConfirmationExpired,
  pendingConfirmationStatuses,
} from "@/lib/booking-lifecycle";
import { recordBookingEvent } from "@/lib/booking-events";
import { notifyBookingConfirmed } from "@/lib/booking-notifications";
import { syncBookingToGoogleCalendar } from "@/lib/google-calendar";
import { getSiteUrl } from "@/lib/site-url";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

function redirectToPage(req: Request, token: string, status?: string) {
  const url = new URL("/confirm-booking", req.url);
  url.searchParams.set("token", token);

  if (status) {
    url.searchParams.set(status, "1");
  }

  return NextResponse.redirect(url, 303);
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const token = String(formData.get("token") || "").trim();

  if (!token) {
    return NextResponse.redirect(new URL("/", req.url), 303);
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (!booking || booking.confirmed_by_client) {
    return redirectToPage(req, token);
  }

  if (isConfirmationExpired(booking)) {
    await expirePendingBooking(booking);
    return redirectToPage(req, token, "expired");
  }

  if (!pendingConfirmationStatuses.includes(booking.status)) {
    return redirectToPage(req, token);
  }

  const { data: confirmedBooking } = await supabase
    .from("bookings")
    .update({
      status: "Confirmada",
      confirmed_by_client: true,
    })
    .eq("id", booking.id)
    .in("status", pendingConfirmationStatuses)
    .select("*")
    .maybeSingle();

  if (confirmedBooking) {
    const baseUrl = getSiteUrl();

    await recordBookingEvent({
      bookingId: confirmedBooking.id,
      eventType: "confirmed",
      actorType: "patient",
      resultingStatus: "Confirmada",
      description: "El paciente confirmo la cita mediante el enlace seguro.",
    });

    await notifyBookingConfirmed(confirmedBooking, {
      cancellationUrl: confirmedBooking.cancellation_token
        ? `${baseUrl}/cancel-booking?token=${confirmedBooking.cancellation_token}`
        : undefined,
    });

    await syncBookingToGoogleCalendar(confirmedBooking);

    revalidatePath("/confirm-booking");
  }

  return redirectToPage(req, token, "confirmed");
}
