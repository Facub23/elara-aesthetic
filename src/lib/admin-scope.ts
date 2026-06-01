import "server-only";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

type AdminScope = {
  role?: string | null;
  clinicId?: number | string | null;
  specialistId?: number | string | null;
  accessRole?: string | null;
};

export function isSpecialistAdmin(admin: AdminScope) {
  return admin.role !== "super_admin" && admin.accessRole === "specialist";
}

export async function getAssignedClinicName(admin: AdminScope) {
  if (admin.role === "super_admin" || !admin.clinicId) return null;

  const { data } = await supabase
    .from("clinics")
    .select("name")
    .eq("id", admin.clinicId)
    .maybeSingle();

  return data?.name || null;
}

export async function getAssignedSpecialist(admin: AdminScope) {
  if (admin.role === "super_admin" || !admin.specialistId) return null;

  const { data } = await supabase
    .from("specialists")
    .select("id,name,clinic_id,clinic_name")
    .eq("id", admin.specialistId)
    .maybeSingle();

  return data || null;
}

export async function isBookingInAdminScope(
  admin: AdminScope,
  booking: { clinic_name?: string | null; specialist_name?: string | null }
) {
  if (admin.role === "super_admin") return true;

  if (isSpecialistAdmin(admin)) {
    const specialist = await getAssignedSpecialist(admin);
    return Boolean(specialist?.name && booking.specialist_name === specialist.name);
  }

  const clinicName = await getAssignedClinicName(admin);
  return Boolean(clinicName && booking.clinic_name === clinicName);
}

export async function isSpecialistInAdminScope(
  admin: AdminScope,
  specialistName: string
) {
  if (admin.role === "super_admin") return true;

  if (isSpecialistAdmin(admin)) {
    const specialist = await getAssignedSpecialist(admin);
    return specialist?.name === specialistName;
  }

  const clinicName = await getAssignedClinicName(admin);
  if (!clinicName) return false;

  const { data: specialist } = await supabase
    .from("specialists")
    .select("clinic_name")
    .eq("name", specialistName)
    .maybeSingle();

  return specialist?.clinic_name === clinicName;
}

export function scopedBookingsQuery<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  clinicName: string | null,
  specialistName?: string | null
) {
  if (specialistName) return query.eq("specialist_name", specialistName);
  return clinicName ? query.eq("clinic_name", clinicName) : query;
}
