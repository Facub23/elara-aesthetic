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

    if (!specialist_name || !blocked_date) {
      return NextResponse.json(
        {
          error: "Faltan specialist_name o blocked_date",
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

    const { error } = await supabase
      .from("blocked_dates")
      .delete()
      .eq("specialist_name", specialist_name)
      .eq("blocked_date", blocked_date);

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
      title: "Dia desbloqueado en agenda",
      description: `${specialist_name} - ${blocked_date}`,
      actor: admin,
      entityType: "specialist_schedule",
      entityId: specialist_name,
    });

    return NextResponse.json({
      ok: true,
      message: "Dia desbloqueado correctamente",
    });
  } catch {
    return NextResponse.json(
      {
        error: "Error inesperado al desbloquear dia",
      },
      {
        status: 500,
      }
    );
  }
}
