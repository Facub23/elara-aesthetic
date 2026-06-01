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

    const specialist_name = body.specialist_name;
    const blocked_date = body.blocked_date;
    const reason = body.reason || "Bloqueo manual";

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

    const { data: existing, error: existingError } =
      await supabase
        .from("blocked_dates")
        .select("id")
        .eq("specialist_name", specialist_name)
        .eq("blocked_date", blocked_date)
        .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          error: existingError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (existing) {
      return NextResponse.json({
        ok: true,
        message: "El día ya estaba bloqueado",
      });
    }

    const { error } = await supabase.from("blocked_dates").insert({
      specialist_name,
      blocked_date,
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

    await createActivityLog({
      title: "Dia bloqueado en agenda",
      description: `${specialist_name} - ${blocked_date} - ${reason}`,
      actor: admin,
      entityType: "specialist_schedule",
      entityId: specialist_name,
    });

    return NextResponse.json({
      ok: true,
      message: "Día bloqueado correctamente",
    });
  } catch {
    return NextResponse.json(
      {
        error: "Error inesperado al bloquear día",
      },
      {
        status: 500,
      }
    );
  }
}
