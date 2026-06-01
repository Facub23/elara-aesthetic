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
    const id = body.id;
    const specialist_name = body.specialist_name;

    if (!id || !specialist_name) {
      return NextResponse.json(
        {
          error: "Faltan id o specialist_name",
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
      .from("specialist_vacations")
      .delete()
      .eq("id", id)
      .eq("specialist_name", specialist_name);

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
      title: "Vacaciones eliminadas",
      description: `${specialist_name} - vacaciones #${id}`,
      actor: admin,
      entityType: "specialist_schedule",
      entityId: specialist_name,
    });

    return NextResponse.json({
      ok: true,
      message: "Vacaciones eliminadas correctamente",
    });
  } catch {
    return NextResponse.json(
      {
        error: "Error inesperado al eliminar vacaciones",
      },
      {
        status: 500,
      }
    );
  }
}
