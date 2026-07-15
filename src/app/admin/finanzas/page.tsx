import Link from "next/link";
import { redirect } from "next/navigation";

import AdminCommissionRulesManager from "@/components/AdminCommissionRulesManager";
import AdminShell from "@/components/AdminShell";
import { hasAdminPermission } from "@/lib/admin-access";
import {
  getAssignedClinicName,
  getAssignedSpecialist,
  scopedBookingsQuery,
} from "@/lib/admin-scope";
import { getBookingStatusKey } from "@/lib/booking-status";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type FinanceBooking = {
  id: string | number;
  full_name: string | null;
  clinic_name: string | null;
  specialist_name: string | null;
  treatment: string | null;
  booking_date: string | null;
  booking_time: string | null;
  status: string | null;
  booking_context?: unknown;
};

type CommissionRule = {
  id: string;
  target_type: "clinic" | "specialist";
  target_id?: string | null;
  target_name: string;
  commission_rate: number | string;
  notes?: string | null;
};

type TargetOption = {
  type: "clinic" | "specialist";
  id?: string | number | null;
  name: string;
  detail?: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getPriceFromContext(context: unknown) {
  if (!context || typeof context !== "object") return 0;

  const value = (context as { price_from?: unknown }).price_from;
  const normalized =
    typeof value === "number"
      ? value
      : Number(String(value || "").replace(/[^\d.,]/g, "").replace(",", "."));

  return Number.isFinite(normalized) ? normalized : 0;
}

function getBookingDateLabel(booking: FinanceBooking) {
  const date = booking.booking_date?.slice(0, 10) || "Sin fecha";
  const time =
    booking.booking_time?.slice(0, 5) ||
    booking.booking_date?.slice(11, 16) ||
    "";

  return time ? `${date} - ${time}` : date;
}

function getEnvFlag(...keys: string[]) {
  return keys.some((key) => Boolean(process.env[key]));
}

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getBookingCommissionRule(
  booking: FinanceBooking,
  rules: CommissionRule[]
) {
  const specialistName = normalizeText(booking.specialist_name);
  const clinicName = normalizeText(booking.clinic_name);

  const specialistRule = rules.find(
    (rule) =>
      rule.target_type === "specialist" &&
      normalizeText(rule.target_name) === specialistName
  );

  if (specialistRule) return specialistRule;

  return (
    rules.find(
      (rule) =>
        rule.target_type === "clinic" &&
        normalizeText(rule.target_name) === clinicName
    ) || null
  );
}

export default async function AdminFinanzasPage() {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) redirect("/login");

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminUser) redirect("/login");

  const isSuperAdmin = adminUser.role === "super_admin";

  if (!hasAdminPermission({
    role: adminUser.role,
    accessRole: adminUser.access_role,
    permissions: adminUser.permissions,
    status: adminUser.status,
  }, "finance")) {
    redirect("/admin/sin-permiso");
  }

  const adminScope = {
    role: adminUser.role,
    clinicId: adminUser.clinic_id,
    specialistId: adminUser.specialist_id,
    accessRole: adminUser.access_role,
  };
  const assignedClinicName = await getAssignedClinicName(adminScope);
  const assignedSpecialist = await getAssignedSpecialist(adminScope);

  let bookingsQuery = supabase
    .from("bookings")
    .select(
      "id,full_name,clinic_name,specialist_name,treatment,booking_date,booking_time,status,booking_context"
    )
    .order("booking_date", { ascending: false })
    .limit(300);

  bookingsQuery = scopedBookingsQuery(
    bookingsQuery,
    assignedClinicName,
    assignedSpecialist?.name || null
  );

  const { data: bookings } = await bookingsQuery;
  const { data: commissionRules, error: commissionRulesError } = await supabase
    .from("commission_rules")
    .select("id,target_type,target_id,target_name,commission_rate,notes")
    .eq("active", true)
    .order("target_type", { ascending: true })
    .order("target_name", { ascending: true });
  const { data: clinics } = await supabase
    .from("clinics")
    .select("id,name,city")
    .order("name", { ascending: true });
  const { data: specialists } = await supabase
    .from("specialists")
    .select("id,name,clinic_name,specialty")
    .order("name", { ascending: true });

  const financeBookings = (bookings || []) as FinanceBooking[];
  const commissionRulesSafe = (
    commissionRulesError ? [] : commissionRules || []
  ) as CommissionRule[];
  const pricedBookings = financeBookings
    .map((booking) => ({
      ...booking,
      priceFrom: getPriceFromContext(booking.booking_context),
    }))
    .filter((booking) => booking.priceFrom > 0);
  const pricedBookingsWithCommission = pricedBookings.map((booking) => {
    const commissionRule = getBookingCommissionRule(
      booking,
      commissionRulesSafe
    );
    const commissionRate = commissionRule
      ? Number(commissionRule.commission_rate)
      : 0;
    const commissionAmount = Math.round(
      booking.priceFrom * (Number.isFinite(commissionRate) ? commissionRate : 0) / 100
    );

    return {
      ...booking,
      commissionRule,
      commissionRate,
      commissionAmount,
    };
  });

  const completedBookings = pricedBookingsWithCommission.filter(
    (booking) => getBookingStatusKey(booking.status) === "completed"
  );
  const activePipeline = pricedBookingsWithCommission.filter((booking) =>
    ["confirmed", "rescheduled", "pending"].includes(
      getBookingStatusKey(booking.status)
    )
  );
  const unconfiguredCommissionBookings = pricedBookingsWithCommission.filter(
    (booking) => !booking.commissionRule
  );

  const capturedVolume = pricedBookings.reduce(
    (total, booking) => total + booking.priceFrom,
    0
  );
  const completedVolume = completedBookings.reduce(
    (total, booking) => total + booking.priceFrom,
    0
  );
  const pipelineVolume = activePipeline.reduce(
    (total, booking) => total + booking.priceFrom,
    0
  );
  const averageTicket =
    pricedBookings.length > 0 ? capturedVolume / pricedBookings.length : 0;
  const configuredCommission = completedBookings.reduce(
    (total, booking) => total + booking.commissionAmount,
    0
  );
  const billingModel = process.env.ENCUENTRA_BILLING_MODEL || "simulation";
  const paymentsSimulationMode = billingModel === "simulation";
  const paymentChecks = [
    {
      label: "Proveedor de pagos",
      done: getEnvFlag("STRIPE_SECRET_KEY", "PAYMENT_PROVIDER"),
      hint: "Pendiente hasta decidir Stripe u otro proveedor.",
    },
    {
      label: "Webhook de cobros",
      done: getEnvFlag("STRIPE_WEBHOOK_SECRET", "PAYMENT_WEBHOOK_SECRET"),
      hint: "Necesario para confirmar pagos sin depender del navegador.",
    },
    {
      label: "Modelo comercial",
      done:
        getEnvFlag("ENCUENTRA_BILLING_MODEL") ||
        commissionRulesSafe.length > 0,
      hint:
        "No hay comision global: configura porcentajes por clinica o especialista.",
    },
    {
      label: "Precios capturados",
      done: pricedBookings.length > 0,
      hint: `${pricedBookings.length}/${financeBookings.length} reservas tienen precio orientativo.`,
    },
  ];
  const readyPaymentChecks = paymentChecks.filter((check) => check.done).length;

  const rows = [
    ["Volumen capturado", capturedVolume, "Precio orientativo enviado al checkout"],
    ["Tratamientos completados", completedVolume, "Citas finalizadas con precio"],
    ["Pipeline activo", pipelineVolume, "Pendientes, confirmadas y reprogramadas"],
    ["Ticket medio", averageTicket, "Media de reservas con precio"],
  ] as const;

  return (
    <AdminShell
      isSuperAdmin={isSuperAdmin}
      accessRole={adminUser.access_role}
      permissions={adminUser.permissions}
      status={adminUser.status}
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Finanzas
            </p>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight">
              Control comercial
            </h1>
            <p className="mt-4 max-w-2xl text-neutral-500">
              Vista interna para estimar volumen, ticket medio y oportunidad de
              comision antes de activar pagos o liquidaciones reales.
            </p>
          </div>

          <Link
            href="/admin/reservas"
            className="w-fit rounded-full border border-black/10 bg-white px-6 py-3 text-sm transition hover:border-black"
          >
            Ver reservas
          </Link>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {rows.map(([label, value, hint]) => (
            <div
              key={label}
              className="rounded-[28px] border border-black/5 bg-white/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.04)]"
            >
              <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                {label}
              </p>
              <p className="mt-4 text-4xl font-semibold tracking-tight">
                {formatCurrency(value)}
              </p>
              <p className="mt-3 text-sm leading-6 text-neutral-500">{hint}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[32px] border border-black/5 bg-black p-8 text-white">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">
              {paymentsSimulationMode ? "Simulacion activa" : "Modelo comercial"}
            </p>
            <h2 className="mt-4 text-3xl font-semibold">
              {paymentsSimulationMode
                ? "Cobros reales desactivados"
                : "Comisiones personalizadas"}
            </h2>
            <p className="mt-4 text-5xl font-semibold">
              {formatCurrency(configuredCommission)}
            </p>
            <p className="mt-5 text-sm leading-7 text-white/60">
              {paymentsSimulationMode
                ? "Esta pantalla calcula oportunidad comercial con reglas personales, pero no cobra, no liquida y no emite facturas reales."
                : "Calculo orientativo sobre citas completadas con una regla de comision personal configurada."}
            </p>
          </div>

          <div className="rounded-[32px] border border-black/5 bg-white/80 p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                  Calidad de datos
                </p>
                <h2 className="mt-3 text-3xl font-semibold">
                  Preparacion financiera
                </h2>
              </div>
              <span className="w-fit rounded-full bg-[#F7F5F2] px-4 py-2 text-sm text-neutral-600">
                {pricedBookings.length}/{financeBookings.length} con precio
              </span>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["Completadas", completedBookings.length],
                ["Pipeline", activePipeline.length],
                ["Sin regla", unconfiguredCommissionBookings.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-[#F7F5F2] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                    {label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <p className="mt-7 text-sm leading-7 text-neutral-500">
              Para publicar con una capa financiera real, cada clinica o
              especialista debe tener su porcentaje propio. Si una reserva no
              tiene regla asociada, no se calcula comision.
            </p>
          </div>
        </section>

        {paymentsSimulationMode && (
          <section className="mt-6 rounded-[32px] border border-amber-100 bg-amber-50 p-8 text-amber-950">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-700">
              Pre-lanzamiento
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Pagos en modo simulacion
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7">
              Puedes validar reservas, precios orientativos, pipeline y
              comisiones estimadas sin mover dinero real. Antes de publicar con
              cobros activos faltan proveedor de pagos, webhook, politica de
              cancelacion/reembolso y datos fiscales.
            </p>
          </section>
        )}

        {commissionRulesError && (
          <section className="mt-6 rounded-[32px] border border-amber-100 bg-amber-50 p-8 text-amber-950">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-700">
              Migracion pendiente
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Falta crear la tabla de comisiones
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7">
              Ejecuta la migracion{" "}
              <span className="font-medium">
                202607150002_commission_rules.sql
              </span>{" "}
              en Supabase para poder guardar porcentajes personalizados.
            </p>
          </section>
        )}

        <AdminCommissionRulesManager
          rules={commissionRulesSafe}
          clinics={((clinics || []) as Array<{
            id: string | number;
            name: string;
            city?: string | null;
          }>)
            .filter((clinic) => clinic.name)
            .map((clinic) => ({
              type: "clinic",
              id: clinic.id,
              name: clinic.name,
              detail: clinic.city || null,
            } satisfies TargetOption))}
          specialists={((specialists || []) as Array<{
            id: string | number;
            name: string;
            clinic_name?: string | null;
            specialty?: string | null;
          }>)
            .filter((specialist) => specialist.name)
            .map((specialist) => ({
              type: "specialist",
              id: specialist.id,
              name: specialist.name,
              detail: specialist.clinic_name || specialist.specialty || null,
            } satisfies TargetOption))}
        />

        <section className="mt-6 rounded-[32px] border border-black/5 bg-white/80 p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                Pagos reales
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                Preparacion de cobros
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-500">
                Esta vista mantiene Finanzas en modo simulacion hasta que se
                configure proveedor, webhook y modelo comercial. Asi puedes
                seguir construyendo marketplace sin activar dinero real antes
                de tiempo.
              </p>
            </div>
            <span className="w-fit rounded-full bg-black px-5 py-3 text-sm text-white">
              {readyPaymentChecks}/{paymentChecks.length} listo
            </span>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-2">
            {paymentChecks.map((check) => (
              <div
                key={check.label}
                className={`rounded-3xl border p-5 ${
                  check.done
                    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                    : "border-amber-100 bg-amber-50 text-amber-900"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{check.label}</div>
                    <div className="mt-2 text-sm opacity-75">{check.hint}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs text-black">
                    {check.done ? "OK" : "Falta"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[32px] border border-black/5 bg-white/80 p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                Ultimas reservas con precio
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                Trazabilidad comercial
              </h2>
            </div>
            <Link
              href="/admin/analytics"
              className="w-fit rounded-full border border-black/10 px-5 py-3 text-sm transition hover:border-black"
            >
              Ver analytics
            </Link>
          </div>

          <div className="mt-7 divide-y divide-black/5">
            {pricedBookingsWithCommission.slice(0, 8).map((booking) => (
              <Link
                key={booking.id}
                href={`/admin/reservas/${booking.id}`}
                className="grid gap-3 py-5 text-sm transition hover:bg-[#F7F5F2] sm:grid-cols-[1.2fr_1fr_0.8fr_0.7fr_0.7fr]"
              >
                <span>
                  <span className="block font-medium">
                    {booking.full_name || "Paciente"}
                  </span>
                  <span className="text-neutral-500">
                    {booking.specialist_name ||
                      booking.clinic_name ||
                      "Sin asignar"}
                  </span>
                </span>
                <span className="text-neutral-600">
                  {booking.treatment || "Tratamiento"}
                </span>
                <span className="text-neutral-500">
                  {getBookingDateLabel(booking)}
                </span>
                <span className="font-semibold">
                  {formatCurrency(booking.priceFrom)}
                </span>
                <span className="text-neutral-500">
                  {booking.commissionRule
                    ? `${booking.commissionRate}% - ${formatCurrency(
                        booking.commissionAmount
                      )}`
                    : "Sin regla"}
                </span>
              </Link>
            ))}

            {pricedBookings.length === 0 && (
              <p className="rounded-2xl bg-[#F7F5F2] p-5 text-sm text-neutral-500">
                Aun no hay reservas con precio capturado.
              </p>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
