import { redirect } from "next/navigation";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import AdminShell from "@/components/AdminShell";
import PrintReportButton from "@/components/PrintReportButton";
import {
  getBookingStatusKey,
  isPendingBookingStatus,
} from "@/lib/booking-status";

export default async function AdminReportePage() {
  const supabaseAuth =
    await createClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: adminUser } =
    await supabase
      .from("admin_users")
      .select("*")
      .eq("user_id", user.id)
      .single();

  if (!adminUser) {
    redirect("/login");
  }

  const { data: bookings } =
    await supabase
      .from("bookings")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

  const totalBookings =
    bookings?.length || 0;

  const confirmedBookings =
    bookings?.filter(
      (b) => getBookingStatusKey(b.status) === "confirmed"
    ).length || 0;

  const pendingBookings =
    bookings?.filter(
      (b) => isPendingBookingStatus(b.status)
    ).length || 0;

  const cancelledBookings =
    bookings?.filter((b) => getBookingStatusKey(b.status) === "cancelled").length || 0;
  const isSuperAdmin = adminUser.role === "super_admin";

  return (
    <AdminShell isSuperAdmin={isSuperAdmin}>
      <section className="mx-auto max-w-5xl rounded-[36px] bg-white p-6 text-black shadow-[0_20px_80px_rgba(0,0,0,0.04)] sm:p-10 print:max-w-none print:rounded-none print:p-8 print:shadow-none">

      <div>

        <div className="flex items-start justify-between border-b pb-8">

          <div>

            <h1 className="text-5xl font-semibold">
              EncuentraTuClinica
            </h1>

            <p className="mt-2 uppercase tracking-[0.3em] text-neutral-500">
              Reporte Ejecutivo
            </p>

          </div>

          <PrintReportButton />

        </div>

        <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4 print:grid-cols-4">

          <div className="rounded-3xl bg-[#F6F3EE] p-6">

            <p className="text-sm text-neutral-500">
              Reservas
            </p>

            <div className="mt-3 text-4xl font-semibold">
              {totalBookings}
            </div>

          </div>

          <div className="rounded-3xl bg-[#F6F3EE] p-6">

            <p className="text-sm text-neutral-500">
              Confirmadas
            </p>

            <div className="mt-3 text-4xl font-semibold">
              {confirmedBookings}
            </div>

          </div>

          <div className="rounded-3xl bg-[#F6F3EE] p-6">

            <p className="text-sm text-neutral-500">
              Pendientes
            </p>

            <div className="mt-3 text-4xl font-semibold">
              {pendingBookings}
            </div>

          </div>

          <div className="rounded-3xl bg-black p-6 text-white">

            <p className="text-sm text-white/60">
              Canceladas
            </p>

            <div className="mt-3 text-4xl font-semibold">
              {cancelledBookings}
            </div>

          </div>

        </div>

        <section className="mt-12">

          <h2 className="text-3xl font-semibold">
            Reservas recientes
          </h2>

          <div className="mt-6 overflow-x-auto rounded-3xl border">

            <table className="min-w-[720px] w-full text-left print:min-w-0">

              <thead className="bg-[#F6F3EE]">

                <tr>

                  <th className="p-4">
                    Paciente
                  </th>

                  <th className="p-4">
                    Clínica
                  </th>

                  <th className="p-4">
                    Tratamiento
                  </th>

                  <th className="p-4">
                    Fecha
                  </th>

                  <th className="p-4">
                    Estado
                  </th>

                </tr>

              </thead>

              <tbody>

                {bookings?.slice(0, 20).map(
                  (booking) => (

                    <tr
                      key={booking.id}
                      className="border-t"
                    >

                      <td className="p-4">
                        {booking.full_name}
                      </td>

                      <td className="p-4">
                        {booking.clinic_name}
                      </td>

                      <td className="p-4">
                        {booking.treatment}
                      </td>

                      <td className="p-4">
                        {booking.booking_date}
                      </td>

                      <td className="p-4">
                        {booking.status ||
                          "Pendiente"}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>

      </section>
    </AdminShell>
  );
}
