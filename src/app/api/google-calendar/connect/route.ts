import { NextResponse } from "next/server";

import { hasAdminPermission } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { isSpecialistInAdminScope } from "@/lib/admin-scope";
import { createGoogleCalendarAuthUrl } from "@/lib/google-calendar";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const admin = await getAdminRequestContext();

  if (!admin) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  if (!hasAdminPermission(admin, "calendar")) {
    return NextResponse.redirect(new URL("/admin", req.url), 303);
  }

  const url = new URL(req.url);
  const specialistId = url.searchParams.get("specialistId");

  if (!specialistId) {
    return NextResponse.redirect(
      new URL("/admin/calendar?google_calendar=missing_specialist", req.url),
      303
    );
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
    return NextResponse.redirect(
      new URL("/admin/calendar?google_calendar=forbidden", req.url),
      303
    );
  }

  const result = await createGoogleCalendarAuthUrl({
    specialistId,
    adminUserId: admin.id,
  });

  if (!result.ok) {
    return NextResponse.redirect(
      new URL("/admin/calendar?google_calendar=missing_config", req.url),
      303
    );
  }

  return NextResponse.redirect(result.url, 303);
}
