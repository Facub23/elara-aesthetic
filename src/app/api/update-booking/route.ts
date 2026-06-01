import { NextResponse } from "next/server";

import {
  blockingStatuses,
  getBookingTime,
  getTreatmentDuration,
  normalizeBookingDate,
  validateBookingSlot,
} from "@/lib/booking-availability";
import { createActivityLog } from "@/lib/activity";
import { recordBookingEvent } from "@/lib/booking-events";
import { notifyBookingUpdated } from "@/lib/booking-notifications";
import { getCanonicalAdminBookingStatus } from "@/lib/booking-status";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Booking = {
  id: string | number;
  specialist_name?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  status?: string | null;
  duration_minutes?: number | string | null;
  treatment?: string | null;
};

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    const { data: adminUser } = user
      ? await supabase
          .from("admin_users")
          .select("id,role")
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };

    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      booking_id,
      booking_date,
      booking_time,
      status: requestedStatus,
    } = body;

    if (!booking_id) {
      return NextResponse.json(
        {
          error: "Booking id requerido",
        },
        {
          status: 400,
        }
      );
    }

    const status = requestedStatus
      ? getCanonicalAdminBookingStatus(requestedStatus)
      : undefined;

    if (requestedStatus && !status) {
      return NextResponse.json(
        {
          error: "Estado de reserva no permitido",
        },
        {
          status: 400,
        }
      );
    }

    const { data: currentBooking, error: currentError } =
      await supabase
        .from("bookings")
        .select("*")
        .eq("id", booking_id)
        .maybeSingle();

    if (currentError) {
      return NextResponse.json(
        {
          error: currentError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!currentBooking) {
      return NextResponse.json(
        {
          error: "Reserva no encontrada",
        },
        {
          status: 404,
        }
      );
    }

    const nextBooking = currentBooking as Booking;
    const nextDate =
      booking_date ||
      normalizeBookingDate(
        nextBooking.booking_date || ""
      );
    const nextTime =
      booking_time || getBookingTime(nextBooking);
    const nextStatus =
      status || nextBooking.status || "Pendiente";
    const previousDate = normalizeBookingDate(
      nextBooking.booking_date || ""
    );
    const previousTime = getBookingTime(nextBooking);
    const scheduleChanged =
      Boolean(booking_date || booking_time) &&
      (nextDate !== previousDate || nextTime !== previousTime);

    if (
      blockingStatuses.includes(nextStatus) &&
      nextBooking.specialist_name &&
      nextDate &&
      nextTime
    ) {
      const durationMinutes =
        Number(nextBooking.duration_minutes) ||
        (await getTreatmentDuration(
          nextBooking.treatment
        ));

      const validationError =
        await validateBookingSlot({
          bookingId: nextBooking.id,
          specialistName:
            nextBooking.specialist_name,
          bookingDate: nextDate,
          bookingTime: nextTime,
          durationMinutes,
        });

      if (validationError) {
        return NextResponse.json(
          {
            error: validationError,
          },
          {
            status: 409,
          }
        );
      }
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({
        booking_date:
          scheduleChanged
            ? `${nextDate} ${nextTime}`
            : nextBooking.booking_date,
        booking_time:
          scheduleChanged
            ? nextTime
            : nextBooking.booking_time,
        status:
          status ?? nextBooking.status,
        ...(scheduleChanged
          ? {
              rescheduled_at: new Date().toISOString(),
              rescheduled_by: "admin",
              previous_booking_date: previousDate,
              previous_booking_time: previousTime,
              reminder_24h_sent_at: null,
              reminder_2h_sent_at: null,
            }
          : {}),
      })
      .eq("id", booking_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    await recordBookingEvent({
      bookingId: data.id,
      eventType: scheduleChanged ? "rescheduled" : "status_changed",
      actorType: "admin",
      resultingStatus: data.status,
      description: scheduleChanged
        ? "La administracion reprogramo la cita."
        : "La administracion actualizo la reserva.",
      metadata: scheduleChanged
        ? {
            previous_date: previousDate,
            previous_time: previousTime,
            next_date: nextDate,
            next_time: nextTime,
          }
        : {},
    });

    await createActivityLog({
      title: scheduleChanged
        ? "Reserva reprogramada"
        : "Reserva actualizada",
      description: scheduleChanged
        ? `Reserva #${booking_id} reprogramada a ${nextDate} ${nextTime}`
        : `Reserva #${booking_id} actualizada a ${data.status}`,
      actor: {
        userId: user?.id,
        email: user?.email,
        role: adminUser.role,
      },
      entityType: "booking",
      entityId: booking_id,
    });

    await notifyBookingUpdated(data, {
      previousDate: scheduleChanged ? previousDate : null,
      previousTime: scheduleChanged ? previousTime : null,
      updatedBy: "admin",
    });

    return NextResponse.json({
      success: true,
      booking: data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno",
      },
      {
        status: 500,
      }
    );
  }
}
