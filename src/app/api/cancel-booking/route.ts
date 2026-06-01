import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { cancellableBookingStatuses } from "@/lib/booking-lifecycle";
import { recordBookingEvent } from "@/lib/booking-events";
import { notifyBookingUpdated } from "@/lib/booking-notifications";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

function redirectToPage(req: Request, token: string, status?: string) {
  const url = new URL("/cancel-booking", req.url);
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
    .eq("cancellation_token", token)
    .maybeSingle();

  if (!booking || !cancellableBookingStatuses.includes(booking.status)) {
    return redirectToPage(req, token);
  }

  const { data: cancelled } = await supabase
    .from("bookings")
    .update({
      status: "Cancelada",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", booking.id)
    .in("status", cancellableBookingStatuses)
    .select("*")
    .maybeSingle();

  if (cancelled) {
    await recordBookingEvent({
      bookingId: cancelled.id,
      eventType: "cancelled",
      actorType: "patient",
      resultingStatus: "Cancelada",
      description: "El paciente cancelo la cita desde su enlace seguro.",
    });

    await notifyBookingUpdated(cancelled);
    revalidatePath("/dashboard");
    revalidatePath("/cancel-booking");
  }

  return redirectToPage(req, token, "cancelled");
}
