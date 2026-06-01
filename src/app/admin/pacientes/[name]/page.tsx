import { redirect } from "next/navigation";
import Link from "next/link";

import AddPatientNote from "@/components/AddPatientNote";
import AdminShell from "@/components/AdminShell";
import { getBookingStatusClass, getBookingStatusKey } from "@/lib/booking-status";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function normalizeDate(value?: string) {
  if (!value) return "";

  if (value.includes("T")) {
    return value.split("T")[0];
  }

  if (value.includes(" ")) {
    return value.split(" ")[0];
  }

  return value;
}

function normalizeTime(value?: string) {
  if (!value) return "";

  if (value.includes("T")) {
    return value.split("T")[1]?.slice(0, 5) || "";
  }

  if (value.includes(" ")) {
    return value.split(" ")[1]?.slice(0, 5) || "";
  }

  return "";
}

function getPatientLevel(totalBookings: number, completedBookings: number) {
  if (completedBookings >= 5) return "VIP";
  if (totalBookings >= 3) return "Frecuente";
  return "Nuevo";
}

function getLevelClass(level: string) {
  if (level === "VIP") return "bg-white text-black";
  if (level === "Frecuente") return "bg-blue-100 text-blue-700";
  return "bg-white/10 text-white";
}

function getActivityIcon(type?: string) {
  if (type === "note") return "📝";
  if (type === "booking") return "📅";
  if (type === "review") return "⭐";
  if (type === "payment") return "💳";
  return "✨";
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{
    name: string;
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

  const { name } = await params;

  const patientName = decodeURIComponent(name);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("full_name", patientName)
    .order("created_at", {
      ascending: false,
    });

  const { data: notes } = await supabase
    .from("patient_notes")
    .select("*")
    .eq("patient_name", patientName)
    .order("created_at", {
      ascending: false,
    });

  const { data: activity } = await supabase
    .from("patient_activity")
    .select("*")
    .eq("patient_name", patientName)
    .order("created_at", {
      ascending: false,
    });

  const totalBookings = bookings?.length || 0;

  const confirmedBookings =
    bookings?.filter((booking) => getBookingStatusKey(booking.status) === "confirmed").length || 0;

  const completedBookings =
    bookings?.filter((booking) => getBookingStatusKey(booking.status) === "completed").length || 0;

  const cancelledBookings =
    bookings?.filter(
      (booking) =>
        ["cancelled", "no_show"].includes(getBookingStatusKey(booking.status))
    ).length || 0;

  const patientEmail = bookings?.find((booking) => booking.email)?.email;

  const lastBooking = bookings?.[0];

  const patientLevel = getPatientLevel(totalBookings, completedBookings);

  const treatments = Array.from(
    new Set(bookings?.map((booking) => booking.treatment).filter(Boolean))
  );

  const clinics = Array.from(
    new Set(bookings?.map((booking) => booking.clinic_name).filter(Boolean))
  );

  const specialists = Array.from(
    new Set(
      bookings?.map((booking) => booking.specialist_name).filter(Boolean)
    )
  );

  return (
    <AdminShell isSuperAdmin={isSuperAdmin}>
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/pacientes"
          className="inline-flex rounded-full border border-black/10 bg-white px-6 py-3 text-sm transition hover:scale-[1.02]"
        >
          ← Volver a pacientes
        </Link>

        <section className="mt-8 overflow-hidden rounded-[48px] bg-black p-8 text-white shadow-[0_30px_120px_rgba(0,0,0,0.2)] lg:p-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm uppercase tracking-[0.3em] text-white/60">
                  Perfil del paciente
                </p>

                <div
                  className={`rounded-full px-4 py-2 text-sm ${getLevelClass(
                    patientLevel
                  )}`}
                >
                  {patientLevel}
                </div>
              </div>

              <h1 className="mt-6 text-5xl font-semibold tracking-tight lg:text-7xl">
                {patientName}
              </h1>

              {patientEmail && (
                <p className="mt-4 text-white/60">{patientEmail}</p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                {clinics.length === 0 ? (
                  <div className="rounded-full bg-white/10 px-5 py-3 text-sm">
                    Sin clínicas asociadas
                  </div>
                ) : (
                  clinics.map((clinic) => (
                    <div
                      key={clinic}
                      className="rounded-full bg-white/10 px-5 py-3 text-sm backdrop-blur-xl"
                    >
                      {clinic}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-[28px] bg-white/10 p-5 backdrop-blur-xl">
                <div className="text-sm text-white/60">Reservas</div>
                <div className="mt-3 text-4xl font-semibold">
                  {totalBookings}
                </div>
              </div>

              <div className="rounded-[28px] bg-white/10 p-5 backdrop-blur-xl">
                <div className="text-sm text-white/60">Completadas</div>
                <div className="mt-3 text-4xl font-semibold">
                  {completedBookings}
                </div>
              </div>

              <div className="rounded-[28px] bg-white/10 p-5 backdrop-blur-xl">
                <div className="text-sm text-white/60">Canceladas</div>
                <div className="mt-3 text-4xl font-semibold">
                  {cancelledBookings}
                </div>
              </div>

              <div className="rounded-[28px] bg-white/10 p-5 backdrop-blur-xl">
                <div className="text-sm text-white/60">Confirmadas</div>
                <div className="mt-3 text-4xl font-semibold">
                  {confirmedBookings}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10 grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-8">
            <section className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Resumen
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Información clínica
              </h2>

              <div className="mt-8 grid gap-4">
                <div className="rounded-[28px] bg-[#F7F5F2] p-6">
                  <div className="text-sm text-neutral-500">
                    Última actividad
                  </div>

                  <div className="mt-2 text-xl font-semibold">
                    {lastBooking?.treatment || "Sin actividad registrada"}
                  </div>

                  {lastBooking?.booking_date && (
                    <div className="mt-2 text-neutral-500">
                      {normalizeDate(lastBooking.booking_date)}
                      {normalizeTime(lastBooking.booking_date)
                        ? ` - ${normalizeTime(lastBooking.booking_date)}`
                        : ""}
                    </div>
                  )}

                  {lastBooking?.status && (
                    <div
                      className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm ${getBookingStatusClass(
                        lastBooking.status,
                        true
                      )}`}
                    >
                      {lastBooking.status}
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] bg-[#F7F5F2] p-6">
                  <div className="text-sm text-neutral-500">Especialistas</div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {specialists.length === 0 ? (
                      <span className="text-neutral-500">
                        Sin especialistas registrados.
                      </span>
                    ) : (
                      specialists.map((specialist) => (
                        <div
                          key={specialist}
                          className="rounded-full bg-white px-4 py-2 text-sm"
                        >
                          {specialist}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Tratamientos
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Servicios realizados
              </h2>

              <div className="mt-8 flex flex-wrap gap-3">
                {treatments.length === 0 ? (
                  <div className="rounded-[24px] bg-[#F7F5F2] p-5 text-neutral-500">
                    No hay tratamientos registrados.
                  </div>
                ) : (
                  treatments.map((treatment) => (
                    <div
                      key={treatment}
                      className="rounded-full bg-black px-5 py-3 text-sm text-white"
                    >
                      {treatment}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Notas privadas
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Observaciones internas
              </h2>

              <div className="mt-8">
                <AddPatientNote patientName={patientName} />
              </div>

              <div className="mt-8 space-y-4">
                {!notes || notes.length === 0 ? (
                  <div className="rounded-[28px] bg-[#F7F5F2] p-6 text-neutral-500">
                    No hay notas privadas todavía.
                  </div>
                ) : (
                  notes.map((note: any) => (
                    <div
                      key={note.id}
                      className="rounded-[28px] border border-black/5 bg-[#F7F5F2] p-6"
                    >
                      <div className="text-lg font-medium leading-relaxed">
                        {note.note}
                      </div>

                      <div className="mt-4 text-sm text-neutral-500">
                        {note.created_at
                          ? new Date(note.created_at).toLocaleString()
                          : ""}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Timeline
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Actividad del paciente
              </h2>

              <div className="mt-10 space-y-5">
                {!activity || activity.length === 0 ? (
                  <div className="rounded-[28px] bg-[#F7F5F2] p-6 text-neutral-500">
                    No hay actividad registrada todavía.
                  </div>
                ) : (
                  activity.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex gap-5 rounded-[28px] border border-black/5 bg-[#F7F5F2] p-6"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black text-xl text-white">
                        {getActivityIcon(item.type)}
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-xl font-semibold">
                            {item.title}
                          </div>

                          <div className="rounded-full bg-white px-4 py-2 text-xs text-neutral-500">
                            {item.type || "general"}
                          </div>
                        </div>

                        {item.description && (
                          <div className="mt-3 leading-relaxed text-neutral-600">
                            {item.description}
                          </div>
                        )}

                        <div className="mt-4 text-sm text-neutral-400">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Historial
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Reservas del paciente
              </h2>

              <div className="mt-10 space-y-6">
                {!bookings || bookings.length === 0 ? (
                  <div className="rounded-[28px] bg-[#F7F5F2] p-10 text-center">
                    No hay actividad para este paciente.
                  </div>
                ) : (
                  bookings.map((booking, index) => (
                    <div
                      key={booking.id}
                      className="relative overflow-hidden rounded-[32px] border border-black/5 bg-[#F7F5F2] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.03)]"
                    >
                      <div className="absolute left-6 top-6 flex h-12 w-12 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                        {index + 1}
                      </div>

                      <div className="pl-16">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="text-2xl font-semibold">
                                {booking.treatment || "Tratamiento reservado"}
                              </div>

                              <div
                                className={`rounded-full px-4 py-2 text-sm font-medium ${getBookingStatusClass(
                                  booking.status || "Pendiente",
                                  true
                                )}`}
                              >
                                {booking.status || "Pendiente"}
                              </div>
                            </div>

                            <div className="mt-3 text-neutral-500">
                              {booking.clinic_name || "Clínica no asignada"}
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                              {booking.specialist_name && (
                                <div className="rounded-full bg-white px-4 py-2 text-sm text-neutral-700">
                                  {booking.specialist_name}
                                </div>
                              )}

                              <div className="rounded-full bg-white px-4 py-2 text-sm text-neutral-700">
                                {normalizeDate(booking.booking_date)}
                                {normalizeTime(booking.booking_date)
                                  ? ` - ${normalizeTime(booking.booking_date)}`
                                  : ""}
                              </div>

                              {booking.email && (
                                <div className="rounded-full bg-white px-4 py-2 text-sm text-neutral-700">
                                  {booking.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 border-l-2 border-black/10 pl-5 text-sm leading-relaxed text-neutral-500">
                          Registro histórico de actividad del paciente dentro del sistema EncuentraTuClinica.
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
