import { NextResponse } from "next/server";

import { createActivityLog } from "@/lib/activity";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const { error } = await supabase
      .from("blocked_time_slots")
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
      title: "Bloqueo horario eliminado",
      description: `${specialist_name} - bloqueo #${id}`,
      actor: admin,
      entityType: "specialist_schedule",
      entityId: specialist_name,
    });

    return NextResponse.json({
      ok: true,
      message: "Bloqueo horario eliminado correctamente",
    });
  } catch {
    return NextResponse.json(
      {
        error: "Error inesperado al eliminar bloqueo horario",
      },
      {
        status: 500,
      }
    );
  }
}
