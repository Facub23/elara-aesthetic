import "server-only";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

type AdminScope = {
  role?: string | null;
  clinicId?: number | string | null;
};

export async function getAssignedClinicName(admin: AdminScope) {
  if (admin.role === "super_admin" || !admin.clinicId) return null;

  const { data } = await supabase
    .from("clinics")
    .select("name")
    .eq("id", admin.clinicId)
    .maybeSingle();

  return data?.name || null;
}

export async function isBookingInAdminScope(
  admin: AdminScope,
  booking: { clinic_name?: string | null }
) {
  if (admin.role === "super_admin") return true;

  const clinicName = await getAssignedClinicName(admin);
  return Boolean(clinicName && booking.clinic_name === clinicName);
}

export async function isSpecialistInAdminScope(
  admin: AdminScope,
  specialistName: string
) {
  if (admin.role === "super_admin") return true;

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
  clinicName: string | null
) {
  return clinicName ? query.eq("clinic_name", clinicName) : query;
}
