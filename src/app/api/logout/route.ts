import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request
) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  const destination =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/login";
  const supabase =
    await createClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(
    new URL(
      destination,
      request.url
    )
  );
}
