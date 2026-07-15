import { redirect } from "next/navigation";
import Link from "next/link";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import AdminShell from "@/components/AdminShell";
import PatientSearch from "@/components/PatientSearch";
import { hasAdminPermission } from "@/lib/admin-access";
import { getBookingStatusClass, getBookingStatusKey } from "@/lib/booking-status";

type PatientData = {
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  treatments: string[];
  clinics: string[];
  lastBookingDate?: string;
  lastTreatment?: string;
  lastStatus?: string;
  email?: string;
};

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

function getPatientLevel(patient: PatientData) {
  if (
    patient.completedBookings >= 5
  ) {
    return "VIP";
  }

  if (patient.totalBookings >= 3) {
    return "Frecuente";
  }

  return "Nuevo";
}

function getLevelClass(level: string) {
  if (level === "VIP") {
    return "bg-black text-white";
  }

  if (level === "Frecuente") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-[#F2EEE8] text-neutral-700";
}

export default async function AdminPacientesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
  }>;
}) {
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

  const isSuperAdmin = adminUser.role === "super_admin";

  if (!isSuperAdmin && adminUser.access_role === "specialist") {
    redirect("/admin/sin-permiso");
  }

  if (!hasAdminPermission({
    role: adminUser.role,
    accessRole: adminUser.access_role,
    permissions: adminUser.permissions,
    status: adminUser.status,
  }, "patients")) {
    redirect("/admin/sin-permiso");
  }

  const params =
    await searchParams;

  const search =
    params.search || "";

  const { data: clinics } = await supabase
    .from("clinics")
    .select("id,name");

  const assignedClinic = adminUser.clinic_id
    ? clinics?.find((clinic) => Number(clinic.id) === Number(adminUser.clinic_id))
    : null;

  const { data: assignedSpecialist } = adminUser.specialist_id
    ? await supabase
        .from("specialists")
        .select("name")
        .eq("id", adminUser.specialist_id)
        .maybeSingle()
    : { data: null };

  let bookingsQuery = supabase
    .from("bookings")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (assignedSpecialist?.name) {
    bookingsQuery = bookingsQuery.eq("specialist_name", assignedSpecialist.name);
  } else if (!isSuperAdmin && assignedClinic?.name) {
    bookingsQuery = bookingsQuery.eq("clinic_name", assignedClinic.name);
  }

  const { data: bookings } = await bookingsQuery;

  const patientsMap: Record<
    string,
    PatientData
  > = {};

  bookings?.forEach((booking) => {
    const patient =
      booking.full_name ||
      "Paciente";

    if (!patientsMap[patient]) {
      patientsMap[patient] = {
        totalBookings: 0,
        confirmedBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        treatments: [],
        clinics: [],
        email: booking.email,
      };
    }

    const currentPatient =
      patientsMap[patient];

    currentPatient.totalBookings += 1;

    if (
      getBookingStatusKey(booking.status) === "confirmed"
    ) {
      currentPatient.confirmedBookings += 1;
    }

    if (
      getBookingStatusKey(booking.status) === "completed"
    ) {
      currentPatient.completedBookings += 1;

    }

    if (
      getBookingStatusKey(booking.status) === "cancelled"
    ) {
      currentPatient.cancelledBookings += 1;
    }

    if (
      booking.treatment &&
      !currentPatient.treatments.includes(
        booking.treatment
      )
    ) {
      currentPatient.treatments.push(
        booking.treatment
      );
    }

    if (
      booking.clinic_name &&
      !currentPatient.clinics.includes(
        booking.clinic_name
      )
    ) {
      currentPatient.clinics.push(
        booking.clinic_name
      );
    }

    if (
      !currentPatient.lastBookingDate
    ) {
      currentPatient.lastBookingDate =
        booking.booking_date;

      currentPatient.lastTreatment =
        booking.treatment;

      currentPatient.lastStatus =
        booking.status;
    }
  });

  const patients =
    Object.entries(
      patientsMap
    );

  const filteredPatients =
    patients.filter(
      ([name, patient]) => {
        const value =
          search.toLowerCase();

        return (
          name
            .toLowerCase()
            .includes(value) ||
          patient.clinics
            .join(" ")
            .toLowerCase()
            .includes(value) ||
          patient.treatments
            .join(" ")
            .toLowerCase()
            .includes(value) ||
          (patient.email || "")
            .toLowerCase()
            .includes(value)
        );
      }
    );

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
              Pacientes
            </p>

            <h1 className="mt-4 text-5xl font-semibold tracking-tight">
              CRM de pacientes
            </h1>

            <p className="mt-4 max-w-2xl text-neutral-500">
              Historial de reservas, notas internas, actividad y seguimiento.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-3xl bg-black p-6 text-white">
              <div className="text-sm text-white/60">
                Pacientes
              </div>

              <div className="mt-3 text-4xl font-semibold">
                {patients.length}
              </div>
            </div>

            <div className="rounded-3xl bg-white/70 p-6">
              <div className="text-sm text-neutral-500">
                Reservas
              </div>

              <div className="mt-3 text-4xl font-semibold">
                {bookings?.length || 0}
              </div>
            </div>

            <div className="rounded-3xl bg-white/70 p-6">
              <div className="text-sm text-neutral-500">
                Completadas
              </div>

              <div className="mt-3 text-4xl font-semibold">
                {
                  bookings?.filter(
                    (b) =>
                      b.status ===
                      "Completada"
                  ).length
                }
              </div>
            </div>

            <div className="rounded-3xl bg-white/70 p-6">
              <div className="text-sm text-neutral-500">
                Canceladas
              </div>

              <div className="mt-3 text-4xl font-semibold">
                {patients.reduce(
                  (acc, [, patient]) => acc + patient.cancelledBookings,
                  0
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <PatientSearch
            initialSearch={search}
          />
        </div>

        <div className="mt-12 grid gap-8">
          {filteredPatients.length ===
          0 ? (
            <div className="rounded-[32px] bg-white/70 p-10 text-center">
              No hay pacientes para mostrar.
            </div>
          ) : (
            filteredPatients.map(
              ([name, patient]) => {
                const level =
                  getPatientLevel(
                    patient
                  );

                return (
                  <div
                    key={name}
                    className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl"
                  >
                    <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link
                            href={`/admin/pacientes/${encodeURIComponent(
                              name
                            )}`}
                            className="text-4xl font-semibold tracking-tight transition hover:opacity-70"
                          >
                            {name}
                          </Link>

                          <div
                            className={`rounded-full px-4 py-2 text-sm ${getLevelClass(
                              level
                            )}`}
                          >
                            {level}
                          </div>

                          {patient.lastStatus && (
                            <div
                              className={`rounded-full px-4 py-2 text-sm ${getBookingStatusClass(
                                patient.lastStatus
                              )}`}
                            >
                              {
                                patient.lastStatus
                              }
                            </div>
                          )}
                        </div>

                        {patient.email && (
                          <div className="mt-3 text-neutral-500">
                            {patient.email}
                          </div>
                        )}

                        <div className="mt-6 flex flex-wrap gap-3">
                          {patient.clinics.map(
                            (clinic) => (
                              <div
                                key={clinic}
                                className="rounded-full bg-[#F2EEE8] px-4 py-2 text-sm"
                              >
                                {clinic}
                              </div>
                            )
                          )}
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                          {patient.treatments.map(
                            (
                              treatment
                            ) => (
                              <div
                                key={
                                  treatment
                                }
                                className="rounded-full bg-black px-5 py-3 text-sm text-white"
                              >
                                {
                                  treatment
                                }
                              </div>
                            )
                          )}
                        </div>

                        {patient.lastBookingDate && (
                          <div className="mt-8 rounded-[28px] bg-[#F7F5F2] p-5">
                            <div className="text-sm text-neutral-500">
                              Última actividad
                            </div>

                            <div className="mt-2 text-lg font-medium">
                              {
                                patient.lastTreatment
                              }
                            </div>

                            <div className="mt-1 text-neutral-500">
                              {normalizeDate(
                                patient.lastBookingDate
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 xl:w-[420px]">
                        <div className="rounded-3xl bg-[#F7F5F2] p-6">
                          <div className="text-sm text-neutral-500">
                            Reservas
                          </div>

                          <div className="mt-3 text-4xl font-semibold">
                            {
                              patient.totalBookings
                            }
                          </div>
                        </div>

                        <div className="rounded-3xl bg-[#F7F5F2] p-6">
                          <div className="text-sm text-neutral-500">
                            Confirmadas
                          </div>

                          <div className="mt-3 text-4xl font-semibold">
                            {
                              patient.confirmedBookings
                            }
                          </div>
                        </div>

                        <div className="rounded-3xl bg-[#F7F5F2] p-6">
                          <div className="text-sm text-neutral-500">
                            Completadas
                          </div>

                          <div className="mt-3 text-4xl font-semibold">
                            {
                              patient.completedBookings
                            }
                          </div>
                        </div>

                        <div className="rounded-3xl bg-[#F7F5F2] p-6">
                          <div className="text-sm text-neutral-500">
                            Canceladas
                          </div>

                          <div className="mt-3 text-4xl font-semibold">
                            {patient.cancelledBookings}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            )
          )}
        </div>
      </div>
    </AdminShell>
  );
}
