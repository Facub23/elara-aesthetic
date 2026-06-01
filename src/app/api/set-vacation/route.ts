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

    const specialist_name =
      body.specialist_name;

    const start_date =
      body.start_date;

    const end_date =
      body.end_date;

    const reason =
      body.reason || "";

    if (
      !specialist_name ||
      !start_date ||
      !end_date
    ) {
      return NextResponse.json(
        {
          error:
            "Faltan datos",
        },
        {
          status: 400,
        }
      );
    }

    const { error } =
      await supabase
        .from(
          "specialist_vacations"
        )
        .insert({
          specialist_name,
          start_date,
          end_date,
          reason,
        });

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
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
      title: "Vacaciones registradas",
      description: `${specialist_name} - ${start_date} a ${end_date}`,
      actor: admin,
      entityType: "specialist_schedule",
      entityId: specialist_name,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Error interno",
      },
      {
        status: 500,
      }
    );
  }
}
