import { NextResponse } from "next/server";

import { createActivityLog } from "@/lib/activity";
import { filterAdminPermissions, isAdminAccessRole } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (admin?.role !== "super_admin") {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const requestId = String(body.requestId || "");
    const action = String(body.action || "");

    if (!requestId || !["approved", "rejected"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Solicitud o accion no valida." },
        { status: 400 }
      );
    }

    const { data: request } = await supabase
      .from("admin_access_requests")
      .select("*")
      .eq("id", requestId)
      .eq("status", "pending")
      .maybeSingle();

    if (!request) {
      return NextResponse.json(
        { success: false, error: "Solicitud no encontrada o ya revisada." },
        { status: 404 }
      );
    }

    if (action === "rejected") {
      await supabase
        .from("admin_access_requests")
        .update({
          status: "rejected",
          reviewed_by_admin_id: admin.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      await createActivityLog({
        title: "Solicitud de acceso rechazada",
        description: `${request.email} fue rechazado`,
        actor: admin,
        entityType: "admin_access_request",
        entityId: requestId,
      });

      return NextResponse.json({ success: true });
    }

    const password = String(body.password || "");
    const systemRole = String(body.systemRole || "staff");
    const accessRole = String(body.accessRole || request.requested_access_role);
    const permissions = filterAdminPermissions(body.permissions);
    const clinicId = Number(body.clinicId || 0) || null;
    const specialistId =
      String(body.specialistId || request.requested_specialist_id || "").trim() ||
      null;

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "La contrasena temporal debe tener al menos 8 caracteres.",
        },
        { status: 400 }
      );
    }

    if (!["staff", "super_admin"].includes(systemRole)) {
      return NextResponse.json(
        { success: false, error: "Rol de sistema no valido." },
        { status: 400 }
      );
    }

    if (!isAdminAccessRole(accessRole) && accessRole !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Rango de acceso no valido." },
        { status: 400 }
      );
    }

    if (systemRole !== "super_admin" && accessRole === "specialist" && !specialistId) {
      return NextResponse.json(
        { success: false, error: "Selecciona el especialista asociado." },
        { status: 400 }
      );
    }

    if (specialistId) {
      const { data: specialist } = await supabase
        .from("specialists")
        .select("id,clinic_id,clinic_name")
        .eq("id", specialistId)
        .maybeSingle();

      if (!specialist) {
        return NextResponse.json(
          { success: false, error: "Especialista no encontrado." },
          { status: 400 }
        );
      }

      if (
        clinicId &&
        specialist.clinic_id &&
        Number(specialist.clinic_id) !== Number(clinicId)
      ) {
        return NextResponse.json(
          { success: false, error: "El especialista no pertenece a la clinica asignada." },
          { status: 400 }
        );
      }
    }

    const email = String(request.email || "").trim().toLowerCase();

    const { data: existingAdmin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingAdmin) {
      return NextResponse.json(
        { success: false, error: "Este email ya existe como admin." },
        { status: 409 }
      );
    }

    const { data: createdUser, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError || !createdUser.user) {
      return NextResponse.json(
        {
          success: false,
          error: createError?.message || "No se pudo crear el usuario.",
        },
        { status: 500 }
      );
    }

    const { data: createdAdmin, error: insertError } = await supabase
      .from("admin_users")
      .insert({
        email,
        role: systemRole,
        user_id: createdUser.user.id,
        clinic_id: clinicId,
        specialist_id:
          systemRole === "super_admin" || accessRole !== "specialist"
            ? null
            : specialistId,
        access_role: systemRole === "super_admin" ? "super_admin" : accessRole,
        permissions,
        status: "active",
      })
      .select("id")
      .single();

    if (insertError) {
      await supabase.auth.admin.deleteUser(createdUser.user.id);

      return NextResponse.json(
        {
          success: false,
          error: insertError.message || "No se pudo crear el admin.",
        },
        { status: 500 }
      );
    }

    await supabase
      .from("admin_access_requests")
      .update({
        status: "approved",
        reviewed_by_admin_id: admin.id,
        reviewed_at: new Date().toISOString(),
        created_admin_user_id: String(createdAdmin.id),
      })
      .eq("id", requestId);

    await createActivityLog({
      title: "Solicitud de acceso aprobada",
      description: `${email} fue aprobado como ${accessRole}`,
      actor: admin,
      entityType: "admin_user",
      entityId: createdAdmin.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "No se pudo revisar la solicitud." },
      { status: 500 }
    );
  }
}
