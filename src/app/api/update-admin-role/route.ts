import { NextResponse } from "next/server";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createActivityLog } from "@/lib/activity";
import { filterAdminPermissions, isAdminAccessRole } from "@/lib/admin-access";

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

    const { adminId, role, accessRole, permissions, clinicId, specialistId } =
      await req.json();

    if (!["staff", "super_admin"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Rol no valido" },
        { status: 400 }
      );
    }

    const normalizedAccessRole =
      role === "super_admin" ? "super_admin" : String(accessRole || "clinic_manager");

    if (
      role !== "super_admin" &&
      !isAdminAccessRole(normalizedAccessRole)
    ) {
      return NextResponse.json(
        { success: false, error: "Rango de acceso no valido" },
        { status: 400 }
      );
    }

    if (role !== "super_admin" && normalizedAccessRole !== "specialist" && !clinicId) {
      return NextResponse.json(
        { success: false, error: "Selecciona la clinica asociada" },
        { status: 400 }
      );
    }

    const normalizedSpecialistId =
      role === "super_admin" || normalizedAccessRole !== "specialist"
        ? null
        : String(specialistId || "").trim() || null;

    if (role !== "super_admin" && normalizedAccessRole === "specialist" && !normalizedSpecialistId) {
      return NextResponse.json(
        { success: false, error: "Selecciona el especialista asociado" },
        { status: 400 }
      );
    }

    if (normalizedSpecialistId) {
      const { data: specialist } = await supabase
        .from("specialists")
        .select("id,clinic_id")
        .eq("id", normalizedSpecialistId)
        .maybeSingle();

      if (!specialist) {
        return NextResponse.json(
          { success: false, error: "Especialista no encontrado" },
          { status: 400 }
        );
      }

      if (
        clinicId &&
        specialist.clinic_id &&
        Number(specialist.clinic_id) !== Number(clinicId)
      ) {
        return NextResponse.json(
          { success: false, error: "El especialista no pertenece a la clinica asignada" },
          { status: 400 }
        );
      }
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
      .update({
        role,
        access_role: normalizedAccessRole,
        permissions: role === "super_admin" ? [] : filterAdminPermissions(permissions),
        clinic_id: Number(clinicId || 0) || null,
        specialist_id: normalizedSpecialistId,
      })
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
