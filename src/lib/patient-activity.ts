import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function createPatientActivity({
  patientName,
  title,
  description,
  type = "general",
}: {
  patientName: string;
  title: string;
  description?: string;
  type?: string;
}) {
  if (!patientName || !title) return;

  await supabase.from("patient_activity").insert({
    patient_name: patientName,
    title,
    description,
    type,
  });
}
