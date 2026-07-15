import { NextResponse } from "next/server";

import { createActivityLog } from "@/lib/activity";
import {
  isAdminAccessRole,
  filterAdminPermissions,
  isSpecialistAccessRole,
} from "@/lib/admin-access";
import { createAdminNotification } from "@/lib/admin-notifications";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

function cleanText(value: unknown, maxLength = 500) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = cleanText(body.name, 120);
    const email = cleanText(body.email, 180).toLowerCase();
    const phone = cleanText(body.phone, 80);
    const company = cleanText(body.company, 160);
    const clinicName = cleanText(body.clinicName, 180);
    const message = cleanText(body.message, 1200);
    const accessRole = cleanText(body.accessRole, 80);
    const permissions = filterAdminPermissions(body.permissions);
    const clinicId = Number(body.clinicId || 0) || null;
    const specialistId = String(body.specialistId || "").trim() || null;
    const specialistAccess = isSpecialistAccessRole(accessRole);
    const requestedClinicId =
      accessRole === "independent_specialist" ? null : clinicId;

    if (!name || !email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Nombre y email valido son obligatorios." },
        { status: 400 }
      );
    }

    if (!isAdminAccessRole(accessRole)) {
      return NextResponse.json(
        { success: false, error: "Selecciona un tipo de acceso valido." },
        { status: 400 }
      );
    }

    if (specialistAccess && !specialistId) {
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
          {
            success: false,
            error: "El especialista no pertenece a la clinica seleccionada.",
          },
          { status: 400 }
        );
      }

      if (
        accessRole === "independent_specialist" &&
        (specialist.clinic_id || specialist.clinic_name)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Selecciona un especialista independiente sin clinica asociada.",
          },
          { status: 400 }
        );
      }

      if (
        accessRole === "specialist" &&
        !specialist.clinic_id &&
        !specialist.clinic_name
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Para un especialista independiente usa el rango correspondiente.",
          },
          { status: 400 }
        );
      }
    }

    const { data: existingPending } = await supabase
      .from("admin_access_requests")
      .select("id")
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json(
        {
          success: false,
          error: "Ya existe una solicitud pendiente para este email.",
        },
        { status: 409 }
      );
    }

    const { data: request, error } = await supabase
      .from("admin_access_requests")
      .insert({
        name,
        email,
        phone: phone || null,
        company: company || null,
        requested_clinic_id: requestedClinicId,
        requested_clinic_name: clinicName || null,
        requested_specialist_id: specialistId,
        requested_access_role: accessRole,
        requested_permissions: permissions,
        message: message || null,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: "No pudimos guardar la solicitud." },
        { status: 500 }
      );
    }

    await Promise.all([
      createAdminNotification({
        title: "Nueva solicitud de acceso",
        description: `${name} solicito acceso para ${company || clinicName || "una clinica"}.`,
        type: "system",
      }),
      createActivityLog({
        title: "Solicitud de acceso recibida",
        description: `${name} solicito acceso admin como ${accessRole}`,
        entityType: "admin_access_request",
        entityId: request.id,
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "No pudimos procesar la solicitud." },
      { status: 500 }
    );
  }
}
