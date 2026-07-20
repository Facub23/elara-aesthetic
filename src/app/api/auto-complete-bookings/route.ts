import { NextResponse } from "next/server";

import { recordBookingEvent } from "@/lib/booking-events";
import { isScheduledTaskAuthorized } from "@/lib/scheduled-task-auth";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

const completionStatuses = ["Confirmada", "Reprogramada"];
const defaultCompletionGraceMinutes = Number(
  process.env.ENCUENTRA_BOOKING_COMPLETION_GRACE_MINUTES || 30
);
const bookingTimezone =
  process.env.ENCUENTRA_BOOKING_TIMEZONE || "Europe/Madrid";

type AutoCompleteBooking = {
  id: string | number;
  booking_date?: string | null;
  booking_time?: string | null;
  duration_minutes?: number | string | null;
  status?: string | null;
  full_name?: string | null;
  email?: string | null;
  clinic_name?: string | null;
  treatment?: string | null;
};

function getZonedDateTimeKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

function getBookingEndKey(booking: AutoCompleteBooking) {
  if (!booking.booking_date) return null;

  const date = booking.booking_date.slice(0, 10);
  const time =
    booking.booking_time?.slice(0, 5) ||
    booking.booking_date.slice(11, 16) ||
    "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const durationMinutes = Math.max(Number(booking.duration_minutes) || 60, 5);
  const end = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hours,
      minutes + durationMinutes + defaultCompletionGraceMinutes
    )
  );

  return end.toISOString().slice(0, 16).replace("T", " ");
}

async function handleAutoComplete(req: Request) {
  if (!(await isScheduledTaskAuthorized(req))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const nowKey = getZonedDateTimeKey(now, bookingTimezone);
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .in("status", completionStatuses);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    let updated = 0;
    for (const booking of bookings || []) {
      const bookingEndKey = getBookingEndKey(booking);

      if (!bookingEndKey || nowKey < bookingEndKey) continue;

      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          status: "Completada",
          completed_at: now.toISOString(),
        })
        .eq("id", booking.id)
        .in("status", completionStatuses);

      if (updateError) {
        console.error(updateError);
        continue;
      }

      await recordBookingEvent({
        bookingId: booking.id,
        eventType: "completed",
        actorType: "system",
        resultingStatus: "Completada",
        description: "La cita fue marcada como completada automaticamente.",
      });

      updated++;
    }

    return NextResponse.json({
      success: true,
      updated,
      timezone: bookingTimezone,
      completionGraceMinutes: defaultCompletionGraceMinutes,
    });
  } catch (error: unknown) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleAutoComplete(req);
}

export async function POST(req: Request) {
  return handleAutoComplete(req);
}
