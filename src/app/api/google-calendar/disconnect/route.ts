import { NextResponse } from "next/server";

import { hasAdminPermission } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { isSpecialistInAdminScope } from "@/lib/admin-scope";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAdminPermission(admin, "calendar")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const specialistId = String(body.specialistId || "").trim();

  if (!specialistId) {
    return NextResponse.json({ success: false, error: "Falta especialista" }, { status: 400 });
  }

  const { data: specialist } = await supabase
    .from("specialists")
    .select("id,name")
    .eq("id", specialistId)
    .maybeSingle();

  if (
    !specialist ||
    !(await isSpecialistInAdminScope(admin, specialist.name))
  ) {
    return NextResponse.json({ success: false, error: "No encontrado" }, { status: 404 });
  }

  const { error } = await supabase
    .from("specialist_google_calendar_connections")
    .update({
      status: "disconnected",
      access_token: null,
      refresh_token: null,
      disconnected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("specialist_id", specialistId);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
