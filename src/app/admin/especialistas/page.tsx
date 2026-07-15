import { redirect } from "next/navigation";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import AdminShell from "@/components/AdminShell";
import AdminSpecialistsManager from "@/components/AdminSpecialistsManager";
import { hasAdminPermission } from "@/lib/admin-access";

export default async function AdminSpecialistsPage({
  searchParams,
}: {
  searchParams: Promise<{
    clinic?: string;
    new?: string;
  }>;
}) {
  const params = await searchParams;
  const supabaseAuth = await createClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!adminUser) {
    redirect("/login");
  }

  const isSuperAdmin = adminUser.role === "super_admin";

  if (!hasAdminPermission({
    role: adminUser.role,
    accessRole: adminUser.access_role,
    permissions: adminUser.permissions,
    status: adminUser.status,
  }, "content")) {
    redirect("/admin/sin-permiso");
  }

  const [
    { data: specialists },
    { data: clinics },
    { data: treatments },
    { data: availability },
    { data: vacations },
    { data: blockedDates },
    { data: blockedTimeSlots },
  ] = await Promise.all([
    supabase
      .from("specialists")
      .select("*")
      .order("created_at", {
        ascending: false,
      }),
    supabase.from("clinics").select("*"),
    supabase.from("treatments").select("*"),
    supabase
      .from("specialist_availability")
      .select(
        "id,specialist_name,weekday,day_of_week,start_time,end_time,is_active,active,break_start_time,break_end_time"
      ),
    supabase
      .from("specialist_vacations")
      .select("id,specialist_name,start_date,end_date"),
    supabase.from("blocked_dates").select("id,specialist_name,blocked_date"),
    supabase
      .from("blocked_time_slots")
      .select("id,specialist_name,blocked_date,start_time,end_time"),
  ]);

  const assignedClinic = !isSuperAdmin && adminUser.clinic_id
    ? clinics?.find((clinic) => Number(clinic.id) === Number(adminUser.clinic_id))
    : null;
  const visibleSpecialists = assignedClinic?.name
    ? (specialists || []).filter(
        (specialist) => specialist.clinic_name === assignedClinic.name
      )
    : specialists || [];
  const visibleSpecialistNames = new Set(
    visibleSpecialists.map((specialist) => specialist.name)
  );
  const visibleClinics = assignedClinic ? [assignedClinic] : clinics || [];
  const visibleAvailability = assignedClinic
    ? (availability || []).filter((item) =>
        visibleSpecialistNames.has(item.specialist_name)
      )
    : availability || [];
  const visibleVacations = assignedClinic
    ? (vacations || []).filter((item) =>
        visibleSpecialistNames.has(item.specialist_name)
      )
    : vacations || [];
  const visibleBlockedDates = assignedClinic
    ? (blockedDates || []).filter((item) =>
        visibleSpecialistNames.has(item.specialist_name)
      )
    : blockedDates || [];
  const visibleBlockedTimeSlots = assignedClinic
    ? (blockedTimeSlots || []).filter((item) =>
        visibleSpecialistNames.has(item.specialist_name)
      )
    : blockedTimeSlots || [];

  return (
    <AdminShell
      isSuperAdmin={isSuperAdmin}
      accessRole={adminUser.access_role}
      permissions={adminUser.permissions}
      status={adminUser.status}
    >
      <div className="mx-auto max-w-7xl">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          Especialistas
        </p>

        <h1 className="mt-4 text-5xl font-semibold tracking-tight">
          Gestion de especialistas
        </h1>

        <p className="mt-4 max-w-2xl text-neutral-500">
          Crea, edita y elimina especialistas conectados a clinicas y
          tratamientos.
        </p>

        <AdminSpecialistsManager
          initialSpecialists={visibleSpecialists}
          clinics={visibleClinics}
          treatments={treatments || []}
          availability={visibleAvailability}
          vacations={visibleVacations}
          blockedDates={visibleBlockedDates}
          blockedTimeSlots={visibleBlockedTimeSlots}
          initialClinicName={assignedClinic?.name || params.clinic || ""}
          openCreateOnLoad={params.new === "1"}
        />
      </div>
    </AdminShell>
  );
}
