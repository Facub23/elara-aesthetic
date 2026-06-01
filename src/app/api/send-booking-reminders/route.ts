import { NextResponse } from "next/server";

import { notifyBookingReminder } from "@/lib/booking-notifications";
import { recordBookingEvent } from "@/lib/booking-events";
import { isScheduledTaskAuthorized } from "@/lib/scheduled-task-auth";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

type ReminderType = "24h" | "2h";

type Booking = {
  id: string | number;
  clinic_name?: string | null;
  specialist_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  treatment?: string | null;
  status?: string | null;
  reminder_24h_sent_at?: string | null;
  reminder_2h_sent_at?: string | null;
};

const bookingTimezone =
  process.env.ENCUENTRA_BOOKING_TIMEZONE || "Europe/Madrid";

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

function getPseudoUtcDateFromLocalKey(value: string) {
  const [datePart, timePart] = value.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  return new Date(Date.UTC(year, month - 1, day, hours, minutes));
}

function getBookingDateTimeKey(booking: Booking) {
  const date = booking.booking_date || "";
  const datePart = date.slice(0, 10);
  const timePart = booking.booking_time || date.slice(11, 16);

  if (!datePart || !timePart) return null;

  return `${datePart} ${timePart.slice(0, 5)}`;
}

function getReminderWindow({
  bookingDateKey,
  nowKey,
}: {
  bookingDateKey: string;
  nowKey: string;
}): ReminderType | null {
  const bookingDate = getPseudoUtcDateFromLocalKey(bookingDateKey);
  const now = getPseudoUtcDateFromLocalKey(nowKey);
  const diffMinutes =
    (bookingDate.getTime() - now.getTime()) / (1000 * 60);

  if (diffMinutes <= 24 * 60 && diffMinutes > 24 * 60 - 90) {
    return "24h";
  }

  if (diffMinutes <= 2 * 60 && diffMinutes > 2 * 60 - 45) {
    return "2h";
  }

  return null;
}

function hasReminderBeenSent(booking: Booking, reminder: ReminderType) {
  return reminder === "24h"
    ? Boolean(booking.reminder_24h_sent_at)
    : Boolean(booking.reminder_2h_sent_at);
}

function getReminderColumn(reminder: ReminderType) {
  return reminder === "24h" ? "reminder_24h_sent_at" : "reminder_2h_sent_at";
}

async function handleReminders(req: Request) {
  if (!(await isScheduledTaskAuthorized(req))) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const now = new Date();
    const nowKey = getZonedDateTimeKey(now, bookingTimezone);
    const from = nowKey.slice(0, 10);
    const to = new Date(
      getPseudoUtcDateFromLocalKey(nowKey).getTime() + 26 * 60 * 60 * 1000
    )
      .toISOString()
      .slice(0, 10);

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "Confirmada")
      .gte("booking_date", from)
      .lte("booking_date", `${to} 23:59:59`);

    if (error) {
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

    const sent: Array<{ id: string | number; reminder: ReminderType }> = [];
    const skipped: Array<{ id: string | number; reason: string }> = [];
    const failed: Array<{ id: string | number; reminder: ReminderType; error: string }> = [];

    for (const booking of (bookings || []) as Booking[]) {
      const bookingDateKey = getBookingDateTimeKey(booking);

      if (!bookingDateKey) {
        skipped.push({
          id: booking.id,
          reason: "Fecha u hora invalida",
        });
        continue;
      }

      const reminder = getReminderWindow({
        bookingDateKey,
        nowKey,
      });

      if (!reminder) {
        continue;
      }

      if (hasReminderBeenSent(booking, reminder)) {
        skipped.push({
          id: booking.id,
          reason: `Recordatorio ${reminder} ya enviado`,
        });
        continue;
      }

      try {
        await notifyBookingReminder(booking, reminder);

        const { error: updateError } = await supabase
          .from("bookings")
          .update({
            [getReminderColumn(reminder)]: now.toISOString(),
          })
          .eq("id", booking.id);

        if (updateError) {
          throw updateError;
        }

        await recordBookingEvent({
          bookingId: booking.id,
          eventType: "reminder_sent",
          actorType: "system",
          resultingStatus: booking.status,
          description: `Recordatorio ${reminder} enviado al paciente.`,
          metadata: { reminder },
        });

        sent.push({
          id: booking.id,
          reminder,
        });
      } catch (error: unknown) {
        failed.push({
          id: booking.id,
          reminder,
          error: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }

    return NextResponse.json({
      success: failed.length === 0,
      checked: bookings?.length || 0,
      sent24h: sent.filter((item) => item.reminder === "24h").length,
      sent2h: sent.filter((item) => item.reminder === "2h").length,
      sent,
      skipped,
      failed,
      timezone: bookingTimezone,
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

export async function GET(req: Request) {
  return handleReminders(req);
}

export async function POST(req: Request) {
  return handleReminders(req);
}
