import { redirect } from "next/navigation";
import Link from "next/link";

import AdminLiveBookings from "@/components/AdminLiveBookings";
import AdminShell from "@/components/AdminShell";
import BookingOperationsFilters from "@/components/BookingOperationsFilters";
import CreateManualBookingButton from "@/components/CreateManualBookingButton";
import {
  getBookingStatusFilterValues,
  getBookingStatusKey,
  isIncidentBookingStatus,
  isPendingBookingStatus,
} from "@/lib/booking-status";
import { hasAdminPermission } from "@/lib/admin-access";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function normalizeDate(value?: string) {
  if (!value) return "";
  if (value.includes("T")) return value.split("T")[0];
  if (value.includes(" ")) return value.split(" ")[0];
  return value;
}

function getMadridDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
  }).format(new Date());
}

function getBookingPriority(status: string, bookingDate: string) {
  const date = normalizeDate(bookingDate);
  const today = getMadridDate();

  if (isPendingBookingStatus(status)) return 1;

  if (
    date === today &&
    getBookingStatusKey(status) !== "completed" &&
    !isIncidentBookingStatus(status)
  ) {
    return 2;
  }

  if (getBookingStatusKey(status) === "rescheduled") return 3;
  if (isIncidentBookingStatus(status)) return 5;

  return 4;
}

export default async function AdminReservasPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    search?: string;
    clinic?: string;
    specialist?: string;
    date?: string;
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

  if (!hasAdminPermission({
    role: adminUser.role,
    accessRole: adminUser.access_role,
    permissions: adminUser.permissions,
    status: adminUser.status,
  }, "bookings")) {
    redirect("/admin/sin-permiso");
  }

  const params = await searchParams;

  const selectedStatus = params.status || "";
  const search = params.search || "";
  const selectedClinic = params.clinic || "";
  const selectedSpecialist = params.specialist || "";
  const selectedDate = params.date || "";

  const { data: clinics } = await supabase
    .from("clinics")
    .select("*")
    .order("name", {
      ascending: true,
    });

  const assignedClinic = adminUser.clinic_id
    ? clinics?.find((clinic) => Number(clinic.id) === Number(adminUser.clinic_id))
    : null;
  const visibleClinics =
    !isSuperAdmin && assignedClinic ? [assignedClinic] : clinics || [];

  const { data: specialists } = await supabase
    .from("specialists")
    .select("*")
    .order("name", {
      ascending: true,
    });

  const assignedSpecialist = adminUser.specialist_id
    ? (specialists || []).find(
        (specialist) => String(specialist.id) === String(adminUser.specialist_id)
      )
    : null;

  const { data: treatments } = await supabase
    .from("treatments")
    .select("*")
    .order("name", {
      ascending: true,
    });

  const visibleSpecialists = assignedSpecialist
    ? [assignedSpecialist]
    : !isSuperAdmin && assignedClinic?.name
      ? (specialists || []).filter(
          (specialist) =>
            specialist.clinic_name === assignedClinic.name ||
            Number(specialist.clinic_id || 0) === Number(assignedClinic.id)
        )
      : specialists || [];

  let query = supabase.from("bookings").select("*");

  if (assignedSpecialist?.name) {
    query = query.eq("specialist_name", assignedSpecialist.name);
  } else if (!isSuperAdmin && assignedClinic?.name) {
    query = query.eq("clinic_name", assignedClinic.name);
  }

  if (selectedStatus && selectedStatus !== "Todas") {
    query = query.in("status", getBookingStatusFilterValues(selectedStatus));
  }

  if (selectedClinic) {
    query = query.eq("clinic_name", selectedClinic);
  }

  if (selectedSpecialist) {
    query = query.eq("specialist_name", selectedSpecialist);
  }

  if (selectedDate) {
    query = query
      .gte("booking_date", `${selectedDate} 00:00`)
      .lt("booking_date", `${selectedDate} 23:59`);
  }

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,clinic_name.ilike.%${search}%,treatment.ilike.%${search}%,specialist_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data: bookings } = await query.order("created_at", {
    ascending: false,
  });

  const liveBookings =
    bookings?.map((booking) => ({
      id: String(booking.id),
      full_name: booking.full_name || "",
      email: booking.email || "",
      booking_date: booking.booking_date || "",
      booking_time: booking.booking_time || "",
      duration_minutes: booking.duration_minutes || null,
      treatment: booking.treatment || "",
      clinic_name: booking.clinic_name || "",
      specialist_name: booking.specialist_name || "",
      status: booking.status || "Pendiente",
      created_at: booking.created_at || "",
      booking_source: booking.booking_source || "",
      source_url: booking.source_url || "",
      booking_context: booking.booking_context || {},
      rescheduled_at: booking.rescheduled_at || null,
      rescheduled_by: booking.rescheduled_by || null,
      previous_booking_date: booking.previous_booking_date || null,
      previous_booking_time: booking.previous_booking_time || null,
      google_calendar_event_id: booking.google_calendar_event_id || null,
      google_calendar_sync_status: booking.google_calendar_sync_status || null,
      google_calendar_synced_at: booking.google_calendar_synced_at || null,
      google_calendar_last_error: booking.google_calendar_last_error || null,
    })) || [];

  const sortedBookings = [...liveBookings].sort((a, b) => {
    const priorityA = getBookingPriority(a.status, a.booking_date);
    const priorityB = getBookingPriority(b.status, b.booking_date);

    if (priorityA !== priorityB) return priorityA - priorityB;

    return `${normalizeDate(a.booking_date)} ${a.booking_time}`.localeCompare(
      `${normalizeDate(b.booking_date)} ${b.booking_time}`
    );
  });

  const totalBookings = liveBookings.length;
  const pendingBookings = liveBookings.filter((booking) =>
    isPendingBookingStatus(booking.status)
  ).length;
  const confirmedBookings = liveBookings.filter(
    (booking) => getBookingStatusKey(booking.status) === "confirmed"
  ).length;
  const completedBookings = liveBookings.filter(
    (booking) => getBookingStatusKey(booking.status) === "completed"
  ).length;
  const cancelledBookings = liveBookings.filter((booking) =>
    isIncidentBookingStatus(booking.status)
  ).length;

  const today = getMadridDate();
  const todayBookings = liveBookings.filter(
    (booking) => normalizeDate(booking.booking_date) === today
  ).length;
  const upcomingBookings = liveBookings.filter((booking) => {
    const date = normalizeDate(booking.booking_date);

    return (
      date >= today &&
      getBookingStatusKey(booking.status) !== "completed" &&
      !isIncidentBookingStatus(booking.status)
    );
  }).length;
  const marketplaceBookings = liveBookings.filter((booking) =>
    Boolean(booking.booking_source && booking.booking_source !== "direct")
  ).length;
  const patientRescheduledBookings = liveBookings.filter(
    (booking) => booking.rescheduled_by === "patient"
  ).length;

  return (
    <AdminShell
      isSuperAdmin={isSuperAdmin}
      accessRole={adminUser.access_role}
      permissions={adminUser.permissions}
      status={adminUser.status}
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Reservas
            </p>

            <h1 className="mt-4 text-5xl font-semibold tracking-tight">
              Centro operativo de reservas
            </h1>

            <p className="mt-4 max-w-2xl text-neutral-500">
              Prioriza solicitudes pendientes, revisa la agenda de hoy y
              controla cambios, cancelaciones y reprogramaciones desde una sola
              vista.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/calendar"
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm transition hover:border-black"
            >
              Ir a agenda
            </Link>
            <CreateManualBookingButton
              clinics={visibleClinics}
              specialists={visibleSpecialists}
              treatments={treatments || []}
            />
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-5">
          {[
            ["Total", totalBookings],
            ["Pendientes", pendingBookings],
            ["Confirmadas", confirmedBookings],
            ["Completadas", completedBookings],
            ["Incidencias", cancelledBookings],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[28px] bg-white/70 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.04)]"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                {label}
              </p>
              <div className="mt-3 text-4xl font-semibold">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="rounded-[28px] bg-black p-6 text-white shadow-[0_20px_80px_rgba(0,0,0,0.08)]">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">
              Hoy
            </p>
            <div className="mt-3 text-4xl font-semibold">{todayBookings}</div>
          </div>

          <div className="rounded-[28px] bg-amber-50 p-6 text-amber-900 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-700/70">
              Requieren accion
            </p>
            <div className="mt-3 text-4xl font-semibold">
              {pendingBookings}
            </div>
          </div>

          <div className="rounded-[28px] bg-white/70 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              Proximas activas
            </p>
            <div className="mt-3 text-4xl font-semibold">
              {upcomingBookings}
            </div>
          </div>

          <div className="rounded-[28px] bg-white/70 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              Marketplace
            </p>
            <div className="mt-3 text-4xl font-semibold">
              {marketplaceBookings}
            </div>
          </div>

          <div className="rounded-[28px] bg-sky-50 p-6 text-sky-900 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
            <p className="text-xs uppercase tracking-[0.25em] text-sky-700/70">
              Cambios paciente
            </p>
            <div className="mt-3 text-4xl font-semibold">
              {patientRescheduledBookings}
            </div>
          </div>
        </div>

        <div className="mt-10">
          <BookingOperationsFilters
            initialSearch={search}
            currentStatus={selectedStatus || "Todas"}
            currentClinic={selectedClinic}
            currentSpecialist={selectedSpecialist}
            currentDate={selectedDate}
            clinics={visibleClinics}
            specialists={visibleSpecialists}
          />
        </div>

        <div className="mt-10 rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Cola operativa
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Reservas priorizadas
          </h2>

          <div className="mt-10">
            {sortedBookings.length === 0 ? (
              <div className="rounded-[28px] bg-[#F7F5F2] p-10 text-center">
                <div className="text-2xl font-semibold">
                  No hay reservas para estos filtros
                </div>

                <p className="mt-3 text-neutral-500">
                  Ajusta los filtros o crea una reserva manual.
                </p>
              </div>
            ) : (
              <AdminLiveBookings
                initialBookings={sortedBookings}
                scopeClinicName={
                  !isSuperAdmin && !assignedSpecialist?.name
                    ? assignedClinic?.name || null
                    : null
                }
                scopeSpecialistName={assignedSpecialist?.name || null}
              />
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
