import Link from "next/link";
import { redirect } from "next/navigation";

import AdminShell from "@/components/AdminShell";
import MarkAdminNotificationReadButton from "@/components/MarkAdminNotificationReadButton";
import ResendNotificationButton from "@/components/ResendNotificationButton";
import { hasAdminPermission } from "@/lib/admin-access";
import {
  getAssignedClinicName,
  getAssignedSpecialist,
  scopedBookingsQuery,
} from "@/lib/admin-scope";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type NotificationDelivery = {
  id: string;
  channel: string;
  recipient: string | null;
  subject: string | null;
  message: string | null;
  status: string;
  provider: string | null;
  related_booking_id: number | string | null;
  error: string | null;
  created_at: string;
  sent_at: string | null;
};

type AdminNotification = {
  id: string;
  title: string | null;
  description: string | null;
  type: string | null;
  related_booking_id: number | string | null;
  read_at: string | null;
  created_at: string;
};

type BookingSummary = {
  id: number | string;
  full_name: string | null;
  clinic_name: string | null;
  specialist_name: string | null;
  booking_date: string | null;
  booking_time: string | null;
  status: string | null;
};

const statusClasses: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-amber-100 text-amber-700",
  pending: "bg-neutral-100 text-neutral-600",
};

const channelLabels: Record<string, string> = {
  email: "Email",
  whatsapp: "WhatsApp (pendiente)",
  sms: "SMS (pendiente)",
};

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBookingDate(booking?: BookingSummary) {
  if (!booking) return "Reserva no vinculada";

  const date = booking.booking_date?.slice(0, 10) || "";
  const time = booking.booking_time || booking.booking_date?.slice(11, 16) || "";

  return [date, time].filter(Boolean).join(" a las ") || "Sin fecha";
}

function buildFilterHref(params: {
  channel?: string;
  status?: string;
  search?: string;
}) {
  const query = new URLSearchParams();

  if (params.channel) query.set("channel", params.channel);
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);

  const queryString = query.toString();
  return queryString ? `/admin/notificaciones?${queryString}` : "/admin/notificaciones";
}

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    channel?: string;
    status?: string;
    search?: string;
  }>;
}) {
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

  if (
    !isSuperAdmin &&
    !hasAdminPermission({
      role: adminUser.role,
      accessRole: adminUser.access_role,
      permissions: adminUser.permissions,
      status: adminUser.status,
    }, "bookings")
  ) {
    redirect("/admin");
  }

  const params = await searchParams;
  const selectedChannel = params.channel || "";
  const selectedStatus = params.status || "";
  const search = (params.search || "").trim();

  let deliveriesQuery = supabase
    .from("notification_deliveries")
    .select("*")
    .order("created_at", {
      ascending: false,
    })
    .limit(80);

  if (selectedChannel) {
    deliveriesQuery = deliveriesQuery.eq("channel", selectedChannel);
  }

  if (selectedStatus) {
    deliveriesQuery = deliveriesQuery.eq("status", selectedStatus);
  }

  if (search) {
    const safeSearch = search.replaceAll(",", " ");
    deliveriesQuery = deliveriesQuery.or(
      `recipient.ilike.%${safeSearch}%,subject.ilike.%${safeSearch}%,message.ilike.%${safeSearch}%,error.ilike.%${safeSearch}%`
    );
  }

  const [{ data: deliveries }, { data: adminNotifications }] = await Promise.all([
    deliveriesQuery,
    supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(30),
  ]);

  const adminScope = {
    role: adminUser.role,
    clinicId: adminUser.clinic_id,
    specialistId: adminUser.specialist_id,
    accessRole: adminUser.access_role,
  };
  const assignedClinicName = await getAssignedClinicName(adminScope);
  const assignedSpecialist = await getAssignedSpecialist(adminScope);
  const candidateDeliveries = (deliveries || []) as NotificationDelivery[];
  const bookingIds = Array.from(
    new Set(
      candidateDeliveries
        .map((delivery) => delivery.related_booking_id)
        .filter(Boolean)
    )
  );

  let relatedBookingsQuery =
    bookingIds.length > 0
      ? supabase
          .from("bookings")
          .select(
            "id,full_name,clinic_name,specialist_name,booking_date,booking_time,status"
          )
          .in("id", bookingIds)
      : null;

  if (relatedBookingsQuery) {
    relatedBookingsQuery = scopedBookingsQuery(
      relatedBookingsQuery,
      assignedClinicName,
      assignedSpecialist?.name || null
    );
  }

  const { data: relatedBookings } = relatedBookingsQuery
    ? await relatedBookingsQuery
    : { data: [] };

  const visibleBookingIds = new Set(
    ((relatedBookings || []) as BookingSummary[]).map((booking) =>
      String(booking.id)
    )
  );
  const typedDeliveries = isSuperAdmin
    ? candidateDeliveries
    : candidateDeliveries.filter(
        (delivery) =>
          delivery.related_booking_id &&
          visibleBookingIds.has(String(delivery.related_booking_id))
      );

  const bookingsById = new Map(
    ((relatedBookings || []) as BookingSummary[]).map((booking) => [
      String(booking.id),
      booking,
    ])
  );

  const total = typedDeliveries.length;
  const sent = typedDeliveries.filter((delivery) => delivery.status === "sent").length;
  const failed = typedDeliveries.filter((delivery) => delivery.status === "failed").length;
  const skipped = typedDeliveries.filter((delivery) => delivery.status === "skipped").length;
  const visibleAdminNotifications = isSuperAdmin
    ? ((adminNotifications || []) as AdminNotification[])
    : ((adminNotifications || []) as AdminNotification[]).filter(
        (item) =>
          item.related_booking_id &&
          visibleBookingIds.has(String(item.related_booking_id))
      );
  const unread = visibleAdminNotifications.filter(
    (item) => !item.read_at
  ).length;

  const statusOptions = [
    { value: "", label: "Todos" },
    { value: "sent", label: "Enviados" },
    { value: "failed", label: "Fallidos" },
    { value: "skipped", label: "Pendientes" },
  ];

  const channelOptions = [
    { value: "", label: "Todos" },
    { value: "email", label: "Email" },
    { value: "whatsapp", label: "WhatsApp (pendiente)" },
    { value: "sms", label: "SMS (pendiente)" },
  ];

  return (
    <AdminShell
      isSuperAdmin={isSuperAdmin}
      accessRole={adminUser.access_role}
      permissions={adminUser.permissions}
      status={adminUser.status}
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Notificaciones
            </p>

            <h1 className="mt-4 text-5xl font-semibold tracking-tight">
              Centro de envios
            </h1>

            <p className="mt-4 max-w-3xl text-neutral-500">
              Revisa emails, recordatorios y alertas internas vinculadas a
              reservas. WhatsApp y SMS quedan preparados para una fase posterior.
            </p>
          </div>

          <Link
            href="/admin/emails"
            className="w-fit rounded-full bg-black px-6 py-3 text-sm text-white"
          >
            Editar plantillas
          </Link>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Total", total],
            ["Enviados", sent],
            ["Fallidos", failed],
            ["Pendientes", skipped],
            ["Alertas nuevas", unread],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[28px] bg-white/75 p-6">
              <div className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                {label}
              </div>

              <div className="mt-4 text-4xl font-semibold">{value}</div>
            </div>
          ))}
        </div>

        <form className="mt-8 grid gap-4 rounded-[32px] bg-white/75 p-5 md:grid-cols-[1fr_180px_180px_auto]">
          <input
            name="search"
            defaultValue={search}
            placeholder="Buscar por email, asunto, mensaje o error"
            className="min-h-12 rounded-full border border-black/10 bg-white px-5 text-sm outline-none focus:border-black"
          />

          <select
            name="channel"
            defaultValue={selectedChannel}
            className="min-h-12 rounded-full border border-black/10 bg-white px-5 text-sm outline-none focus:border-black"
          >
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={selectedStatus}
            className="min-h-12 rounded-full border border-black/10 bg-white px-5 text-sm outline-none focus:border-black"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button className="min-h-12 rounded-full bg-black px-6 text-sm text-white">
            Filtrar
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-3">
          {channelOptions.map((option) => (
            <Link
              key={option.value || "all-channels"}
              href={buildFilterHref({
                channel: option.value,
                status: selectedStatus,
                search,
              })}
              className={`rounded-full px-4 py-2 text-sm ${
                selectedChannel === option.value
                  ? "bg-black text-white"
                  : "bg-white text-neutral-600"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px]">
          <section className="rounded-[36px] bg-white/75 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                  Entregas
                </p>

                <h2 className="mt-3 text-3xl font-semibold">
                  Ultimos movimientos
                </h2>
              </div>

              <Link
                href="/admin/notificaciones"
                className="rounded-full border border-black/10 px-4 py-2 text-sm"
              >
                Limpiar
              </Link>
            </div>

            <div className="mt-6 grid gap-3">
              {typedDeliveries.length === 0 ? (
                <div className="rounded-[28px] bg-[#F7F5F2] p-6 text-neutral-500">
                  No hay entregas con estos filtros.
                </div>
              ) : (
                typedDeliveries.map((delivery) => {
                  const booking = delivery.related_booking_id
                    ? bookingsById.get(String(delivery.related_booking_id))
                    : undefined;

                  return (
                    <article
                      key={delivery.id}
                      className="rounded-[28px] bg-[#F7F5F2] p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                              {channelLabels[delivery.channel] || delivery.channel}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs ${
                                statusClasses[delivery.status] ||
                                statusClasses.pending
                              }`}
                            >
                              {delivery.status}
                            </span>
                          </div>

                          <h3 className="mt-4 text-lg font-semibold">
                            {delivery.subject || "Sin asunto"}
                          </h3>

                          <p className="mt-2 text-sm text-neutral-500">
                            {delivery.recipient || "Sin destinatario"} -{" "}
                            {delivery.provider || "sin proveedor"} -{" "}
                            {formatDate(delivery.created_at)}
                          </p>

                          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-neutral-600">
                            {delivery.message || "Sin mensaje registrado"}
                          </p>
                        </div>

                        <div className="shrink-0 rounded-2xl bg-white p-4 text-sm text-neutral-600 md:w-64">
                          <div className="font-semibold text-black">
                            {booking?.full_name || "Reserva"}
                          </div>

                          <div className="mt-1">{formatBookingDate(booking)}</div>

                          <div className="mt-1">
                            {booking?.clinic_name || "Clinica no vinculada"}
                          </div>

                          {booking?.status ? (
                            <div className="mt-3 rounded-full bg-[#F7F5F2] px-3 py-1 text-xs">
                              {booking.status}
                            </div>
                          ) : null}

                          {delivery.related_booking_id ? (
                            <Link
                              href={`/admin/reservas/${delivery.related_booking_id}`}
                              className="mt-4 inline-flex rounded-full border border-black/10 px-3 py-2 text-xs transition hover:border-black"
                            >
                              Ver ficha
                            </Link>
                          ) : null}

                          <ResendNotificationButton
                            deliveryId={delivery.id}
                            channel={
                              channelLabels[delivery.channel] ||
                              delivery.channel
                            }
                          />
                        </div>
                      </div>

                      {delivery.error ? (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                          {delivery.error}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <aside className="rounded-[36px] bg-black p-6 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-white/50">
              Inbox interno
            </p>

            <h2 className="mt-3 text-3xl font-semibold">Alertas admin</h2>

            <div className="mt-6 grid gap-3">
              {visibleAdminNotifications.length === 0 ? (
                <div className="rounded-[24px] bg-white/10 p-5 text-sm text-white/60">
                  No hay alertas internas todavia.
                </div>
              ) : (
                visibleAdminNotifications.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[24px] bg-white/10 p-5 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold">
                        {item.title || "Notificacion"}
                      </div>

                      {!item.read_at ? (
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] text-black">
                          Nueva
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 leading-relaxed text-white/60">
                      {item.description || "Sin descripcion"}
                    </p>

                    <div className="mt-4 text-xs uppercase tracking-[0.18em] text-white/40">
                      {item.type || "general"} - {formatDate(item.created_at)}
                    </div>

                    {!item.read_at ? (
                      <MarkAdminNotificationReadButton notificationId={item.id} />
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}
