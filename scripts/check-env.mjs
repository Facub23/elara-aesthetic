import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const fileArgIndex = args.indexOf("--file");
const explicitFile = fileArgIndex >= 0 ? args[fileArgIndex + 1] : null;
const envFiles = explicitFile ? [explicitFile] : [".env.local", ".env"];

for (const file of envFiles) {
  const path = join(process.cwd(), file);

  if (!existsSync(path)) continue;

  const content = readFileSync(path, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);

    if (!match || process.env[match[1]]) continue;

    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const required = [
  {
    key: "NEXT_PUBLIC_SITE_URL",
    validate: (value) =>
      /^https?:\/\//.test(value) &&
      !value.includes("localhost") &&
      !value.includes("127.0.0.1") &&
      !value.endsWith("/"),
    hint: "Debe ser una URL publica sin barra final.",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    validate: (value) => /^https:\/\/.+\.supabase\.co$/.test(value),
    hint: "Debe parecer una URL de Supabase.",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    validate: (value) => value.length > 20,
    hint: "Anon key publica de Supabase.",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    validate: (value) => value.length > 20,
    hint: "Service role solo para servidor.",
  },
  {
    key: "RESEND_API_KEY",
    validate: (value) => value.length > 10,
    hint: "API key de Resend.",
  },
  {
    key: "EMAIL_FROM",
    validate: (value) => value.includes("@") && !value.includes("onboarding@resend.dev"),
    hint: "Usa un remitente verificado, no onboarding@resend.dev.",
  },
  {
    key: "CRON_SECRET",
    validate: (value) => value.length >= 24,
    hint: "Usa un secreto largo y aleatorio.",
  },
  {
    key: "ENCUENTRA_BOOKING_TIMEZONE",
    validate: (value) => value === "Europe/Madrid",
    hint: "Recomendado para reservas en Espana: Europe/Madrid.",
  },
];

const recommended = [
  "ADMIN_EMAIL",
  "ENCUENTRA_BOOKING_BUFFER_MINUTES",
  "ENCUENTRA_MAX_DAILY_BOOKINGS",
  "ENCUENTRA_BOOKING_COMPLETION_GRACE_MINUTES",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
];

const rows = [];
const failures = [];

for (const item of required) {
  const value = process.env[item.key] || "";
  const ok = Boolean(value) && item.validate(value);

  rows.push({
    variable: item.key,
    status: ok ? "OK" : "FALTA",
    type: "obligatoria",
    hint: ok ? "" : item.hint,
  });

  if (!ok) failures.push(item.key);
}

for (const key of recommended) {
  const ok = Boolean(process.env[key]);

  rows.push({
    variable: key,
    status: ok ? "OK" : "Recomendada",
    type: "recomendada",
    hint: ok ? "" : "Configurar antes del lanzamiento final.",
  });
}

console.table(rows);

if (failures.length > 0) {
  console.error(
    `Environment check failed: ${failures.length} required variable(s) missing or invalid.`
  );
  process.exit(1);
}

console.log("Environment check passed.");
