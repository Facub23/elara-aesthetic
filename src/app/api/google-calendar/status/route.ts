import { NextResponse } from "next/server";

import { hasAdminPermission } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { isSpecialistInAdminScope } from "@/lib/admin-scope";
import {
  getGoogleCalendarConnectionBySpecialistId,
  hasGoogleCalendarConfig,
} from "@/lib/google-calendar";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const admin = await getAdminRequestContext();

  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAdminPermission(admin, "calendar")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const specialistId = url.searchParams.get("specialistId");

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

  const connection = await getGoogleCalendarConnectionBySpecialistId(specialistId);

  return NextResponse.json({
    success: true,
    configured: hasGoogleCalendarConfig(),
    connection,
  });
}
