import { NextResponse } from "next/server";

import { createActivityLog } from "@/lib/activity";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-access";
import { isSpecialistInAdminScope } from "@/lib/admin-scope";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

type AvailabilityPayload = {
  specialist_name?: string;
  weekday?: number | string;
  day_of_week?: number | string;
  start_time?: string;
  end_time?: string;
  active?: boolean;
  is_active?: boolean;
  break_start_time?: string | null;
  break_end_time?: string | null;
  max_daily_bookings?: number | string | null;
  slot_interval_minutes?: number | string | null;
};

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAdminPermission(admin, "calendar")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body =
      (await req.json()) as AvailabilityPayload;

    const specialist_name = body.specialist_name;
    const weekday = body.weekday ?? body.day_of_week;
    const start_time = body.start_time;
    const end_time = body.end_time;
    const is_active =
      body.is_active ?? body.active ?? true;
    const break_start_time =
      body.break_start_time || null;
    const break_end_time =
      body.break_end_time || null;
    const max_daily_bookings = Number(
      body.max_daily_bookings || 0
    );
    const slot_interval_minutes = Number(
      body.slot_interval_minutes || 30
    );

    if (
      !specialist_name ||
      weekday === undefined ||
      !start_time ||
      !end_time
    ) {
      return NextResponse.json(
        {
          error: "Faltan datos",
        },
        {
          status: 400,
        }
      );
    }

    if (!(await isSpecialistInAdminScope(admin, specialist_name))) {
      return NextResponse.json(
        {
          error: "Especialista no encontrado",
        },
        {
          status: 404,
        }
      );
    }

    if (start_time >= end_time) {
      return NextResponse.json(
        {
          error:
            "La hora de inicio debe ser menor que la hora de fin",
        },
        {
          status: 400,
        }
      );
    }

    if (
      break_start_time &&
      break_end_time &&
      (break_start_time >= break_end_time ||
        break_start_time < start_time ||
        break_end_time > end_time)
    ) {
      return NextResponse.json(
        {
          error:
            "El descanso debe quedar dentro del horario laboral",
        },
        {
          status: 400,
        }
      );
    }

    if (
      slot_interval_minutes < 5 ||
      slot_interval_minutes > 120
    ) {
      return NextResponse.json(
        {
          error:
            "El intervalo debe estar entre 5 y 120 minutos",
        },
        {
          status: 400,
        }
      );
    }

    const payload = {
      specialist_name,
      weekday,
      day_of_week: weekday,
      start_time,
      end_time,
      is_active,
      active: is_active,
      break_start_time,
      break_end_time,
      max_daily_bookings,
      slot_interval_minutes,
    };

    const { data: existing } = await supabase
      .from("specialist_availability")
      .select("*")
      .eq("specialist_name", specialist_name)
      .or(
        `weekday.eq.${weekday},day_of_week.eq.${weekday}`
      )
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("specialist_availability")
        .update(payload)
        .eq("id", existing.id);

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

      await createActivityLog({
        title: "Horario de especialista actualizado",
        description: `${specialist_name} - dia ${weekday} - ${start_time}-${end_time}`,
        actor: admin,
        entityType: "specialist_schedule",
        entityId: specialist_name,
      });

      return NextResponse.json({
        success: true,
      });
    }

    const { error } = await supabase
      .from("specialist_availability")
      .insert(payload);

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

    await createActivityLog({
      title: "Horario de especialista creado",
      description: `${specialist_name} - dia ${weekday} - ${start_time}-${end_time}`,
      actor: admin,
      entityType: "specialist_schedule",
      entityId: specialist_name,
    });

    return NextResponse.json({
      success: true,
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
