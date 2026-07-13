import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { findNextAvailableSlot } from "@/lib/next-available-slot";
import {
  filterPublicRecords,
  isPublicPlaceholderRecord,
} from "@/lib/public-records";
import {
  getTreatmentName as readTreatmentName,
  getTreatmentPriceValue,
} from "@/lib/treatment-utils";

import FavoriteSpecialistButton from "@/components/FavoriteSpecialistButton";
import { Navbar } from "@/components/layout/navbar";
import SpecialistBookingButton from "@/components/SpecialistBookingButton";

type TreatmentOption =
  | string
  | {
      name?: string | null;
      price?: string | number | null;
      description?: string | null;
    };

type AvailabilityRow = {
  weekday?: number | string | null;
  day_of_week?: number | string | null;
  start_time?: string | null;
  end_time?: string | null;
  break_start_time?: string | null;
  break_end_time?: string | null;
  active?: boolean | null;
  is_active?: boolean | null;
};

const weekdayLabels = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function normalize(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function slugify(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getTreatmentName(treatment: TreatmentOption) {
  return readTreatmentName(treatment) || "Tratamiento";
}

function getTreatmentPrice(treatment: TreatmentOption) {
  return getTreatmentPriceValue(treatment) || undefined;
}

function formatPrice(value?: number) {
  if (!value) {
    return null;
  }

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function isActiveAvailability(item: AvailabilityRow) {
  if (item.is_active === false || item.active === false) {
    return false;
  }

  return item.is_active ?? item.active ?? true;
}

function getAvailabilityWeekday(item: AvailabilityRow) {
  const value = item.day_of_week ?? item.weekday;

  if (typeof value === "number") {
    return value;
  }

  const normalized = normalize(String(value || ""));
  const weekdays: Record<string, number> = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
  };

  return weekdays[normalized] ?? Number(value);
}

function getClinicLocation(clinic: any) {
  return clinic?.location || [clinic?.city, clinic?.country].filter(Boolean).join(", ");
}

function formatSlotLabel(date: string, time: string) {
  const parsed = new Date(`${date}T00:00:00`);
  const label = parsed.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return `${label} - ${time}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  const { data: specialist } = await supabase
    .from("specialists")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!specialist || isPublicPlaceholderRecord(specialist)) {
    return {
      title: "Especialista no encontrado",
    };
  }

  const title = `${specialist.name} | Reserva medicina estetica`;
  const description =
    specialist.bio ||
    `Compara tratamientos y reserva cita con ${specialist.name} dentro de EncuentraTuClinica.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: specialist.image || "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: specialist.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [specialist.image || "/og-image.jpg"],
    },
  };
}

export async function generateStaticParams() {
  const { data: specialists } = await supabase.from("specialists").select("slug");

  return (
    specialists?.map((specialist: { slug: string }) => ({
      slug: specialist.slug,
    })) || []
  );
}

export default async function SpecialistDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    treatment?: string;
    date?: string;
    time?: string;
  }>;
}) {
  const { slug } = await params;
  const {
    treatment: initialTreatment,
    date: initialDate,
    time: initialTime,
  } = await searchParams;

  const { data: specialist } = await supabase
    .from("specialists")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!specialist || isPublicPlaceholderRecord(specialist)) {
    notFound();
  }

  const clinicQuery = supabase.from("clinics").select("*");
  const { data: clinic } = specialist.clinic_id
    ? await clinicQuery.eq("id", specialist.clinic_id).maybeSingle()
    : specialist.clinic_name
      ? await clinicQuery.eq("name", specialist.clinic_name).maybeSingle()
      : { data: null };

  const [{ data: reviews }, { data: availabilityRows }] = await Promise.all([
    supabase
      .from("reviews")
      .select("*")
      .eq("specialist_name", specialist.name)
      .eq("status", "Aprobada")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("specialist_availability")
      .select("*")
      .eq("specialist_name", specialist.name),
  ]);

  const isIndependent = !clinic?.name && !specialist.clinic_name;
  const clinicName = clinic?.name || specialist.clinic_name || "Consulta independiente";
  const clinicSlug =
    clinic?.slug || specialist.clinic_name?.toLowerCase().replaceAll(" ", "-") || "";
  const clinicLocation =
    getClinicLocation(clinic) || specialist.consultation_address || "";
  const specialistImage = specialist.image || "/og-image.jpg";
  const treatments = Array.isArray(specialist.treatments)
    ? (specialist.treatments as TreatmentOption[])
    : [];
  const availability = ((availabilityRows || []) as AvailabilityRow[])
    .filter(isActiveAvailability)
    .sort((a, b) => getAvailabilityWeekday(a) - getAvailabilityWeekday(b));
  const activeDays = new Set(availability.map(getAvailabilityWeekday)).size;
  const prices = treatments.map(getTreatmentPrice).filter(Boolean) as number[];
  const priceFrom = prices.length > 0 ? Math.min(...prices) : undefined;
  const publicReviews = filterPublicRecords(reviews || []);
  const reviewCount = publicReviews.length;
  const approvedReviewRating =
    reviewCount > 0
      ? (
          publicReviews.reduce(
            (sum, review) => sum + Number(review.rating || 0),
            0
          ) / reviewCount
        ).toFixed(1)
      : null;
  const displayedRating = approvedReviewRating || specialist.rating || "5.0";
  const selectedTreatmentName = initialTreatment || getTreatmentName(treatments[0]);
  const selectedTreatment = treatments.find(
    (treatment) => normalize(getTreatmentName(treatment)) === normalize(selectedTreatmentName)
  );
  const selectedTreatmentPrice = getTreatmentPrice(selectedTreatment || treatments[0]);
  const formattedPrice = formatPrice(selectedTreatmentPrice || priceFrom);
  const nextSlot =
    initialDate && initialTime
      ? {
          date: initialDate,
          time: initialTime,
          duration: 0,
        }
      : await findNextAvailableSlot({
          specialistName: specialist.name,
          treatment: initialTreatment,
        });
  const decisionHighlights = [
    {
      title: "Perfil conectado",
      text: isIndependent
        ? `Consulta tratamientos, direccion de atencion y horarios activos de ${specialist.name} antes de reservar.`
        : `Compara a ${specialist.name} con su clinica, tratamientos y horarios activos antes de reservar.`,
    },
    {
      title: "Precio antes de reservar",
      text: formattedPrice
        ? `El tratamiento seleccionado parte desde ${formattedPrice}.`
        : "El precio se confirma con la clinica antes de la cita.",
    },
    {
      title: "Disponibilidad real",
      text: nextSlot
        ? `Proximo hueco sugerido: ${formatSlotLabel(nextSlot.date, nextSlot.time)}.`
        : "Si no hay huecos proximos, puedes revisar otros especialistas o volver mas tarde.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#F6F3EE] text-black">
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Physician",
            name: specialist.name,
            description: specialist.bio,
            medicalSpecialty: specialist.specialty || "AestheticMedicine",
            image: specialistImage,
            ...(isIndependent
              ? {
                  address: specialist.consultation_address,
                }
              : {
                  worksFor: {
                    "@type": "MedicalBusiness",
                    name: clinicName,
                  },
                }),
            ...(reviewCount > 0
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: displayedRating,
                    reviewCount,
                  },
                }
              : {}),
          }),
        }}
      />

      <section className="border-b border-black/10 px-6 pb-12 pt-28">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/especialistas"
            className="text-sm font-medium text-neutral-500 underline underline-offset-4"
          >
            Volver a especialistas
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_18px_55px_rgba(0,0,0,0.06)]">
              <div className="relative h-[520px]">
                <Image
                  src={specialistImage}
                  alt={specialist.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500 sm:text-xs sm:tracking-[0.28em]">
                Perfil verificado EncuentraTuClinica
              </p>

              <h1 className="mt-5 text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-7xl">
                {specialist.name}
              </h1>

              <p className="mt-4 text-lg text-neutral-500">
                {specialist.specialty || "Medicina estetica"} - {clinicName}
              </p>

              {clinicLocation ? (
                <div className="mt-4 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-600">
                  <span className="font-medium text-black">
                    {isIndependent ? "Direccion de atencion" : "Ubicacion"}
                  </span>
                  <span>{clinicLocation}</span>
                </div>
              ) : null}

              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-neutral-600">
                {specialist.bio ||
                  `${specialist.name} atiende tratamientos premium dentro de EncuentraTuClinica.`}
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-4">
                {[
                  ["Rating", displayedRating],
                  ["Reviews", reviewCount],
                  ["Tratamientos", treatments.length],
                  ["Horario", activeDays > 0 ? `${activeDays} dias` : "Por definir"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-black/10 bg-white p-4">
                    <div className="text-2xl font-semibold">{value}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-md bg-black p-4 text-white">
                <div className="text-xs uppercase tracking-[0.16em] text-white/50">
                  Proximo hueco
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {nextSlot
                    ? formatSlotLabel(nextSlot.date, nextSlot.time)
                    : "Sin huecos proximos"}
                </div>
              </div>

              <div className="mt-4 grid gap-3 rounded-lg border border-black/10 bg-white/90 p-3 shadow-[0_12px_45px_rgba(0,0,0,0.04)] sm:grid-cols-2">
                <div className="rounded-md bg-[#F8F6F2] p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Tratamiento seleccionado
                  </div>
                  <div className="mt-2 text-lg font-semibold">
                    {selectedTreatmentName || "Elige tratamiento"}
                  </div>
                </div>

                <div className="rounded-md bg-[#F8F6F2] p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Precio orientativo
                  </div>
                  <div className="mt-2 text-lg font-semibold">
                    {formattedPrice ? `Desde ${formattedPrice}` : "A confirmar"}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <SpecialistBookingButton
                  clinicName={clinicName}
                  specialistName={specialist.name}
                  treatments={treatments}
                  initialTreatment={initialTreatment}
                  initialDate={nextSlot?.date}
                  initialTime={nextSlot?.time}
                  bookingSource="specialist_profile"
                />

                {clinicSlug ? (
                  <Link
                    href={`/clinics/${clinicSlug}`}
                    className="rounded-md border border-black/10 bg-white px-6 py-4 text-sm font-medium transition hover:border-black"
                  >
                    Ver clinica y tratamientos
                  </Link>
                ) : isIndependent ? (
                  <span className="rounded-md border border-black/10 bg-white px-6 py-4 text-sm font-medium text-neutral-600">
                    Atiende en consulta independiente
                  </span>
                ) : null}

                <FavoriteSpecialistButton specialistId={String(specialist.id)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {decisionHighlights.map((item) => (
            <article
              key={item.title}
              className="rounded-lg border border-black/10 bg-white p-5 shadow-[0_12px_45px_rgba(0,0,0,0.04)]"
            >
              <h2 className="text-sm font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-black/10 bg-white p-6 shadow-[0_12px_45px_rgba(0,0,0,0.04)]">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
              Disponibilidad
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Horarios activos
            </h2>

            {isIndependent && clinicLocation ? (
              <div className="mt-5 rounded-md border border-black/10 bg-[#F8F6F2] p-4 text-sm leading-6 text-neutral-700">
                <span className="font-semibold text-black">Direccion de atencion:</span>{" "}
                {clinicLocation}
              </div>
            ) : null}

            {availability.length === 0 ? (
              <div className="mt-6 rounded-md bg-[#F8F6F2] p-4 text-sm text-neutral-600">
                Este especialista todavia no tiene horario publico activo.
              </div>
            ) : (
              <div className="mt-6 grid gap-3">
                {availability.map((item, index) => {
                  const weekday = getAvailabilityWeekday(item);
                  const breakText =
                    item.break_start_time && item.break_end_time
                      ? `Descanso ${item.break_start_time.slice(0, 5)}-${item.break_end_time.slice(0, 5)}`
                      : "Sin descanso configurado";

                  return (
                    <div
                      key={`${weekday}-${index}`}
                      className="flex items-center justify-between gap-4 rounded-md bg-[#F8F6F2] p-4"
                    >
                      <div>
                        <div className="font-semibold">
                          {weekdayLabels[weekday] || "Dia"}
                        </div>
                        <div className="mt-1 text-sm text-neutral-500">{breakText}</div>
                      </div>

                      <div className="text-right text-sm font-medium">
                        {item.start_time?.slice(0, 5)}-{item.end_time?.slice(0, 5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-black/10 bg-white p-6 shadow-[0_12px_45px_rgba(0,0,0,0.04)]">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                  Tratamientos
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  Que puedes reservar
                </h2>
              </div>

              {formattedPrice && (
                <div className="rounded-md bg-black px-4 py-3 text-sm text-white">
                  Desde <span className="font-semibold">{formattedPrice}</span>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-3">
              {treatments.length === 0 ? (
                <div className="rounded-md bg-[#F8F6F2] p-4 text-sm text-neutral-600">
                  Todavia no hay tratamientos configurados para este especialista.
                </div>
              ) : (
                treatments.map((treatment) => {
                  const name = getTreatmentName(treatment);
                  const price = formatPrice(getTreatmentPrice(treatment));

                  return (
                    <article
                      key={name}
                      className="rounded-md bg-[#F8F6F2] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link
                            href={`/tratamientos/${slugify(name)}`}
                            className="font-semibold underline-offset-4 hover:underline"
                          >
                            {name}
                          </Link>
                          {typeof treatment !== "string" && treatment.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
                              {treatment.description}
                            </p>
                          )}
                        </div>

                        {price && <div className="text-sm font-semibold">{price}</div>}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href={`/especialistas/${specialist.slug}?treatment=${encodeURIComponent(
                            name
                          )}`}
                          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                        >
                          Reservar este tratamiento
                        </Link>

                        <Link
                          href={`/tratamientos/${slugify(name)}`}
                          className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium transition hover:border-black"
                        >
                          Ver tratamiento
                        </Link>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                Opiniones verificadas
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Opiniones de pacientes
              </h2>
              {reviewCount > 0 && (
                <p className="mt-3 text-neutral-500">
                  {displayedRating}/5 basado en {reviewCount} reservas
                  verificadas.
                </p>
              )}
            </div>
          </div>

          {publicReviews.length === 0 ? (
            <div className="rounded-lg border border-black/10 bg-white p-8 text-neutral-500 shadow-[0_12px_45px_rgba(0,0,0,0.04)]">
              Este especialista todavia no tiene reviews verificadas.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {publicReviews.map((review) => (
                <article key={review.id} className="rounded-lg border border-black/10 bg-white p-6 shadow-[0_12px_45px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center justify-between gap-4">
                    <div className="rounded-full bg-black px-3 py-1 text-sm text-white">
                      Verificada
                    </div>
                    {review.featured && (
                      <div className="rounded-full bg-[#F8F6F2] px-3 py-1 text-sm">
                        Destacada
                      </div>
                    )}
                  </div>

                  <div className="mt-5 text-xl font-semibold">
                    {review.rating || 5}/5
                  </div>

                  <p className="mt-4 text-sm leading-6 text-neutral-700">
                    &ldquo;{review.review}&rdquo;
                  </p>

                  <div className="mt-5 border-t border-black/10 pt-5">
                    <div className="font-semibold">{review.patient_name}</div>
                    <div className="mt-1 text-sm text-neutral-500">{review.treatment}</div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
