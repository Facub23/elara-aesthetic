import { NextResponse } from "next/server";

import { createActivityLog } from "@/lib/activity";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-access";
import { isSpecialistInAdminScope } from "@/lib/admin-scope";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAdminPermission(admin, "calendar")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const specialist_name = body.specialist_name;
    const blocked_date = body.blocked_date;
    const start_time = body.start_time;
    const end_time = body.end_time;
    const reason = body.reason || "Bloqueo horario";

    if (!specialist_name || !blocked_date || !start_time || !end_time) {
      return NextResponse.json(
        {
          error: "Faltan datos",
        },
        {
          status: 400,
        }
      );
    }

    if (start_time >= end_time) {
      return NextResponse.json(
        {
          error: "La hora de inicio debe ser menor que la hora de fin",
        },
        {
          status: 400,
        }
      );
    }

    const { error } = await supabase.from("blocked_time_slots").insert({
      specialist_name,
      blocked_date,
      start_time,
      end_time,
      reason,
    });

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

    await createActivityLog({
      title: "Horario bloqueado en agenda",
      description: `${specialist_name} - ${blocked_date} ${start_time}-${end_time} - ${reason}`,
      actor: admin,
      entityType: "specialist_schedule",
      entityId: specialist_name,
    });

    return NextResponse.json({
      success: true,
      message: "Horario bloqueado correctamente",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Error interno",
      },
      {
        status: 500,
      }
    );
  }
}
