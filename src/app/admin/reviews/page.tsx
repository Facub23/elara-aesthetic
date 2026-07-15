import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import AdminShell from "@/components/AdminShell";
import { hasAdminPermission } from "@/lib/admin-access";
import {
  getAssignedClinicName,
  getAssignedSpecialist,
  isBookingInAdminScope,
  scopedBookingsQuery,
} from "@/lib/admin-scope";
import { getBookingStatusKey } from "@/lib/booking-status";
import { sendReviewRequest } from "@/lib/review-notifications";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getStatusClass(status: string) {
  if (status === "Aprobada") {
    return "border-emerald-200 bg-emerald-100 text-emerald-700";
  }

  if (status === "Rechazada") {
    return "border-red-200 bg-red-100 text-red-700";
  }

  return "border-amber-200 bg-amber-100 text-amber-700";
}

function cleanBrandText(value?: string | null) {
  return (value || "").replace(/ELARA/gi, "EncuentraTuClinica");
}

function formatRequestDate(value?: string | null) {
  if (!value) return "Todavia no solicitado";

  return new Date(value).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function revalidatePublicReviewSurfaces(review?: {
  clinic_name?: string | null;
  specialist_name?: string | null;
  treatment?: string | null;
}) {
  revalidatePath("/");
  revalidatePath("/clinics");
  revalidatePath("/especialistas");
  revalidatePath("/tratamientos");
  revalidatePath("/[city]/[treatment]", "page");

  if (!review) return;

  const [{ data: clinic }, { data: specialist }, { data: treatment }] =
    await Promise.all([
      review.clinic_name
        ? supabase
            .from("clinics")
            .select("slug")
            .eq("name", review.clinic_name)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      review.specialist_name
        ? supabase
            .from("specialists")
            .select("slug")
            .eq("name", review.specialist_name)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      review.treatment
        ? supabase
            .from("treatments")
            .select("slug")
            .eq("name", review.treatment)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  if (clinic?.slug) revalidatePath(`/clinics/${clinic.slug}`);
  if (specialist?.slug) revalidatePath(`/especialistas/${specialist.slug}`);
  if (treatment?.slug) revalidatePath(`/tratamientos/${treatment.slug}`);
}

async function checkAdmin() {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) redirect("/login");

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!adminUser) redirect("/login");

  if (!hasAdminPermission({
    role: adminUser.role,
    accessRole: adminUser.access_role,
    permissions: adminUser.permissions,
    status: adminUser.status,
  }, "reviews")) {
    redirect("/admin/sin-permiso");
  }

  return { supabaseAuth, adminUser };
}

async function getReviewScope(adminUser: any) {
  const adminScope = {
    role: adminUser.role,
    clinicId: adminUser.clinic_id,
    specialistId: adminUser.specialist_id,
    accessRole: adminUser.access_role,
  };

  const [clinicName, specialist] = await Promise.all([
    getAssignedClinicName(adminScope),
    getAssignedSpecialist(adminScope),
  ]);

  return {
    adminScope,
    clinicName,
    specialistName: specialist?.name || null,
  };
}

function scopedReviewsQuery<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  clinicName: string | null,
  specialistName?: string | null
) {
  if (specialistName) return query.eq("specialist_name", specialistName);
  return clinicName ? query.eq("clinic_name", clinicName) : query;
}

async function isReviewInAdminScope(adminUser: any, review?: {
  booking_id?: string | number | null;
  clinic_name?: string | null;
  specialist_name?: string | null;
}) {
  if (!review) return false;
  if (adminUser.role === "super_admin") return true;

  const { adminScope, clinicName, specialistName } =
    await getReviewScope(adminUser);

  if (review.booking_id) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("clinic_name,specialist_name")
      .eq("id", review.booking_id)
      .maybeSingle();

    return Boolean(
      booking && (await isBookingInAdminScope(adminScope, booking))
    );
  }

  if (specialistName) return review.specialist_name === specialistName;
  if (clinicName) return review.clinic_name === clinicName;

  return false;
}

async function approveReview(formData: FormData) {
  "use server";

  const reviewId = formData.get("reviewId") as string;
  const { adminUser } = await checkAdmin();
  const { data: review } = await supabase
    .from("reviews")
    .select("booking_id,clinic_name,specialist_name,treatment")
    .eq("id", reviewId)
    .maybeSingle();
  const { data: booking } = review?.booking_id
    ? await supabase
        .from("bookings")
        .select("status")
        .eq("id", review.booking_id)
        .maybeSingle()
    : { data: null };

  if (
    !review ||
    !(await isReviewInAdminScope(adminUser, review)) ||
    getBookingStatusKey(booking?.status) !== "completed"
  ) {
    redirect("/admin/reviews?moderation=unverified");
  }

  const { error } = await supabase
    .from("reviews")
    .update({ status: "Aprobada" })
    .eq("id", reviewId);

  if (error) {
    redirect("/admin/reviews?moderation=failed");
  }
  revalidatePath("/admin/reviews");
  await revalidatePublicReviewSurfaces(review);
  redirect("/admin/reviews?moderation=approved");
}

async function rejectReview(formData: FormData) {
  "use server";

  const reviewId = formData.get("reviewId") as string;
  const { adminUser } = await checkAdmin();
  const { data: review } = await supabase
    .from("reviews")
    .select("booking_id,clinic_name,specialist_name,treatment")
    .eq("id", reviewId)
    .maybeSingle();

  if (!(await isReviewInAdminScope(adminUser, review || undefined))) {
    redirect("/admin/reviews?moderation=unverified");
  }

  const { error } = await supabase
    .from("reviews")
    .update({ status: "Rechazada", featured: false })
    .eq("id", reviewId);

  if (error) {
    redirect("/admin/reviews?moderation=failed");
  }
  revalidatePath("/admin/reviews");
  await revalidatePublicReviewSurfaces(review || undefined);
  redirect("/admin/reviews?moderation=rejected");
}

async function toggleFeaturedReview(formData: FormData) {
  "use server";

  const reviewId = formData.get("reviewId") as string;
  const featured = formData.get("featured") === "true";
  const { adminUser } = await checkAdmin();
  const { data: review } = await supabase
    .from("reviews")
    .select("booking_id,status,clinic_name,specialist_name,treatment")
    .eq("id", reviewId)
    .maybeSingle();

  if (!(await isReviewInAdminScope(adminUser, review || undefined))) {
    redirect("/admin/reviews?moderation=unverified");
  }

  if (!featured && review?.status !== "Aprobada") {
    redirect("/admin/reviews?status=Pendiente");
  }

  const { error } = await supabase
    .from("reviews")
    .update({ featured: !featured })
    .eq("id", reviewId);

  if (error) {
    redirect("/admin/reviews?moderation=failed");
  }
  revalidatePath("/admin/reviews");
  await revalidatePublicReviewSurfaces(review || undefined);
  redirect("/admin/reviews");
}

async function deleteReview(formData: FormData) {
  "use server";

  const reviewId = formData.get("reviewId") as string;
  const { adminUser } = await checkAdmin();
  const { data: review } = await supabase
    .from("reviews")
    .select("booking_id,clinic_name,specialist_name,treatment")
    .eq("id", reviewId)
    .maybeSingle();

  if (!(await isReviewInAdminScope(adminUser, review || undefined))) {
    redirect("/admin/reviews?moderation=unverified");
  }

  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);

  if (error) {
    redirect("/admin/reviews?moderation=failed");
  }
  revalidatePath("/admin/reviews");
  await revalidatePublicReviewSurfaces(review || undefined);
  redirect("/admin/reviews");
}

async function requestReviewEmail(formData: FormData) {
  "use server";

  const { adminUser } = await checkAdmin();
  const bookingId = String(formData.get("bookingId") || "");
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  const { data: review } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (
    !booking ||
    !(await isBookingInAdminScope({
      role: adminUser.role,
      clinicId: adminUser.clinic_id,
      specialistId: adminUser.specialist_id,
      accessRole: adminUser.access_role,
    }, booking)) ||
    getBookingStatusKey(booking.status) !== "completed" ||
    review
  ) {
    redirect("/admin/reviews?request=invalid");
  }

  let emailSent = false;

  try {
    const result = await sendReviewRequest(booking, {
      resent: Boolean(booking.review_requested_at),
    });
    emailSent = result.status === "sent";
  } catch {
    emailSent = false;
  }

  revalidatePath("/admin/reviews");
  redirect(`/admin/reviews?request=${emailSent ? "sent" : "failed"}`);
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    search?: string;
    featured?: string;
    request?: string;
    moderation?: string;
  }>;
}) {
  const { adminUser } = await checkAdmin();
  const isSuperAdmin = adminUser.role === "super_admin";
  const { clinicName, specialistName } = await getReviewScope(adminUser);
  const params = await searchParams;
  const selectedStatus = params.status || "Todas";
  const search = (params.search || "").trim().toLowerCase();
  const featuredOnly = params.featured === "1";

  let reviewsQuery = supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });
  let bookingsQuery = supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  reviewsQuery = scopedReviewsQuery(reviewsQuery, clinicName, specialistName);
  bookingsQuery = scopedBookingsQuery(bookingsQuery, clinicName, specialistName);

  const [
    { data: reviews },
    { data: bookings },
    { data: clinics },
    { data: specialists },
    { data: treatments },
  ] = await Promise.all([
    reviewsQuery,
    bookingsQuery,
    supabase.from("clinics").select("name,slug"),
    supabase.from("specialists").select("name,slug"),
    supabase.from("treatments").select("name,slug"),
  ]);

  const allReviews = reviews || [];
  const reviewedBookingIds = new Set(
    allReviews.map((review) => String(review.booking_id)).filter(Boolean)
  );
  const bookingsPendingReview = (bookings || []).filter(
    (booking) =>
      getBookingStatusKey(booking.status) === "completed" &&
      !reviewedBookingIds.has(String(booking.id))
  );
  const bookingsById = new Map(
    (bookings || []).map((booking) => [String(booking.id), booking])
  );
  const clinicSlugs = new Map((clinics || []).map((clinic) => [clinic.name, clinic.slug]));
  const specialistSlugs = new Map(
    (specialists || []).map((specialist) => [specialist.name, specialist.slug])
  );
  const treatmentSlugs = new Map(
    (treatments || []).map((treatment) => [treatment.name, treatment.slug])
  );
  const filteredReviews = allReviews.filter((review) => {
    const matchesStatus =
      selectedStatus === "Todas" || review.status === selectedStatus;
    const matchesFeatured = !featuredOnly || Boolean(review.featured);
    const matchesSearch =
      !search ||
      [review.patient_name, review.clinic_name, review.specialist_name, review.treatment]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));

    return matchesStatus && matchesFeatured && matchesSearch;
  });
  const approvedReviews = allReviews.filter((review) => review.status === "Aprobada");
  const averageRating =
    approvedReviews.length > 0
      ? (
          approvedReviews.reduce(
            (sum, review) => sum + Number(review.rating || 0),
            0
          ) / approvedReviews.length
        ).toFixed(1)
      : "0.0";
  const stats = [
    ["Total", allReviews.length],
    ["Pendientes", allReviews.filter((review) => review.status === "Pendiente").length],
    ["Aprobadas", approvedReviews.length],
    ["Destacadas", allReviews.filter((review) => review.featured).length],
    ["Rating medio", averageRating],
    ["Por solicitar", bookingsPendingReview.length],
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
          Opiniones
        </p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight">
          Opiniones verificadas
        </h1>
        <p className="mt-4 max-w-2xl text-neutral-500">
          Modera opiniones asociadas a citas reales y controla la confianza
          visible en las fichas publicas.
        </p>

        {params.request === "sent" && (
          <div className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Solicitud de opinion enviada con enlace seguro.
          </div>
        )}
        {params.request === "failed" && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            No se pudo enviar el correo. Comprueba que la reserva tenga email y revisa la configuracion.
          </div>
        )}
        {params.request === "invalid" && (
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Esa reserva ya tiene una opinion o ya no esta completada.
          </div>
        )}
        {params.moderation === "approved" && (
          <div className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Opinion aprobada y publicada en las fichas correspondientes.
          </div>
        )}
        {params.moderation === "failed" && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            No se pudo completar la moderacion. Intentalo de nuevo.
          </div>
        )}
        {params.moderation === "rejected" && (
          <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
            Opinion rechazada y retirada de las superficies publicas.
          </div>
        )}
        {params.moderation === "unverified" && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            No puedes aprobar esta opinion porque no corresponde a una reserva completada.
          </div>
        )}

        <div className="mt-10 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-[28px] bg-white/70 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                {label}
              </p>
              <div className="mt-3 text-4xl font-semibold">{value}</div>
            </div>
          ))}
        </div>

        <section className="mt-10 rounded-lg border border-black/10 bg-white p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                Captacion de opiniones
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Citas completadas pendientes de opinion
              </h2>
              <p className="mt-3 text-sm text-neutral-500">
                Envia un enlace privado para que cada paciente valore solo su propia reserva.
              </p>
            </div>
            <div className="rounded-md bg-black px-5 py-3 text-sm text-white">
              {bookingsPendingReview.length} pendientes
            </div>
          </div>

          {bookingsPendingReview.length === 0 ? (
            <div className="mt-7 rounded-md bg-[#F7F5F2] p-7 text-sm text-neutral-600">
              No hay citas completadas pendientes de opinion.
            </div>
          ) : (
            <div className="mt-7 grid gap-3">
              {bookingsPendingReview.slice(0, 12).map((booking) => {
                const previouslySent = Boolean(booking.review_requested_at);

                return (
                  <article
                    key={booking.id}
                    className="flex flex-col gap-5 rounded-md bg-[#F7F5F2] p-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold">
                          {booking.full_name || "Paciente"}
                        </h3>
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600">
                          {previouslySent ? "Solicitud enviada" : "Sin solicitar"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-neutral-600">
                        {[
                          cleanBrandText(booking.clinic_name),
                          cleanBrandText(booking.specialist_name),
                          cleanBrandText(booking.treatment),
                        ]
                          .filter(Boolean)
                          .join(" - ")}
                      </p>
                      <p className="mt-2 text-xs text-neutral-500">
                        Ultimo envio: {formatRequestDate(booking.review_requested_at)}
                        {booking.review_request_count
                          ? ` - ${booking.review_request_count} envio(s)`
                          : ""}
                        {!booking.email ? " - Sin email registrado" : ""}
                      </p>
                    </div>

                    <form action={requestReviewEmail}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <button
                        disabled={!booking.email}
                        className="rounded-md bg-black px-5 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {previouslySent ? "Reenviar enlace" : "Solicitar opinion"}
                      </button>
                    </form>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <form className="mt-8 grid gap-3 rounded-[28px] border border-black/10 bg-white/70 p-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          <input
            name="search"
            defaultValue={params.search || ""}
            placeholder="Buscar paciente, clinica, especialista..."
            className="h-12 w-full min-w-0 rounded-2xl border border-black/10 bg-white px-5 outline-none"
          />
          <select
            name="status"
            defaultValue={selectedStatus}
            className="h-12 w-full min-w-0 rounded-2xl border border-black/10 bg-white px-5 outline-none"
          >
            <option value="Todas">Todos los estados</option>
            <option value="Pendiente">Pendientes</option>
            <option value="Aprobada">Aprobadas</option>
            <option value="Rechazada">Rechazadas</option>
          </select>
          <label className="flex h-12 w-full min-w-0 items-center gap-2 rounded-2xl border border-black/10 bg-white px-5 text-sm">
            <input type="checkbox" name="featured" value="1" defaultChecked={featuredOnly} />
            Destacadas
          </label>
          <button className="h-12 w-full min-w-0 rounded-2xl bg-black px-6 text-sm text-white">
            Filtrar
          </button>
        </form>

        <div className="mt-10 space-y-6">
          {filteredReviews.length === 0 ? (
            <div className="rounded-[32px] bg-white/70 p-10 text-center">
              No hay reviews para estos filtros.
            </div>
          ) : (
            filteredReviews.map((review) => {
              const booking = bookingsById.get(String(review.booking_id));
              const verifiedBooking = getBookingStatusKey(booking?.status) === "completed";
              const clinicSlug = clinicSlugs.get(review.clinic_name);
              const specialistSlug = specialistSlugs.get(review.specialist_name);
              const treatmentSlug = treatmentSlugs.get(review.treatment);

              return (
                <div key={review.id} className="rounded-[36px] border border-black/5 bg-white/70 p-7 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
                  <div className="flex flex-col gap-7 xl:flex-row xl:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-3xl font-semibold">
                          {review.patient_name || "Paciente verificado"}
                        </h2>
                        <span className={`rounded-full border px-4 py-2 text-sm ${getStatusClass(review.status || "Pendiente")}`}>
                          {review.status || "Pendiente"}
                        </span>
                        {review.featured && (
                          <span className="rounded-full bg-black px-4 py-2 text-sm text-white">
                            Destacada
                          </span>
                        )}
                        <span className={`rounded-full px-4 py-2 text-sm ${verifiedBooking ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {verifiedBooking ? "Reserva verificada" : "Revisar reserva"}
                        </span>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        {[
                          cleanBrandText(review.clinic_name),
                          cleanBrandText(review.specialist_name),
                          cleanBrandText(review.treatment),
                        ]
                          .filter(Boolean)
                          .map((label) => (
                            <span key={label} className="rounded-full bg-[#F5F1EB] px-4 py-2 text-sm">
                              {label}
                            </span>
                          ))}
                        <span className="rounded-full bg-black px-4 py-2 text-sm text-white">
                          {review.rating || 5}/5
                        </span>
                      </div>

                      <div className="mt-7 rounded-[24px] bg-[#F7F5F2] p-6 text-lg leading-relaxed">
                        {review.review || "Sin comentario"}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-4 text-sm">
                        {clinicSlug && <Link href={`/clinics/${clinicSlug}`} target="_blank" className="underline">Ver clinica publica</Link>}
                        {specialistSlug && <Link href={`/especialistas/${specialistSlug}`} target="_blank" className="underline">Ver especialista</Link>}
                        {treatmentSlug && <Link href={`/tratamientos/${treatmentSlug}`} target="_blank" className="underline">Ver tratamiento</Link>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-start gap-3 xl:w-[360px] xl:justify-end">
                      <form action={approveReview}>
                        <input type="hidden" name="reviewId" value={review.id} />
                        <button
                          disabled={!verifiedBooking}
                          className="rounded-full bg-emerald-600 px-5 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          Aprobar
                        </button>
                      </form>
                      <form action={rejectReview}>
                        <input type="hidden" name="reviewId" value={review.id} />
                        <button className="rounded-full bg-red-600 px-5 py-3 text-sm text-white">Rechazar</button>
                      </form>
                      <form action={toggleFeaturedReview}>
                        <input type="hidden" name="reviewId" value={review.id} />
                        <input type="hidden" name="featured" value={String(Boolean(review.featured))} />
                        <button
                          disabled={!review.featured && review.status !== "Aprobada"}
                          className="rounded-full bg-black px-5 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          {review.featured ? "Quitar destacada" : "Destacar"}
                        </button>
                      </form>
                      <form action={deleteReview}>
                        <input type="hidden" name="reviewId" value={review.id} />
                        <button className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm">Eliminar</button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AdminShell>
  );
}
