import { redirect } from "next/navigation";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import AdminShell from "@/components/AdminShell";
import AdminDeploymentReadiness from "@/components/AdminDeploymentReadiness";
import SystemSettingsForm from "@/components/SystemSettingsForm";

export default async function AdminConfigPage() {
  const supabaseAuth = await createClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!adminUser) {
    redirect("/login");
  }

  const isSuperAdmin = adminUser.role === "super_admin";

  if (!isSuperAdmin) {
    redirect("/admin");
  }

  const { data: settings } = await supabase
    .from("app_settings")
    .select("*")
    .limit(1)
    .single();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const hasProductionSiteUrl =
    Boolean(siteUrl) &&
    !siteUrl.includes("localhost") &&
    !siteUrl.includes("127.0.0.1");
  const hasSupabasePublicConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const hasSupabaseServerConfig = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasEmailConfig = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const hasCronSecret = Boolean(process.env.CRON_SECRET || process.env.REMINDER_CRON_SECRET);
  const hasBookingTimezone = Boolean(process.env.ENCUENTRA_BOOKING_TIMEZONE);
  const hasAdminContact = Boolean(process.env.ADMIN_EMAIL || settings?.main_email);
  const googleCallbackUrl = `${siteUrl || "https://encuentratuclinica-esp.vercel.app"}/api/google-calendar/callback`;
  const hasGoogleClientId = Boolean(process.env.GOOGLE_CLIENT_ID);
  const hasGoogleClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET);
  const hasGoogleCalendarConfig = hasGoogleClientId && hasGoogleClientSecret;

  const deploymentChecks = [
    {
      group: "Dominio y entorno",
      label: "URL publica definitiva",
      done: hasProductionSiteUrl,
      hint: hasProductionSiteUrl
        ? "NEXT_PUBLIC_SITE_URL apunta a una URL publica."
        : "Define NEXT_PUBLIC_SITE_URL con el dominio real, no localhost.",
      priority: "critical" as const,
    },
    {
      group: "Supabase",
      label: "Supabase publico",
      done: hasSupabasePublicConfig,
      hint: "URL y anon key para cliente publico.",
      priority: "critical" as const,
    },
    {
      group: "Supabase",
      label: "Supabase service role",
      done: hasSupabaseServerConfig,
      hint: "Necesaria para panel admin, crons y operaciones servidor.",
      priority: "critical" as const,
    },
    {
      group: "Supabase",
      label: "RLS y migraciones de seguridad",
      done: true,
      hint: "Las migraciones RLS estan versionadas. Reaplicarlas en produccion antes de abrir.",
      priority: "manual" as const,
      href: "/admin",
    },
    {
      group: "Supabase",
      label: "Storage de imagenes",
      done: true,
      hint: "Bucket clinic-images con subida solo admin y lectura publica de assets.",
      priority: "manual" as const,
    },
    {
      group: "Emails",
      label: "Email transaccional",
      done: hasEmailConfig,
      hint: "RESEND_API_KEY y EMAIL_FROM deben estar configuradas.",
      priority: "critical" as const,
      href: "/admin/emails",
    },
    {
      group: "Emails",
      label: "Contacto admin",
      done: hasAdminContact,
      hint: "ADMIN_EMAIL o email principal para avisos internos.",
      priority: "recommended" as const,
    },
    {
      group: "Crons",
      label: "Cron protegido",
      done: hasCronSecret,
      hint: "Protege recordatorios, expiraciones y completado automatico.",
      priority: "critical" as const,
    },
    {
      group: "Crons",
      label: "Jobs programados",
      done: false,
      hint: "Configurar en hosting: expiracion cada 5 min, recordatorios cada 15 min y autocompletado cada 15-30 min.",
      priority: "manual" as const,
    },
    {
      group: "Agenda",
      label: "Zona horaria de reservas",
      done: hasBookingTimezone,
      hint: "Recomendado: Europe/Madrid para citas en Espana.",
      priority: "critical" as const,
      href: "/admin/calendar",
    },
    {
      group: "Agenda",
      label: "Buffer y limites",
      done: Boolean(
        process.env.ENCUENTRA_BOOKING_BUFFER_MINUTES ||
          process.env.ENCUENTRA_MAX_DAILY_BOOKINGS
      ),
      hint: "Buffers y limites diarios pueden definirse por entorno o por especialista.",
      priority: "recommended" as const,
      href: "/admin/calendar",
    },
    {
      group: "Google Calendar",
      label: "OAuth configurado",
      done: hasGoogleCalendarConfig,
      hint: hasGoogleCalendarConfig
        ? "GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET estan disponibles."
        : "Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Vercel y local.",
      priority: "recommended" as const,
      href: "/admin/calendar",
    },
    {
      group: "Google Calendar",
      label: "Redirect URI",
      done: hasProductionSiteUrl,
      hint: `Usar en Google Cloud: ${googleCallbackUrl}`,
      priority: "manual" as const,
    },
    {
      group: "Negocio",
      label: "Pagos reales",
      done: false,
      hint: "Pendiente por decision: comision, suscripcion, lead verificado o modelo mixto.",
      priority: "manual" as const,
      href: "/admin/finanzas",
    },
    {
      group: "Negocio",
      label: "Datos reales",
      done: false,
      hint: "Cargar al final: clinicas, tratamientos, especialistas, precios, horarios e imagenes finales.",
      priority: "manual" as const,
      href: "/admin/clinicas",
    },
  ];

  return (
    <AdminShell
      isSuperAdmin={isSuperAdmin}
      accessRole={adminUser.access_role}
      permissions={adminUser.permissions}
      status={adminUser.status}
    >
      <div className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          Configuracion
        </p>

        <h1 className="mt-4 text-5xl font-semibold tracking-tight">
          Ajustes del sistema
        </h1>

        <p className="mt-4 max-w-2xl text-neutral-500">
          Controla marca, contacto, horarios y reglas base del sistema EncuentraTuClinica.
        </p>

        <SystemSettingsForm
          settings={{
            brand_name: settings?.brand_name || "EncuentraTuClinica",
            main_whatsapp: settings?.main_whatsapp || "+34 600 000 000",
            main_email: settings?.main_email || "admin@encuentratuclinica.es",
            opening_time: settings?.opening_time || "08:00",
            closing_time: settings?.closing_time || "17:00",
            appointment_duration: settings?.appointment_duration || 60,
          }}
        />

        <section className="mt-10 rounded-[40px] border border-black/5 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Google Calendar
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Conexion de agendas externas
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-500">
            Usa esta URL como redirect autorizado en Google Cloud para que los
            especialistas puedan conectar su calendario.
          </p>
          <div className="mt-6 rounded-2xl bg-[#F7F5F2] p-4 text-sm break-all text-neutral-700">
            {googleCallbackUrl}
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              ["Client ID", hasGoogleClientId],
              ["Client Secret", hasGoogleClientSecret],
              ["Site URL publica", hasProductionSiteUrl],
            ].map(([label, done]) => (
              <div
                key={String(label)}
                className="rounded-2xl bg-[#F7F5F2] p-4"
              >
                <div className="text-sm font-medium">{label}</div>
                <div
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs ${
                    done
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {done ? "Configurado" : "Pendiente"}
                </div>
              </div>
            ))}
          </div>
        </section>

        <AdminDeploymentReadiness checks={deploymentChecks} />
      </div>
    </AdminShell>
  );
}
