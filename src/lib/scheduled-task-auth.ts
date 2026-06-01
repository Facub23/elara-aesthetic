import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function isScheduledTaskAuthorized(req: Request) {
  const expectedSecret =
    process.env.CRON_SECRET || process.env.REMINDER_CRON_SECRET;
  const authorization = req.headers.get("authorization") || "";
  const providedSecret = authorization.replace(/^Bearer\s+/i, "");

  if (expectedSecret && providedSecret === expectedSecret) {
    return true;
  }

  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (user) {
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminUser) return true;
  }

  return process.env.NODE_ENV !== "production" && !expectedSecret;
}
