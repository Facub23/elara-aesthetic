import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  type AdminPermission,
  hasAdminPermission,
  hasAnyAdminPermission,
} from "@/lib/admin-access";

export async function getAdminRequestContext() {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) return null;

  const { data: adminUser } = await supabaseAdmin
    .from("admin_users")
    .select("id,role,clinic_id,access_role,permissions,status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminUser) return null;

  return {
    id: adminUser.id,
    role: adminUser.role,
    clinicId: adminUser.clinic_id as number | null,
    accessRole: adminUser.access_role as string | null,
    permissions: (adminUser.permissions || []) as string[],
    status: adminUser.status as string | null,
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

export async function canAdminRequest(permission: AdminPermission) {
  const admin = await getAdminRequestContext();
  return hasAdminPermission(admin, permission);
}

export async function canAdminRequestAny(permissions: AdminPermission[]) {
  const admin = await getAdminRequestContext();
  return hasAnyAdminPermission(admin, permissions);
}
