import { NextResponse } from "next/server";

import { createActivityLog } from "@/lib/activity";
import { hasAdminPermission } from "@/lib/admin-access";
import { isBookingInAdminScope } from "@/lib/admin-scope";
import { recordBookingEvent } from "@/lib/booking-events";
import { notifyBookingUpdated } from "@/lib/booking-notifications";
import { getCanonicalAdminBookingStatus } from "@/lib/booking-status";
import { syncBookingToGoogleCalendar } from "@/lib/google-calendar";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createClient();

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
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

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!adminUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    if (!hasAdminPermission({
      role: adminUser.role,
      accessRole: adminUser.access_role,
      permissions: adminUser.permissions,
      status: adminUser.status,
    }, "bookings")) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    const body = await req.json();
    const id = Number(body.id);
    const status = getCanonicalAdminBookingStatus(body.status);

    if (!Number.isFinite(id) || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "Estado de reserva no permitido",
        },
        {
          status: 400,
        }
      );
    }

    const { data: currentBooking } = await supabase
      .from("bookings")
      .select("id,clinic_name,specialist_name")
      .eq("id", id)
      .maybeSingle();

    if (
      !currentBooking ||
      !(await isBookingInAdminScope({
        role: adminUser.role,
        clinicId: adminUser.clinic_id,
        specialistId: adminUser.specialist_id,
        accessRole: adminUser.access_role,
      }, currentBooking))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Reserva no encontrada",
        },
        {
          status: 404,
        }
      );
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({
        status,
        ...(status === "Completada"
          ? { completed_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error,
        },
        {
          status: 500,
        }
      );
    }

    await createActivityLog({
      title: "Estado de reserva actualizado",
      description: `Reserva #${id} cambió a ${status}`,
      actor: {
        userId: user.id,
        email: user.email,
        role: adminUser.role,
      },
      entityType: "booking",
      entityId: id,
    });

    await recordBookingEvent({
      bookingId: data.id,
      eventType:
        status === "Cancelada"
          ? "cancelled"
          : status === "Completada"
            ? "completed"
            : "status_changed",
      actorType: "admin",
      resultingStatus: status,
      description:
        status === "Completada"
          ? "La administracion marco la cita como asistida."
          : `La administracion cambio el estado a ${status}.`,
    });

    await notifyBookingUpdated(data);
    await syncBookingToGoogleCalendar(data);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}
