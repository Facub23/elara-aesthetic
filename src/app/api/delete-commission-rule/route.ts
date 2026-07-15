import { NextResponse } from "next/server";

import { createActivityLog } from "@/lib/activity";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-access";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (!hasAdminPermission(admin, "finance")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const id = String(body.id || "").trim();

  if (!id) {
    return NextResponse.json({ success: false, error: "Falta regla" }, { status: 400 });
  }

  const { data: rule } = await supabase
    .from("commission_rules")
    .select("id,target_name,commission_rate")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("commission_rules").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  await createActivityLog({
    title: "Comision eliminada",
    description: rule
      ? `${rule.target_name}: ${rule.commission_rate}%`
      : `Regla ${id}`,
    actor: admin,
    entityType: "commission_rule",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
