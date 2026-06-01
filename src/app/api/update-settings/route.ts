import { NextResponse } from "next/server";

import { createActivityLog } from "@/lib/activity";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (admin?.role !== "super_admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const {
      brand_name,
      main_whatsapp,
      main_email,
      opening_time,
      closing_time,
      appointment_duration,
    } = body;

    const { data: settings } = await supabase
      .from("app_settings")
      .select("*")
      .limit(1)
      .single();

    if (!settings) {
      return NextResponse.json(
        {
          success: false,
          error: "Settings not found",
        },
        {
          status: 404,
        }
      );
    }

    const { error } = await supabase
      .from("app_settings")
      .update({
        brand_name,
        main_whatsapp,
        main_email,
        opening_time,
        closing_time,
        appointment_duration,
        updated_at: new Date(),
      })
      .eq("id", settings.id);

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
      title: "Configuracion actualizada",
      description: "Datos generales y horario de la plataforma actualizados",
      actor: admin,
      entityType: "settings",
      entityId: settings.id,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err,
      },
      {
        status: 500,
      }
    );
  }
}
