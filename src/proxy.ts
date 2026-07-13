import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const noindexPathPrefixes = [
  "/admin",
  "/api",
  "/dashboard",
  "/mi-cuenta",
  "/cancel-booking",
  "/confirm-booking",
  "/review",
  "/reserva",
  "/login",
];

function applySeoHeaders(response: NextResponse, pathname: string) {
  if (noindexPathPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = applySeoHeaders(NextResponse.next({ request }), pathname);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  applySeoHeaders(response, pathname);

  if (!pathname.startsWith("/admin")) {
    return response;
  }

  if (!user) {
    return applySeoHeaders(
      NextResponse.redirect(new URL("/login", request.url)),
      pathname
    );
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!adminUser) {
    return applySeoHeaders(
      NextResponse.redirect(new URL("/login", request.url)),
      pathname
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
