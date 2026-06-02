import { NextResponse } from "next/server";

import { completeGoogleCalendarConnection } from "@/lib/google-calendar";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/admin/calendar?google_calendar=cancelled", req.url),
      303
    );
  }

  try {
    const specialist = await completeGoogleCalendarConnection({ code, state });
    const target = new URL("/admin/calendar", req.url);
    target.searchParams.set("specialist", specialist.name);
    target.searchParams.set("google_calendar", "connected");

    return NextResponse.redirect(target, 303);
  } catch (error) {
    const target = new URL("/admin/calendar", req.url);
    target.searchParams.set("google_calendar", "error");

    return NextResponse.redirect(target, 303);
  }
}
