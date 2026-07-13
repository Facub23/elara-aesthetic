import { redirect } from "next/navigation";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import AdminShell from "@/components/AdminShell";
import AdminAnalyticsChart from "@/components/AdminAnalyticsChart";
import ClinicMetrics from "@/components/ClinicMetrics";
import TopTreatments from "@/components/TopTreatments";
import TopCities from "@/components/TopCities";
import TopSpecialists from "@/components/TopSpecialists";
import DailyBookingsChart from "@/components/DailyBookingsChart";
import RecentBookings from "@/components/RecentBookings";
import MarketplaceConversionAnalytics from "@/components/MarketplaceConversionAnalytics";
import { hasAdminPermission } from "@/lib/admin-access";
import {
  getBookingStatusKey,
  isPendingBookingStatus,
} from "@/lib/booking-status";
import {
  getAssignedClinicName,
  getAssignedSpecialist,
  scopedBookingsQuery,
} from "@/lib/admin-scope";

export default async function AdminAnalyticsPage() {
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
  }, "analytics")) {
    redirect("/admin");
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
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  bookingsQuery = scopedBookingsQuery(
    bookingsQuery,
    assignedClinicName,
    assignedSpecialist?.name || null
  );

  const { data: bookings } = await bookingsQuery;

  const totalBookings = bookings?.length || 0;

  const pendingBookings =
    bookings?.filter(
      (booking) => isPendingBookingStatus(booking.status)
    ).length || 0;

  const confirmedBookings =
    bookings?.filter((booking) => getBookingStatusKey(booking.status) === "confirmed").length || 0;

  const cancelledBookings =
    bookings?.filter((booking) => getBookingStatusKey(booking.status) === "cancelled").length || 0;

  const completedBookings =
    bookings?.filter((booking) => getBookingStatusKey(booking.status) === "completed").length || 0;

  const totalPatients = new Set(
    bookings?.map((booking) => booking.full_name).filter(Boolean)
  ).size;

  const conversionRate = totalBookings
    ? Math.round((confirmedBookings / totalBookings) * 100)
    : 0;

  const cancellationRate = totalBookings
    ? Math.round((cancelledBookings / totalBookings) * 100)
    : 0;
  const marketplaceBookings =
    bookings?.filter(
      (booking) =>
        booking.booking_source && booking.booking_source !== "direct"
    ).length || 0;

  const chartData = [
    {
      name: "Pendientes",
      total: pendingBookings,
    },
    {
      name: "Confirmadas",
      total: confirmedBookings,
    },
    {
      name: "Canceladas",
      total: cancelledBookings,
    },
  ];

  return (
    <AdminShell
      isSuperAdmin={isSuperAdmin}
      accessRole={adminUser.access_role}
      permissions={adminUser.permissions}
      status={adminUser.status}
    >
      <div className="mx-auto max-w-7xl">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          Métricas
        </p>

        <h1 className="mt-4 text-5xl font-semibold tracking-tight">
          Métricas EncuentraTuClinica
        </h1>

        <p className="mt-4 max-w-2xl text-neutral-500">
          Revisa rendimiento, conversión, cancelaciones, tratamientos
          y actividad por clínica.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[32px] bg-black p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <div className="text-sm uppercase tracking-[0.25em] text-white/60">
              Completadas
            </div>

            <div className="mt-5 text-5xl font-semibold">
              {completedBookings}
            </div>
          </div>

          <div className="rounded-[32px] bg-white/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
            <div className="text-sm uppercase tracking-[0.25em] text-neutral-500">
              Reservas
            </div>

            <div className="mt-5 text-5xl font-semibold">{totalBookings}</div>
          </div>

          <div className="rounded-[32px] bg-white/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
            <div className="text-sm uppercase tracking-[0.25em] text-neutral-500">
              Conversión
            </div>

            <div className="mt-5 text-5xl font-semibold">
              {conversionRate}%
            </div>
          </div>

          <div className="rounded-[32px] bg-white/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
            <div className="text-sm uppercase tracking-[0.25em] text-neutral-500">
              Marketplace
            </div>

            <div className="mt-5 text-5xl font-semibold">
              {marketplaceBookings}
            </div>
          </div>
        </div>

        <div className="mt-10">
          <MarketplaceConversionAnalytics bookings={bookings || []} />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
              Reservas
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Reservas por estado
            </h2>

            <div className="mt-10">
              <AdminAnalyticsChart data={chartData} />
            </div>
          </div>

          <div className="rounded-[40px] bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
              Resumen
            </p>

            <div className="mt-8 space-y-5">
              <div className="flex items-center justify-between rounded-[28px] bg-[#F7F5F2] p-5">
                <span className="text-neutral-500">Confirmadas</span>
                <span className="text-2xl font-semibold">
                  {confirmedBookings}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-[28px] bg-[#F7F5F2] p-5">
                <span className="text-neutral-500">Pendientes</span>
                <span className="text-2xl font-semibold">
                  {pendingBookings}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-[28px] bg-[#F7F5F2] p-5">
                <span className="text-neutral-500">Canceladas</span>
                <span className="text-2xl font-semibold">
                  {cancelledBookings}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-[28px] bg-[#F7F5F2] p-5">
                <span className="text-neutral-500">Cancelaciones</span>
                <span className="text-2xl font-semibold">
                  {cancellationRate}%
                </span>
              </div>

              <div className="flex items-center justify-between rounded-[28px] bg-[#F7F5F2] p-5">
                <span className="text-neutral-500">Pacientes únicos</span>
                <span className="text-2xl font-semibold">{totalPatients}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <DailyBookingsChart bookings={bookings || []} />
        </div>

        <div className="mt-10">
          <TopTreatments bookings={bookings || []} />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-3">
  <ClinicMetrics bookings={bookings || []} />

  <TopSpecialists bookings={bookings || []} />

  <TopCities bookings={bookings || []} />
</div>

<div className="mt-10">
  <RecentBookings
    initialBookings={bookings || []}
  />
</div>
      </div>
    </AdminShell>
  );
}
