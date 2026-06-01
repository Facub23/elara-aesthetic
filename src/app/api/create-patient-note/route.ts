import { NextResponse } from "next/server";

import { getAdminRequestContext } from "@/lib/admin-auth";
import { createActivityLog } from "@/lib/activity";
import { hasAdminPermission } from "@/lib/admin-access";
import { getAssignedClinicName } from "@/lib/admin-scope";
import { createPatientActivity } from "@/lib/patient-activity";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAdminPermission(admin, "patients")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const patientName = String(body.patient_name || "").trim();
  const note = String(body.note || "").trim();

  if (!patientName || !note) {
    return NextResponse.json({ success: false, error: "Faltan datos" }, { status: 400 });
  }

  const assignedClinicName = await getAssignedClinicName({
    role: admin.role,
    clinicId: admin.clinicId,
  });

  if (assignedClinicName) {
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("full_name", patientName)
      .eq("clinic_name", assignedClinicName)
      .limit(1)
      .maybeSingle();

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Paciente no encontrado" },
        { status: 404 }
      );
    }
  }

  const { error } = await supabaseAdmin.from("patient_notes").insert({
    patient_name: patientName,
    note,
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  await Promise.all([
    createActivityLog({
      title: "Nueva nota privada",
      description: `Nota anadida a ${patientName}`,
    }),
    createPatientActivity({
      patientName,
      title: "Nueva nota privada",
      description: note,
      type: "note",
    }),
  ]);

  return NextResponse.json({ success: true });
}
