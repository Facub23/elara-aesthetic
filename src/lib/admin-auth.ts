import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getAdminRequestContext() {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) return null;

  const { data: adminUser } = await supabaseAdmin
    .from("admin_users")
    .select("id,role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminUser) return null;

  return {
    id: adminUser.id,
    role: adminUser.role,
    userId: user.id,
    email: user.email || null,
  };
}

export async function isAdminRequest() {
  return Boolean(await getAdminRequestContext());
}

export async function isSuperAdminRequest() {
  const admin = await getAdminRequestContext();
  return admin?.role === "super_admin";
}
