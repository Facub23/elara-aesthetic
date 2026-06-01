import { NextResponse } from "next/server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createActivityLog } from "@/lib/activity";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createServerClient();

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: currentAdmin } = await supabaseAdmin
      .from("admin_users")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!currentAdmin || currentAdmin.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { adminId, password } = await req.json();

    if (String(password || "").length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "La contrasena debe tener al menos 8 caracteres",
        },
        { status: 400 }
      );
    }

    const { data: adminTarget } = await supabaseAdmin
      .from("admin_users")
      .select("*")
      .eq("id", adminId)
      .single();

    if (!adminTarget) {
      return NextResponse.json(
        { success: false, error: "Admin no encontrado" },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      adminTarget.user_id,
      {
        password,
      }
    );

    if (error) {
      return NextResponse.json(
        { success: false, error },
        { status: 500 }
      );
    }

    await createActivityLog({
      title: "Password de admin actualizado",
      description: `Se actualizo el password de ${adminTarget.email}`,
      actor: {
        userId: user.id,
        email: user.email,
        role: currentAdmin.role,
      },
      entityType: "admin_user",
      entityId: adminId,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err },
      { status: 500 }
    );
  }
}

