import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import AdminShell from "@/components/AdminShell";
import GoogleCalendarSyncButton from "@/components/GoogleCalendarSyncButton";
import { hasAdminPermission } from "@/lib/admin-access";
import {
  getBookingStatusClass,
  getBookingStatusKey,
  getBookingStatusLabel,
} from "@/lib/booking-status";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type BookingEvent = {
  id: string | number;
  event_type: string;
  actor_type: "patient" | "admin" | "system";
  description: string | null;
  metadata: {
    previous_date?: string | null;
    previous_time?: string | null;
    next_date?: string | null;
    next_time?: string | null;
  } | null;
  created_at: string;
};

type Delivery = {
  id: string;
  channel: string;
  recipient: string | null;
  subject: string | null;
  status: string;
  provider: string | null;
  error: string | null;
  created_at: string;
  sent_at: string | null;
};

const eventLabels: Record<string, string> = {
  created: "Solicitud creada",
  created_manual: "Reserva creada manualmente",
  confirmed: "Reserva confirmada",
  rescheduled: "Cita reprogramada",
  cancelled: "Cita cancelada",
  expired: "Solicitud expirada",
  completed: "Tratamiento completado",
  status_changed: "Estado actualizado",
  reminder_sent: "Recordatorio enviado",
  review_requested: "Opinion solicitada",
  imported: "Reserva registrada",
  google_calendar_sync: "Google Calendar",
};

function formatDateTime(value?: string | null) {
  if (!value) return "No registrado";

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return value.slice(0, 10);
}

function getBookingTime(date?: string | null, time?: string | null) {
  return time?.slice(0, 5) || date?.slice(11, 16) || "Sin hora";
}

function actorLabel(actor: BookingEvent["actor_type"]) {
  if (actor === "patient") return "Paciente";
  if (actor === "admin") return "Administracion";
  return "Sistema";
}

function sourceLabel(source?: string | null) {
  const sources: Record<string, string> = {
    clinic_profile: "Ficha de clinica",
    specialist_profile: "Ficha de especialista",
    clinic_booking_page: "Pagina de reserva",
    featured_clinic: "Clinica destacada",
    direct: "Directa",
    manual_admin: "Creada en admin",
  };

  return source ? sources[source] || source.replaceAll("_", " ") : "No registrado";
}

function googleSyncLabel(status?: string | null, eventId?: string | null) {
  if (status === "synced") return "Sincronizada";
  if (status === "error") return "Con error";
  if (status === "cancelled") return "Cancelada en Google";
  if (eventId) return "Vinculada";
  return "Sin sincronizar";
}

function googleSyncClass(status?: string | null, eventId?: string | null) {
  if (status === "synced") return "bg-emerald-50 text-emerald-700";
  if (status === "error") return "bg-red-50 text-red-700";
  if (status === "cancelled") return "bg-neutral-100 text-neutral-700";
  if (eventId) return "bg-sky-50 text-sky-700";
  return "bg-[#F7F5F2] text-neutral-500";
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  if (!hasAdminPermission({
    role: adminUser.role,
    accessRole: adminUser.access_role,
    permissions: adminUser.permissions,
    status: adminUser.status,
  }, "bookings")) {
    redirect("/admin");
  }

  const { id } = await params;
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!booking) notFound();

  if (!adminUser.role || adminUser.role !== "super_admin") {
    const { data: specialist } = adminUser.specialist_id
      ? await supabase
          .from("specialists")
          .select("name")
          .eq("id", adminUser.specialist_id)
          .maybeSingle()
      : { data: null };

    if (specialist?.name && booking.specialist_name !== specialist.name) {
      notFound();
    }

    const { data: clinic } = adminUser.clinic_id
      ? await supabase
          .from("clinics")
          .select("name")
          .eq("id", adminUser.clinic_id)
          .maybeSingle()
      : { data: null };

    if (!specialist?.name && clinic?.name && booking.clinic_name !== clinic.name) {
      notFound();
    }
  }

  const [{ data: events }, { data: deliveries }] = await Promise.all([
    supabase
      .from("booking_events")
      .select("*")
      .eq("booking_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("notification_deliveries")
      .select("*")
      .eq("related_booking_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const typedEvents = (events || []) as BookingEvent[];
  const typedDeliveries = (deliveries || []) as Delivery[];
  const context = (booking.booking_context || {}) as {
    price_from?: number | string | null;
    availability_checked?: boolean | null;
  };
  const status = booking.status || "Pendiente";
  const statusLabel =
    getBookingStatusKey(status) === "completed"
      ? "Asistio"
      : getBookingStatusLabel(status);

  return (
    <AdminShell
      isSuperAdmin={adminUser.role === "super_admin"}
      accessRole={adminUser.access_role}
      permissions={adminUser.permissions}
      status={adminUser.status}
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin/reservas"
              className="text-sm text-neutral-500 transition hover:text-black"
            >
              &lt;- Volver a reservas
            </Link>

            <p className="mt-8 text-sm uppercase tracking-[0.3em] text-neutral-500">
              Ficha de reserva #{booking.id}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                {booking.full_name || "Paciente"}
              </h1>

              <span
                className={`rounded-full px-4 py-2 text-sm font-medium ${getBookingStatusClass(
                  status
                )}`}
              >
                {statusLabel}
              </span>
            </div>

            <p className="mt-4 text-neutral-500">
              Registro operativo completo de la cita, sus cambios y comunicaciones.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/calendar"
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm transition hover:border-black"
            >
              Abrir agenda
            </Link>
            <Link
              href="/admin/reservas"
              className="rounded-full bg-black px-6 py-3 text-sm text-white"
            >
              Gestionar reserva
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-[1fr_390px]">
          <div className="grid gap-6">
            <section className="rounded-[32px] bg-white/75 p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                Cita
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Fecha", normalizeDate(booking.booking_date)],
                  ["Hora", getBookingTime(booking.booking_date, booking.booking_time)],
                  [
                    "Duracion",
                    booking.duration_minutes
                      ? `${booking.duration_minutes} min`
                      : "No registrada",
                  ],
                  ["Estado", statusLabel],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-[#F7F5F2] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                      {label}
                    </p>
                    <p className="mt-2 font-medium">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {[
                  ["Clinica", booking.clinic_name || "Sin clinica"],
                  ["Especialista", booking.specialist_name || "Sin especialista"],
                  ["Tratamiento", booking.treatment || "Sin tratamiento"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                      {label}
                    </p>
                    <p className="mt-2 text-lg font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] bg-white/75 p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                    Historial
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold">Actividad de la reserva</h2>
                </div>
                <span className="rounded-full bg-[#F7F5F2] px-4 py-2 text-sm text-neutral-500">
                  {typedEvents.length} eventos
                </span>
              </div>

              <div className="mt-6 grid gap-3">
                {typedEvents.length === 0 ? (
                  <p className="rounded-2xl bg-[#F7F5F2] p-5 text-neutral-500">
                    Todavia no hay eventos registrados.
                  </p>
                ) : (
                  typedEvents.map((event) => (
                    <article key={event.id} className="rounded-2xl bg-[#F7F5F2] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-medium">
                          {eventLabels[event.event_type] || event.event_type}
                        </p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600">
                          {actorLabel(event.actor_type)}
                        </span>
                      </div>
                      {event.description ? (
                        <p className="mt-2 text-sm text-neutral-600">{event.description}</p>
                      ) : null}
                      {event.metadata?.previous_date && event.metadata?.next_date ? (
                        <p className="mt-2 text-sm text-sky-700">
                          {event.metadata.previous_date} {event.metadata.previous_time || ""}
                          {" -> "}
                          {event.metadata.next_date} {event.metadata.next_time || ""}
                        </p>
                      ) : null}
                      <p className="mt-3 text-xs text-neutral-400">
                        {formatDateTime(event.created_at)}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="grid content-start gap-6">
            <section className="rounded-[32px] bg-black p-6 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-white/50">
                Paciente
              </p>
              <p className="mt-5 text-2xl font-semibold">
                {booking.full_name || "Sin nombre"}
              </p>
              <p className="mt-3 break-all text-sm text-white/70">
                {booking.email || "Sin email registrado"}
              </p>
              <p className="mt-2 text-sm text-white/70">
                {booking.phone || "Sin telefono registrado"}
              </p>
              <div className="mt-6 border-t border-white/10 pt-5 text-sm text-white/60">
                Creada {formatDateTime(booking.created_at)}
              </div>
            </section>

            <section className="rounded-[32px] bg-white/75 p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                Google Calendar
              </p>
              <div
                className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm ${googleSyncClass(
                  booking.google_calendar_sync_status,
                  booking.google_calendar_event_id
                )}`}
              >
                {googleSyncLabel(
                  booking.google_calendar_sync_status,
                  booking.google_calendar_event_id
                )}
              </div>
              {booking.google_calendar_event_id ? (
                <p className="mt-4 break-all text-xs text-neutral-500">
                  Evento: {booking.google_calendar_event_id}
                </p>
              ) : null}
              {booking.google_calendar_synced_at ? (
                <p className="mt-3 text-sm text-neutral-500">
                  Ultima sync: {formatDateTime(booking.google_calendar_synced_at)}
                </p>
              ) : null}
              {booking.google_calendar_last_error ? (
                <p className="mt-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                  {booking.google_calendar_last_error}
                </p>
              ) : null}
              <GoogleCalendarSyncButton
                bookingId={booking.id}
                className="mt-5 rounded-full bg-black px-5 py-3 text-sm text-white disabled:opacity-50"
              />
            </section>

            <section className="rounded-[32px] bg-white/75 p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                Origen
              </p>
              <p className="mt-4 text-lg font-medium">
                {sourceLabel(booking.booking_source)}
              </p>
              {context.availability_checked ? (
                <p className="mt-4 rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                  Disponibilidad validada
                </p>
              ) : null}
              {context.price_from ? (
                <p className="mt-4 text-sm text-neutral-500">
                  Precio capturado: desde {context.price_from} EUR
                </p>
              ) : null}
            </section>

            <section className="rounded-[32px] bg-white/75 p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                  Comunicaciones
                </p>
                <Link href="/admin/notificaciones" className="text-sm text-neutral-500">
                  Ver todos
                </Link>
              </div>
              <div className="mt-5 grid gap-3">
                {typedDeliveries.length === 0 ? (
                  <p className="rounded-2xl bg-[#F7F5F2] p-4 text-sm text-neutral-500">
                    Sin comunicaciones registradas.
                  </p>
                ) : (
                  typedDeliveries.map((delivery) => (
                    <article key={delivery.id} className="rounded-2xl bg-[#F7F5F2] p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                          {delivery.channel === "email" ? "Email" : delivery.channel}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            delivery.status === "sent"
                              ? "bg-emerald-100 text-emerald-700"
                              : delivery.status === "failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {delivery.status === "sent"
                            ? "Enviado"
                            : delivery.status === "failed"
                              ? "Fallido"
                              : "Pendiente"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium">
                        {delivery.subject || "Sin asunto"}
                      </p>
                      <p className="mt-2 text-xs text-neutral-400">
                        {formatDateTime(delivery.sent_at || delivery.created_at)}
                      </p>
                      {delivery.error ? (
                        <p className="mt-3 text-xs text-red-700">{delivery.error}</p>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}
