import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const path = join(process.cwd(), file);

    if (!existsSync(path)) continue;

    const content = readFileSync(path, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);

      if (!match || process.env[match[1]]) continue;

      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  }
}

loadEnv();

const apply = process.argv.includes("--apply");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const contentTables = [
  "google_calendar_oauth_states",
  "booking_submission_attempts",
  "notification_deliveries",
  "admin_notifications",
  "booking_events",
  "bookings",
  "reviews",
  "favorite_clinics",
  "favorite_specialists",
  "patient_notes",
  "patient_activity",
  "patient_profiles",
  "specialist_google_calendar_connections",
  "specialist_vacations",
  "blocked_time_slots",
  "blocked_dates",
  "specialist_availability",
  "treatment_durations",
  "commission_rules",
  "specialists",
  "clinics",
  "treatments",
  "activity_logs",
  "admin_access_requests",
];

const preservedTables = [
  "admin_users",
  "app_settings",
  "email_templates",
];

const deleteColumnByTable = {
  google_calendar_oauth_states: "state",
};

async function countTable(table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    return {
      table,
      count: null,
      status: "missing-or-blocked",
      message: error.message,
    };
  }

  return {
    table,
    count: count || 0,
    status: "ok",
    message: "",
  };
}

async function deleteTable(table) {
  const deleteColumn = deleteColumnByTable[table] || "id";
  const { error } = await supabase
    .from(table)
    .delete()
    .not(deleteColumn, "is", null);

  if (!error) {
    return {
      table,
      status: "deleted",
      message: "",
    };
  }

  const fallback = await supabase.from(table).delete().neq("created_at", "");

  if (!fallback.error) {
    return {
      table,
      status: "deleted",
      message: "",
    };
  }

  return {
    table,
    status: "skipped",
    message: fallback.error.message || error.message,
  };
}

async function clearAdminScopes() {
  const { error } = await supabase
    .from("admin_users")
    .update({
      clinic_id: null,
      specialist_id: null,
    })
    .not("id", "is", null);

  return {
    table: "admin_users",
    status: error ? "skipped" : "scopes-cleared",
    message: error?.message || "",
  };
}

async function main() {
  console.log(apply ? "PRELAUNCH CLEAN APPLY" : "PRELAUNCH CLEAN DRY RUN");

  const before = [];

  for (const table of [...contentTables, ...preservedTables]) {
    before.push(await countTable(table));
  }

  console.table(before);

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to delete demo content.");
    return;
  }

  const results = [];

  for (const table of contentTables) {
    results.push(await deleteTable(table));
  }

  results.push(await clearAdminScopes());

  console.table(results);

  const after = [];

  for (const table of [...contentTables, ...preservedTables]) {
    after.push(await countTable(table));
  }

  console.table(after);

  const remainingContent = after.filter(
    (row) =>
      contentTables.includes(row.table) &&
      row.status === "ok" &&
      Number(row.count || 0) > 0
  );

  if (remainingContent.length > 0) {
    console.error("Some content tables still contain rows:");
    console.table(remainingContent);
    process.exit(1);
  }

  console.log("Prelaunch cleanup completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
