import { redirect } from "next/navigation";
import Link from "next/link";

import {
  getBookingStatusClass,
  getBookingStatusKey,
} from "@/lib/booking-status";
import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";

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

function normalizeTime(value?: string | null) {
  if (!value) return "";

  if (/^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }

  if (value.includes("T")) {
    return value.split("T")[1]?.slice(0, 5) || "";
  }

  if (value.includes(" ")) {
    return value.split(" ")[1]?.slice(0, 5) || "";
  }

  return "";
}

function getStatusClass(status?: string) {
  if (status === "Confirmada") return "bg-emerald-100 text-emerald-700";

  if (status === "Completada") return "bg-black text-white";

  if (status === "Reprogramada") return "bg-blue-100 text-blue-700";

  if (
    status === "Cancelada" ||
    status === "No asistió"
  ) {
    return "bg-red-100 text-red-700";
  }

  if (status === "Pendiente confirmación") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-white text-neutral-600";
}

function getBookingDisplayTime(booking: any) {
  return normalizeTime(booking.booking_time) || normalizeTime(booking.booking_date);
}

function getBookingStart(booking: any) {
  const date = normalizeDate(booking.booking_date);
  const time = getBookingDisplayTime(booking) || "00:00";

  if (!date) return null;

  return new Date(`${date}T${time}:00`);
}

function isFutureBooking(booking: any) {
  const start = getBookingStart(booking);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Boolean(start && start.getTime() >= today.getTime());
}

function cleanBrandText(value?: string | null) {
  return (value || "").replace(/ELARA/gi, "EncuentraTuClinica");
}

function getReviewStatusLabel(status?: string | null) {
  if (status === "Aprobada") return "Opinion publicada";
  if (status === "Rechazada") return "Opinion no publicada";

  return "Opinion en revision";
}

function getReviewStatusClass(status?: string | null) {
  if (status === "Aprobada") return "bg-emerald-100 text-emerald-700";
  if (status === "Rechazada") return "bg-red-100 text-red-700";

  return "bg-amber-100 text-amber-700";
}

export default async function PatientDashboardPage() {
  const supabaseAuth = await createClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/mi-cuenta?next=/dashboard");
  }

  const userEmail = user.email || "";

  const { data: profile } = await supabaseAuth
    .from("patient_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: bookingsByEmail } = await supabaseAuth
    .from("bookings")
    .select("*")
    .eq("email", userEmail);

  const bookingsMap = new Map<string, any>();

  (bookingsByEmail || []).forEach(
    (booking) => {
      bookingsMap.set(String(booking.id), booking);
    }
  );

  const bookings = Array.from(bookingsMap.values()).sort(
    (a: any, b: any) =>
      new Date(b.created_at || "").getTime() -
      new Date(a.created_at || "").getTime()
  );

  const { data: favoriteClinicsRaw } = await supabaseAuth
    .from("favorite_clinics")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  const favoriteClinicsByKey = new Map<string, any>();

  (favoriteClinicsRaw || []).forEach((favorite: any) => {
    const key = String(
      favorite.clinic_id ||
        favorite.clinic_slug ||
        cleanBrandText(favorite.clinic_name)
    );

    if (!favoriteClinicsByKey.has(key)) {
      favoriteClinicsByKey.set(key, favorite);
    }
  });

  const filteredFavoriteClinics = Array.from(favoriteClinicsByKey.values());

  const { data: favoriteSpecialistsRaw } = await supabaseAuth
    .from("favorite_specialists")
    .select("*")
    .eq("user_id", user.id);

  const specialistIds =
    favoriteSpecialistsRaw?.map((favorite) =>
      String(favorite.specialist_id)
    ) || [];

  const { data: specialistsData } = await supabase
    .from("specialists")
    .select("*");

  const filteredFavoriteSpecialists =
    specialistsData?.filter(
      (specialist: any) =>
        specialist?.id &&
        specialistIds.includes(
          String(specialist.id)
        )
    ) || [];

  const upcomingBookings =
    bookings?.filter(
      (booking) =>
        isFutureBooking(booking) &&
        (getBookingStatusKey(booking.status) === "confirmed" ||
          getBookingStatusKey(booking.status) === "pending" ||
          getBookingStatusKey(booking.status) === "rescheduled")
    ) || [];

  const completedBookings =
    bookings?.filter(
      (booking) =>
        getBookingStatusKey(booking.status) === "completed" ||
        (!isFutureBooking(booking) &&
          (getBookingStatusKey(booking.status) === "confirmed" ||
            getBookingStatusKey(booking.status) === "pending" ||
            getBookingStatusKey(booking.status) === "rescheduled"))
    ) || [];
  const bookingIds = bookings.map((booking) => String(booking.id));
  const { data: patientReviews } =
    bookingIds.length > 0
      ? await supabaseAuth
          .from("reviews")
          .select("booking_id,status,rating")
          .in("booking_id", bookingIds)
      : { data: [] };
  const reviewsByBookingId = new Map(
    (patientReviews || []).map((review) => [String(review.booking_id), review])
  );

  const treatments = Array.from(
    new Set(
      bookings
        ?.map(
          (booking) =>
            booking.treatment
        )
        .filter(Boolean)
    )
  );

  const clinics = Array.from(
    new Set(
      bookings
        ?.map(
          (booking) =>
            booking.clinic_name
        )
        .filter(Boolean)
    )
  );

  const patientName =
    profile?.full_name ||
    bookings?.find(
      (booking) =>
        booking.full_name
    )?.full_name ||
    userEmail;

  return (
    <main className="min-h-screen bg-[#F6F3EE] p-6 text-black lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-medium underline underline-offset-4">
            Volver al marketplace
          </Link>
            <Link
              href="/api/logout?next=/mi-cuenta"
              prefetch={false}
              className="rounded-md border border-black/10 bg-white px-5 py-3 text-sm"
            >
              Cerrar sesion
            </Link>
        </div>

        <section className="overflow-hidden rounded-[48px] bg-black p-8 text-white shadow-[0_30px_120px_rgba(0,0,0,0.2)] lg:p-10">

          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <p className="text-sm uppercase tracking-[0.3em] text-white/60">
                Mi cuenta
              </p>

              <h1 className="mt-6 text-5xl font-semibold tracking-tight lg:text-7xl">
                Hola, {patientName}
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/60">
                Gestiona tus reservas,
                favoritos, historial y
                próximas visitas dentro
                de EncuentraTuClinica.
              </p>

            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

              <div className="rounded-[28px] bg-white/10 p-5 backdrop-blur-xl">
                <div className="text-sm text-white/60">
                  Reservas
                </div>

                <div className="mt-3 text-4xl font-semibold">
                  {bookings?.length || 0}
                </div>
              </div>

              <div className="rounded-[28px] bg-white/10 p-5 backdrop-blur-xl">
                <div className="text-sm text-white/60">
                  Próximas
                </div>

                <div className="mt-3 text-4xl font-semibold">
                  {upcomingBookings.length}
                </div>
              </div>

              <div className="rounded-[28px] bg-white/10 p-5 backdrop-blur-xl">
                <div className="text-sm text-white/60">
                  Favoritos
                </div>

                <div className="mt-3 text-4xl font-semibold">
                  {
                    filteredFavoriteClinics.length +
                    filteredFavoriteSpecialists.length
                  }
                </div>
              </div>

              <div className="rounded-[28px] bg-white/10 p-5 backdrop-blur-xl">
                <div className="text-sm text-white/60">
                  Tratamientos
                </div>

                <div className="mt-3 text-4xl font-semibold">
                  {treatments.length}
                </div>
              </div>

            </div>

          </div>

        </section>

        <div className="mt-10 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">

          <div className="space-y-8">

            <section className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">

              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Próximas reservas
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Tu agenda EncuentraTuClinica
              </h2>

              <div className="mt-8 space-y-5">

                {upcomingBookings.length === 0 ? (

                  <div className="rounded-[28px] bg-[#F7F5F2] p-8 text-neutral-500">
                    No tienes próximas reservas.
                  </div>

                ) : (

                  upcomingBookings.map((booking) => (

                    <div
                      key={booking.id}
                      className="rounded-[32px] bg-[#F7F5F2] p-6"
                    >

                      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

                        <div>

                          <div className="flex flex-wrap items-center gap-3">

                            <h3 className="text-2xl font-semibold">
                              {booking.treatment ||
                                "Tratamiento reservado"}
                            </h3>

                            <div
                              className={`rounded-full px-4 py-2 text-sm ${getBookingStatusClass(
                                booking.status
                              )}`}
                            >
                              {booking.status ||
                                "Pendiente"}
                            </div>

                          </div>

                          <div className="mt-3 text-neutral-500">
                            {cleanBrandText(booking.clinic_name)}
                          </div>

                          <div className="mt-5 flex flex-wrap gap-2">

                            {booking.specialist_name && (
                              <div className="rounded-full bg-white px-4 py-2 text-sm">
                                {booking.specialist_name}
                              </div>
                            )}

                            <div className="rounded-full bg-white px-4 py-2 text-sm">
                              {normalizeDate(
                                booking.booking_date
                              )}

                              {getBookingDisplayTime(booking)
                                ? ` - ${getBookingDisplayTime(booking)}`
                                : ""}
                            </div>

                          </div>

                        </div>

                        <div className="flex flex-wrap gap-3">
                          {booking.cancellation_token && (
                            <Link
                              href={`/cancel-booking?token=${encodeURIComponent(
                                booking.cancellation_token
                              )}`}
                              className="rounded-full bg-black px-6 py-3 text-sm text-white"
                            >
                              Gestionar cita
                            </Link>
                          )}
                          <Link
                            href={`/tratamientos?clinic=${encodeURIComponent(
                              booking.clinic_name ||
                                ""
                            )}`}
                            className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm"
                          >
                            Ver tratamientos
                          </Link>
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
                Tratamientos anteriores
              </h2>

              <div className="mt-8 space-y-5">

                {completedBookings.length === 0 ? (

                  <div className="rounded-[28px] bg-[#F7F5F2] p-8 text-neutral-500">
                    Aún no tienes tratamientos completados.
                  </div>

                ) : (

                  completedBookings.map((booking) => (

                    <div
                      key={booking.id}
                      className="rounded-[32px] bg-[#F7F5F2] p-6"
                    >

                      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                        <div>

                          <h3 className="text-2xl font-semibold">
                            {booking.treatment}
                          </h3>

                          <div className="mt-2 text-neutral-500">
                            {cleanBrandText(booking.clinic_name)}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-4 py-2 text-sm ${getBookingStatusClass(
                                booking.status
                              )}`}
                            >
                              {booking.status || "Pendiente"}
                            </span>
                            <span className="rounded-full bg-white px-4 py-2 text-sm">
                              {normalizeDate(booking.booking_date)}
                              {getBookingDisplayTime(booking)
                                ? ` - ${getBookingDisplayTime(booking)}`
                                : ""}
                            </span>
                          </div>

                          {reviewsByBookingId.get(String(booking.id)) ? (
                            <div
                              className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm ${getReviewStatusClass(
                                reviewsByBookingId.get(String(booking.id))?.status
                              )}`}
                            >
                              {getReviewStatusLabel(
                                reviewsByBookingId.get(String(booking.id))?.status
                              )}
                              {reviewsByBookingId.get(String(booking.id))?.rating
                                ? ` - ${reviewsByBookingId.get(String(booking.id))?.rating}/5`
                                : ""}
                            </div>
                          ) : null}

                        </div>

                        <div className="flex flex-wrap gap-3">
                          {!reviewsByBookingId.has(String(booking.id)) &&
                            getBookingStatusKey(booking.status) === "completed" &&
                            booking.review_token && (
                              <Link
                                href={`/review/${booking.id}?token=${encodeURIComponent(
                                  booking.review_token
                                )}`}
                                className="rounded-full bg-black px-6 py-3 text-sm text-white"
                              >
                                Valorar experiencia
                              </Link>
                            )}

                          <Link
                            href={`/tratamientos?search=${encodeURIComponent(
                              booking.treatment ||
                                ""
                            )}`}
                            className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm"
                          >
                            Volver a reservar
                          </Link>
                        </div>

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
                Favoritos
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Clínicas guardadas
              </h2>

              <div className="mt-8 space-y-4">

                {filteredFavoriteClinics.length === 0 ? (

                  <div className="rounded-[28px] bg-[#F7F5F2] p-6 text-neutral-500">
                    Todavía no guardaste clínicas favoritas.
                  </div>

                ) : (

                  filteredFavoriteClinics.map(
                    (favorite: any) => (

                      <Link
                        key={favorite.id}
                        href={`/clinics/${favorite.clinic_slug}`}
                        className="block rounded-[28px] bg-[#F7F5F2] p-6 transition hover:scale-[1.01]"
                      >

                        <div className="text-xl font-semibold">
                          {cleanBrandText(favorite.clinic_name)}
                        </div>

                        <div className="mt-2 text-neutral-500">
                          {cleanBrandText(favorite.clinic_location)}
                        </div>

                      </Link>

                    )
                  )

                )}

              </div>

            </section>

            <section className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">

              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Favoritos
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Especialistas guardados
              </h2>

              <div className="mt-8 space-y-4">

                {filteredFavoriteSpecialists.length === 0 ? (

                  <div className="rounded-[28px] bg-[#F7F5F2] p-6 text-neutral-500">
                    Todavía no guardaste especialistas favoritos.
                  </div>

                ) : (

                  filteredFavoriteSpecialists.map(
                    (specialist: any) => (

                      <Link
                        key={specialist.id}
                        href={`/especialistas/${specialist.slug}`}
                        className="block rounded-[28px] bg-[#F7F5F2] p-6 transition hover:scale-[1.01]"
                      >

                        <div className="text-xl font-semibold">
                          {specialist.name}
                        </div>

                        <div className="mt-2 text-neutral-500">
                          {specialist.specialty ||
                            cleanBrandText(specialist.clinic_name)}
                        </div>

                      </Link>

                    )
                  )

                )}

              </div>

            </section>

          </div>

        </div>

      </div>
    </main>
  );
}
