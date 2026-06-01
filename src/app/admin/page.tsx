import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

import AdminShell from "@/components/AdminShell";
import AddClinicForm from "@/components/AddClinicForm";
import AdminLiveNotifications from "@/components/AdminLiveNotifications";
import AdminToastNotifications from "@/components/AdminToastNotifications";
import AdminActivityFeed from "@/components/AdminActivityFeed";
import AdminDeliveryLog from "@/components/AdminDeliveryLog";
import AdminMarketplaceHealth from "@/components/AdminMarketplaceHealth";
import AdminPrelaunchChecklist from "@/components/AdminPrelaunchChecklist";
import { getBookingStatusFilterValues } from "@/lib/booking-status";

type OperationalBooking = {
  id: string | number;
  full_name: string | null;
  clinic_name: string | null;
  specialist_name: string | null;
  treatment: string | null;
  booking_date: string | null;
  booking_time: string | null;
  status: string | null;
};

function getMadridDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
  }).format(new Date());
}

function getTime(booking: OperationalBooking) {
  return (
    booking.booking_time?.slice(0, 5) ||
    booking.booking_date?.slice(11, 16) ||
    "--:--"
  );
}

export default async function PremiumAdminDashboard() {
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
  const today = getMadridDate();

  const [
    { data: activityLogs },
    { data: adminNotifications },
    { data: notificationDeliveries },
    { data: clinics },
    { data: specialists },
    { data: treatments },
    { data: availability },
    { data: todayBookings },
    { data: pendingBookings },
  ] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(10),
    supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(20),
    supabase
      .from("notification_deliveries")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(10),
    supabase
      .from("clinics")
      .select(
        "id,name,slug,city,country,image,description,whatsapp,rating,patients"
      ),
    supabase
      .from("specialists")
      .select("id,name,slug,clinic_name,treatments,image,bio"),
    supabase
      .from("treatments")
      .select("id,name,slug,image,description"),
    supabase
      .from("specialist_availability")
      .select("id,specialist_name,is_active,active"),
    supabase
      .from("bookings")
      .select(
        "id,full_name,clinic_name,specialist_name,treatment,booking_date,booking_time,status"
      )
      .gte("booking_date", `${today} 00:00`)
      .lt("booking_date", `${today} 23:59`)
      .order("booking_date", { ascending: true }),
    supabase
      .from("bookings")
      .select(
        "id,full_name,clinic_name,specialist_name,treatment,booking_date,booking_time,status"
      )
      .in("status", getBookingStatusFilterValues("Pendiente confirmacion"))
      .order("created_at", { ascending: true })
      .limit(6),
  ]);

  const assignedClinic = adminUser.clinic_id
    ? clinics?.find((clinic) => Number(clinic.id) === Number(adminUser.clinic_id))
    : null;
  const scopeBookings = (items: OperationalBooking[]) =>
    !isSuperAdmin && assignedClinic?.name
      ? items.filter((booking) => booking.clinic_name === assignedClinic.name)
      : items;
  const todaysAgenda = scopeBookings((todayBookings || []) as OperationalBooking[]);
  const pendingQueue = scopeBookings((pendingBookings || []) as OperationalBooking[]);
  const failedEmails = (notificationDeliveries || []).filter(
    (delivery) => delivery.status === "failed"
  ).length;

  return (
    <AdminShell
      isSuperAdmin={isSuperAdmin}
      accessRole={adminUser.access_role}
      permissions={adminUser.permissions}
      status={adminUser.status}
    >
      <AdminToastNotifications />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Panel de control
          </p>

          <h1 className="mt-4 text-5xl font-semibold tracking-tight">
            Bienvenido de nuevo.
          </h1>

          <p className="mt-4 max-w-2xl text-neutral-500">
            Gestiona reservas, pacientes, clinicas y actividad interna desde un
            panel limpio, seguro y en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/api/export-bookings"
            className="rounded-full border border-black/10 bg-white px-6 py-3"
          >
            Exportar CSV
          </Link>

          {isSuperAdmin && <AddClinicForm />}
        </div>
      </div>

      <section className="mt-10 rounded-[36px] border border-black/5 bg-white/75 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.04)] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              Operativa de hoy en Espana
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Agenda y tareas pendientes
            </h2>
          </div>
          <Link
            href="/admin/reservas"
            className="w-fit rounded-full border border-black/10 bg-white px-5 py-3 text-sm transition hover:border-black"
          >
            Ir a reservas
          </Link>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {[
            ["Citas hoy", todaysAgenda.length, `/admin/reservas?date=${today}`],
            ["Por confirmar", pendingQueue.length, "/admin/reservas?status=Pendiente"],
            ["Envíos fallidos", failedEmails, "/admin/notificaciones?status=failed"],
          ].map(([label, value, href]) => (
            <Link
              key={String(label)}
              href={String(href)}
              className="rounded-2xl bg-[#F7F5F2] p-5 transition hover:bg-black hover:text-white"
            >
              <p className="text-xs uppercase tracking-[0.2em] opacity-60">
                {label}
              </p>
              <p className="mt-3 text-4xl font-semibold">{value}</p>
            </Link>
          ))}
        </div>

        <div className="mt-7 grid gap-6 xl:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Citas de hoy
            </p>
            <div className="mt-4 grid gap-3">
              {todaysAgenda.length === 0 ? (
                <p className="rounded-2xl bg-[#F7F5F2] p-5 text-sm text-neutral-500">
                  No hay citas programadas para hoy.
                </p>
              ) : (
                todaysAgenda.slice(0, 5).map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/admin/reservas/${booking.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-[#F7F5F2] p-4 transition hover:bg-black hover:text-white"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {booking.full_name || "Paciente"}
                      </p>
                      <p className="mt-1 truncate text-sm opacity-60">
                        {booking.treatment || "Tratamiento"} -{" "}
                        {booking.specialist_name || "Sin especialista"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-3 py-2 text-sm text-black">
                      {getTime(booking)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Confirmacion pendiente
            </p>
            <div className="mt-4 grid gap-3">
              {pendingQueue.length === 0 ? (
                <p className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-700">
                  No hay solicitudes pendientes de confirmacion.
                </p>
              ) : (
                pendingQueue.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/admin/reservas/${booking.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-amber-50 p-4 text-amber-900 transition hover:bg-amber-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {booking.full_name || "Paciente"}
                      </p>
                      <p className="mt-1 truncate text-sm opacity-70">
                        {booking.clinic_name || "Sin clinica"} -{" "}
                        {booking.booking_date?.slice(0, 10) || "Sin fecha"}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm">Revisar -&gt;</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/admin/calendar"
          className="rounded-[36px] bg-[#111111] p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)] transition hover:scale-[1.01]"
        >
          <p className="text-sm uppercase tracking-[0.25em] text-white/60">
            Agenda
          </p>

          <h2 className="mt-6 text-3xl font-semibold tracking-tight">
            Agenda avanzada
          </h2>

          <p className="mt-4 text-white/60">
            Gestiona disponibilidad, vacaciones, bloqueos y reservas.
          </p>
        </Link>

        <Link
          href="/admin/reservas"
          className="rounded-[36px] bg-black p-8 text-white transition hover:scale-[1.01]"
        >
          <p className="text-sm uppercase tracking-[0.25em] text-white/60">
            Reservas
          </p>

          <h2 className="mt-6 text-3xl font-semibold tracking-tight">
            Gestionar agenda
          </h2>

          <p className="mt-4 text-white/60">
            Ver, confirmar y controlar reservas en tiempo real.
          </p>
        </Link>

        <Link
          href="/admin/pacientes"
          className="rounded-[36px] bg-white/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)] transition hover:scale-[1.01]"
        >
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Pacientes
          </p>

          <h2 className="mt-6 text-3xl font-semibold tracking-tight">
            CRM interno
          </h2>

          <p className="mt-4 text-neutral-500">
            Historial, notas privadas y actividad por paciente.
          </p>
        </Link>

        <Link
          href="/admin/clinicas"
          className="rounded-[36px] bg-white/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)] transition hover:scale-[1.01]"
        >
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Clínicas
          </p>

          <h2 className="mt-6 text-3xl font-semibold tracking-tight">
            Sedes EncuentraTuClinica
          </h2>

          <p className="mt-4 text-neutral-500">
            Revisa fichas, especialistas y tratamientos vinculados.
          </p>
        </Link>

        <Link
          href="/admin/analytics"
          className="rounded-[36px] bg-white/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)] transition hover:scale-[1.01]"
        >
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Estadisticas
          </p>

          <h2 className="mt-6 text-3xl font-semibold tracking-tight">
            Métricas
          </h2>

          <p className="mt-4 text-neutral-500">
            Revisar rendimiento, conversion y actividad.
          </p>
        </Link>

        {isSuperAdmin && (
          <Link
            href="/admin/finanzas"
            className="rounded-[36px] bg-white/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)] transition hover:scale-[1.01]"
          >
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
              Finanzas
            </p>

            <h2 className="mt-6 text-3xl font-semibold tracking-tight">
              Control comercial
            </h2>

            <p className="mt-4 text-neutral-500">
              Estimar volumen, ticket medio y oportunidad de comision.
            </p>
          </Link>
        )}
      </div>

      {isSuperAdmin && (
        <>
          <AdminPrelaunchChecklist
            clinics={clinics || []}
            specialists={specialists || []}
            treatments={treatments || []}
            availability={availability || []}
            notificationDeliveries={notificationDeliveries || []}
            pendingBookings={pendingBookings || []}
            activityLogs={activityLogs || []}
          />

          <AdminMarketplaceHealth
            clinics={clinics || []}
            specialists={specialists || []}
            treatments={treatments || []}
            availability={availability || []}
          />
        </>
      )}

      <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminLiveNotifications initialNotifications={adminNotifications || []} />

        <AdminActivityFeed initialLogs={activityLogs || []} />
      </div>

      <AdminDeliveryLog deliveries={notificationDeliveries || []} />
    </AdminShell>
  );
}
