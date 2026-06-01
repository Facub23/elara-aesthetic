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

    const { adminId } = await req.json();

    if (adminId === currentAdmin.id) {
      return NextResponse.json(
        {
          success: false,
          error: "No puedes eliminarte a ti mismo",
        },
        { status: 400 }
      );
    }

    const { data: adminToDelete } = await supabase
      .from("admin_users")
      .select("*")
      .eq("id", adminId)
      .single();

    const { error } = await supabase
      .from("admin_users")
      .delete()
      .eq("id", adminId);

    if (error) {
      return NextResponse.json(
        { success: false, error },
        { status: 500 }
      );
    }

    await createActivityLog({
      title: "Administrador eliminado",
      description: adminToDelete
        ? `${adminToDelete.email} fue eliminado`
        : `Admin ${adminId} eliminado`,
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
