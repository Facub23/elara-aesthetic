import { redirect } from "next/navigation";

import AdminAdvancedCalendarPage from "@/components/AdminAdvancedCalendarPage";
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
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminUser) {
    redirect("/login");
  }

  return (
    <AdminAdvancedCalendarPage
      isSuperAdmin={adminUser.role === "super_admin"}
    />
  );
}
