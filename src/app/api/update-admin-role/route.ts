import { NextResponse } from "next/server";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createActivityLog } from "@/lib/activity";

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createClient();

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: currentAdmin } = await supabase
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

    const { adminId, role } = await req.json();

    if (!["staff", "super_admin"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Rol no valido" },
        { status: 400 }
      );
    }

    const { data: targetAdmin } = await supabase
      .from("admin_users")
      .select("id,role")
      .eq("id", adminId)
      .maybeSingle();

    if (!targetAdmin) {
      return NextResponse.json(
        { success: false, error: "Administrador no encontrado" },
        { status: 404 }
      );
    }

    if (targetAdmin.id === currentAdmin.id && role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "No puedes retirar tu propio rol de superadmin" },
        { status: 400 }
      );
    }

    if (targetAdmin.role === "super_admin" && role !== "super_admin") {
      const { count } = await supabase
        .from("admin_users")
        .select("id", { count: "exact", head: true })
        .eq("role", "super_admin");

      if ((count || 0) <= 1) {
        return NextResponse.json(
          { success: false, error: "Debe existir al menos un superadmin" },
          { status: 400 }
        );
      }
    }

    const { data: updatedAdmin, error } = await supabase
      .from("admin_users")
      .update({ role })
      .eq("id", adminId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error },
        { status: 500 }
      );
    }

    await createActivityLog({
      title: "Rol de admin actualizado",
      description: `${updatedAdmin.email} ahora es ${role}`,
      actor: {
        userId: user.id,
        email: user.email,
        role: currentAdmin.role,
      },
      entityType: "admin_user",
      entityId: adminId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err },
      { status: 500 }
    );
  }
}
