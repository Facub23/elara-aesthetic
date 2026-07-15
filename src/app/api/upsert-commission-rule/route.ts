import { NextResponse } from "next/server";

import { createActivityLog } from "@/lib/activity";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-access";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

function parseTarget(value: unknown) {
  const [targetType, targetId, ...nameParts] = String(value || "").split("|");
  const targetName = nameParts.join("|").trim();

  if (!["clinic", "specialist"].includes(targetType) || !targetName) {
    return null;
  }

  return {
    targetType,
    targetId: targetId || null,
    targetName,
  };
}

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (!hasAdminPermission(admin, "finance")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const target = parseTarget(body.target);
  const commissionRate = Number(body.commission_rate);
  const notes = String(body.notes || "").trim() || null;

  if (!target || !Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
    return NextResponse.json(
      { success: false, error: "Selecciona clinica/especialista y un porcentaje valido" },
      { status: 400 }
    );
  }

  let existingRuleQuery = supabase
    .from("commission_rules")
    .select("id")
    .eq("target_type", target.targetType)
    .ilike("target_name", target.targetName);

  existingRuleQuery = target.targetId
    ? existingRuleQuery.eq("target_id", target.targetId)
    : existingRuleQuery.is("target_id", null);

  const { data: existingRule } = await existingRuleQuery.maybeSingle();

  const payload = {
    target_type: target.targetType,
    target_id: target.targetId,
    target_name: target.targetName,
    commission_rate: commissionRate,
    notes,
    active: true,
    updated_at: new Date().toISOString(),
  };

  const query = existingRule?.id
    ? supabase
        .from("commission_rules")
        .update(payload)
        .eq("id", existingRule.id)
        .select("id,target_name")
        .single()
    : supabase
        .from("commission_rules")
        .insert(payload)
        .select("id,target_name")
        .single();

  const { data: rule, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  await createActivityLog({
    title: "Comision configurada",
    description: `${target.targetName}: ${commissionRate}%`,
    actor: admin,
    entityType: "commission_rule",
    entityId: rule.id,
  });

  return NextResponse.json({ success: true, rule });
}
