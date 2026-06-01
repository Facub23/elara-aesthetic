import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin-auth";
import { createActivityLog } from "@/lib/activity";
import { createPatientActivity } from "@/lib/patient-activity";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const patientName = String(body.patient_name || "").trim();
  const note = String(body.note || "").trim();

  if (!patientName || !note) {
    return NextResponse.json({ success: false, error: "Faltan datos" }, { status: 400 });
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
