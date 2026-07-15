import { redirect } from "next/navigation";

import AdminAdvancedCalendarPage from "@/components/AdminAdvancedCalendarPage";
import { hasAdminPermission } from "@/lib/admin-access";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCalendarPage() {
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
    .maybeSingle();

  if (!adminUser) {
    redirect("/login");
  }

  if (!hasAdminPermission({
    role: adminUser.role,
    accessRole: adminUser.access_role,
    permissions: adminUser.permissions,
    status: adminUser.status,
  }, "calendar")) {
    redirect("/admin/sin-permiso");
  }

  const { data: assignedSpecialist } =
    adminUser.access_role === "specialist" && adminUser.specialist_id
      ? await supabase
          .from("specialists")
          .select("id,name")
          .eq("id", adminUser.specialist_id)
          .maybeSingle()
      : { data: null };

  return (
    <AdminAdvancedCalendarPage
      isSuperAdmin={adminUser.role === "super_admin"}
      accessRole={adminUser.access_role}
      permissions={adminUser.permissions}
      status={adminUser.status}
      clinicId={adminUser.clinic_id}
      specialistId={adminUser.specialist_id}
      specialistName={assignedSpecialist?.name || null}
    />
  );
}
