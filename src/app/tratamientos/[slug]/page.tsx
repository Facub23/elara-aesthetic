import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { Navbar } from "@/components/layout/navbar";
import { filterPublicRecords, isPublicPlaceholderRecord } from "@/lib/public-records";
import { supabase } from "@/lib/supabase";
import { buildReviewSummaryMap, normalizeReviewKey } from "@/lib/review-summary";
import {
  getTreatmentName as readTreatmentName,
  getTreatmentPriceValue,
} from "@/lib/treatment-utils";

export const revalidate = 300;

type TreatmentOption =
  | string
  | {
      name?: string | null;
      price?: string | number | null;
      description?: string | null;
      category?: string | null;
    };

type SpecialistRow = {
  id?: string | number | null;
  name?: string | null;
  slug?: string | null;
  clinic_id?: string | number | null;
  clinic_name?: string | null;
  consultation_address?: string | null;
  specialty?: string | null;
  bio?: string | null;
  image?: string | null;
  rating?: string | number | null;
  reviews_count?: string | number | null;
  treatments?: TreatmentOption[] | null;
};

type ClinicRow = {
  id?: string | number | null;
  name?: string | null;
  slug?: string | null;
  city?: string | null;
  country?: string | null;
  location?: string | null;
  image?: string | null;
  heroImage?: string | null;
  rating?: string | number | null;
  description?: string | null;
};

type TreatmentRecord = {
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  image?: string | null;
  price?: string | number | null;
  category?: string | null;
};

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

function formatText(value: string) {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getTreatmentName(treatment: TreatmentOption) {
  return readTreatmentName(treatment);
}

function getTreatmentPrice(treatment?: TreatmentOption | TreatmentRecord | null) {
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

function getClinicLocation(clinic: ClinicRow) {
  return clinic.location || [clinic.city, clinic.country].filter(Boolean).join(", ");
}

function findSpecialistTreatment(specialist: SpecialistRow, treatmentSlug: string) {
  return specialist.treatments?.find(
    (treatment) => slugify(getTreatmentName(treatment)) === treatmentSlug
  );
}

function getFallbackDescription(treatmentName: string) {
  return `${treatmentName} es un tratamiento de medicina estetica que puedes comparar en EncuentraTuClinica por clinica, ciudad, especialista y disponibilidad.`;
}

export async function generateStaticParams() {
  const { data: specialists } = await supabase
    .from("specialists")
    .select("name,slug,clinic_name,treatments");

  const params = new Map<string, { slug: string }>();

  filterPublicRecords(specialists || []).forEach((specialist: { treatments?: TreatmentOption[] | null }) => {
    if (!Array.isArray(specialist.treatments)) {
      return;
    }

    specialist.treatments.forEach((treatment) => {
      const name = getTreatmentName(treatment);

      if (name) {
        params.set(slugify(name), { slug: slugify(name) });
      }
    });
  });

  return Array.from(params.values());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;
  const { data: treatmentRecords } = await supabase
    .from("treatments")
    .select("name,slug");
  const treatmentRecord = treatmentRecords?.find(
    (treatment) => treatment.slug === slug || slugify(treatment.name || "") === slug
  );
  const treatmentName = treatmentRecord?.name || formatText(slug);

  return {
    title: `${treatmentName} | Compara clinicas y especialistas`,
    description: `Compara clinicas verificadas y especialistas premium para ${treatmentName}. Reserva en EncuentraTuClinica con disponibilidad real.`,
    openGraph: {
      title: `${treatmentName} | Compara clinicas y especialistas`,
      description: `Clinicas, especialistas y disponibilidad para ${treatmentName}.`,
    },
  };
}

export default async function TreatmentPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;
  const fallbackTreatmentName = formatText(slug);

  const [
    { data: specialists },
    { data: clinics },
    { data: treatmentRecords },
    { data: durationRows },
    { data: approvedReviews },
  ] = await Promise.all([
    supabase.from("specialists").select("*"),
    supabase.from("clinics").select("*"),
    supabase.from("treatments").select("*"),
    supabase
      .from("treatment_durations")
      .select("treatment_name,duration_minutes"),
    supabase
      .from("reviews")
      .select("*")
      .eq("status", "Aprobada")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const allSpecialists = filterPublicRecords((specialists || []) as SpecialistRow[]).filter(
    (specialist) => findSpecialistTreatment(specialist, slug)
  );

  const allClinics = filterPublicRecords((clinics || []) as ClinicRow[]);
  const clinicsById = new Map(
    allClinics.filter((clinic) => clinic.id).map((clinic) => [String(clinic.id), clinic])
  );
  const clinicsByName = new Map(
    allClinics.filter((clinic) => clinic.name).map((clinic) => [normalize(clinic.name), clinic])
  );
  const treatmentRecord = filterPublicRecords(
    (treatmentRecords || []) as TreatmentRecord[]
  ).find((treatment) => treatment.slug === slug || slugify(treatment.name || "") === slug);

  if (treatmentRecord && isPublicPlaceholderRecord(treatmentRecord)) {
    notFound();
  }
  const matchedSpecialistTreatment = allSpecialists
    .map((specialist) => findSpecialistTreatment(specialist, slug))
    .find(Boolean);
  const treatmentName =
    treatmentRecord?.name ||
    (matchedSpecialistTreatment
      ? getTreatmentName(matchedSpecialistTreatment)
      : fallbackTreatmentName);

  const clinicsForTreatment = Array.from(
    new Map(
      allSpecialists
        .map((specialist) => {
          const clinic =
            (specialist.clinic_id && clinicsById.get(String(specialist.clinic_id))) ||
            clinicsByName.get(normalize(specialist.clinic_name));

          return clinic ? [String(clinic.id || clinic.slug || clinic.name), clinic] : null;
        })
        .filter(Boolean) as [string, ClinicRow][]
    ).values()
  );

  if (allSpecialists.length === 0 && clinicsForTreatment.length === 0) {
    notFound();
  }

  const cityNames = Array.from(
    new Set([
      ...clinicsForTreatment.map((clinic) => clinic.city).filter(Boolean),
      ...allSpecialists
        .filter((specialist) => !specialist.clinic_name && !specialist.clinic_id)
        .map((specialist) =>
          specialist.consultation_address?.split(",").at(-1)?.trim()
        )
        .filter(Boolean),
    ])
  ) as string[];
  const prices = [
    getTreatmentPrice(treatmentRecord),
    ...allSpecialists
      .map((specialist) => getTreatmentPrice(findSpecialistTreatment(specialist, slug)))
      .filter(Boolean),
  ] as number[];
  const priceFrom = prices.length > 0 ? Math.min(...prices) : undefined;
  const formattedPrice = formatPrice(priceFrom);
  const duration =
    durationRows?.find((row) => slugify(row.treatment_name || "") === slug)
      ?.duration_minutes || 60;
  const description =
    treatmentRecord?.description || getFallbackDescription(treatmentName);
  const featuredSpecialists = allSpecialists.slice(0, 3);
  const featuredClinics = clinicsForTreatment.slice(0, 3);
  const publicApprovedReviews = filterPublicRecords(approvedReviews || []);
  const treatmentReviews = publicApprovedReviews.filter(
    (review) => slugify(review.treatment || "") === slug
  );
  const treatmentRating =
    treatmentReviews.length > 0
      ? (
          treatmentReviews.reduce(
            (sum, review) => sum + Number(review.rating || 0),
            0
          ) / treatmentReviews.length
        ).toFixed(1)
      : null;
  const specialistReviewSummaries = buildReviewSummaryMap(
    publicApprovedReviews,
    "specialist_name"
  );
  const clinicReviewSummaries = buildReviewSummaryMap(
    publicApprovedReviews,
    "clinic_name"
  );

  const stats = [
    ["Clinicas", clinicsForTreatment.length],
    ["Especialistas", allSpecialists.length],
    ["Ciudades", cityNames.length],
    ["Duracion", `${duration} min`],
  ];
  const marketplaceChecks = [
    "Compara clinicas verificadas antes de elegir.",
    "Elige especialista por perfil, reviews y disponibilidad.",
    "Reserva el tratamiento sin perder el contexto de precio y ciudad.",
  ];

  return (
    <main className="min-h-screen bg-[#F6F3EE] text-black">
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalProcedure",
            name: treatmentName,
            procedureType: "AestheticMedicine",
            description,
            provider: {
              "@type": "Organization",
              name: "EncuentraTuClinica",
            },
          }),
        }}
      />

      <section className="border-b border-black/10 px-6 pb-12 pt-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <Link
              href="/tratamientos"
              className="text-sm font-medium text-neutral-500 underline underline-offset-4"
            >
              Volver a tratamientos
            </Link>

            <p className="mt-8 text-xs font-medium uppercase tracking-[0.28em] text-neutral-500">
              Comparador de tratamiento
            </p>

            <h1 className="mt-5 text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-7xl">
              {treatmentName}
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-neutral-600 md:text-xl">
              {description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/especialistas?treatment=${encodeURIComponent(treatmentName)}`}
                className="rounded-md bg-black px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Elegir especialista
              </Link>

              <Link
                href={`/clinics?treatment=${encodeURIComponent(treatmentName)}`}
                className="rounded-md border border-black/10 bg-white px-6 py-3 text-sm font-medium transition hover:border-black"
              >
                Comparar clinicas
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-white/90 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
            <div className="grid grid-cols-2 gap-3">
              {stats.map(([label, value]) => (
                <div key={label} className="rounded-md bg-[#F8F6F2] p-4">
                  <div className="text-2xl font-semibold">{value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {formattedPrice && (
              <div className="mt-3 rounded-md bg-black p-4 text-white">
                <div className="text-xs uppercase tracking-[0.18em] text-white/50">
                  Precio desde
                </div>
                <div className="mt-1 text-3xl font-semibold">{formattedPrice}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {marketplaceChecks.map((check, index) => (
            <article
              key={check}
              className="rounded-lg border border-black/10 bg-white p-5 shadow-[0_12px_45px_rgba(0,0,0,0.04)]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm text-white">
                {index + 1}
              </div>
              <p className="mt-4 text-sm font-medium leading-6">{check}</p>
            </article>
          ))}
        </div>
      </section>

      {cityNames.length > 0 && (
        <section className="px-6 py-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
              Disponible por ciudad
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {cityNames.map((city) => (
                <Link
                  key={city}
                  href={`/${slugify(city)}/${slug}`}
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm transition hover:border-black"
                >
                  {treatmentName} en {city}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-6 pb-20 pt-4">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-black/10 bg-white p-7 shadow-[0_12px_45px_rgba(0,0,0,0.04)]">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
              Opciones destacadas
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Especialistas para reservar {treatmentName}
            </h2>

            <div className="mt-6 grid gap-3">
              {featuredSpecialists.map((specialist) => {
                const clinic =
                  (specialist.clinic_id && clinicsById.get(String(specialist.clinic_id))) ||
                  clinicsByName.get(normalize(specialist.clinic_name));
                const isIndependent = !clinic?.name && !specialist.clinic_name;

                return (
                  <Link
                    key={String(specialist.id || specialist.slug)}
                    href={`/especialistas/${specialist.slug}?treatment=${encodeURIComponent(
                      treatmentName
                    )}`}
                    className="flex items-center justify-between gap-4 rounded-md bg-[#F8F6F2] p-4 transition hover:bg-black hover:text-white"
                  >
                    <div>
                      <div className="font-semibold">{specialist.name}</div>
                      <div className="mt-1 text-sm opacity-70">
                        {clinic?.name ||
                          specialist.clinic_name ||
                          "Consulta independiente"}
                      </div>
                      {isIndependent && specialist.consultation_address ? (
                        <div className="mt-1 text-xs opacity-60">
                          {specialist.consultation_address}
                        </div>
                      ) : null}
                    </div>

                    <span className="text-sm font-medium">Reservar este tratamiento</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-black p-7 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-white/50">
              Donde comparar
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Clinicas con {treatmentName}
            </h2>

            <div className="mt-6 grid gap-3">
              {featuredClinics.map((clinic) => {
                const clinicSpecialists = allSpecialists.filter((specialist) => {
                  const sameId =
                    clinic.id &&
                    specialist.clinic_id &&
                    String(clinic.id) === String(specialist.clinic_id);
                  const sameName = normalize(clinic.name) === normalize(specialist.clinic_name);

                  return sameId || sameName;
                });

                return (
                  <Link
                    key={String(clinic.id || clinic.slug)}
                    href={`/clinics/${clinic.slug}`}
                    className="rounded-md bg-white/10 p-4 transition hover:bg-white hover:text-black"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold">{clinic.name}</div>
                        <div className="mt-1 text-sm opacity-70">
                          {getClinicLocation(clinic)}
                        </div>
                      </div>

                      <div className="text-sm font-medium">
                        {clinicSpecialists.length} especialista
                        {clinicSpecialists.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-black/10 bg-white p-7 shadow-[0_12px_45px_rgba(0,0,0,0.04)]">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
              Criterios clinicos
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Que revisar antes de reservar {treatmentName}
            </h2>

            <div className="mt-6 space-y-4 text-sm leading-6 text-neutral-600">
              <p>
                Compara especialistas por experiencia, clinica, ciudad y
                valoraciones antes de reservar.
              </p>

              <p>
                EncuentraTuClinica prioriza centros verificados y disponibilidad real para
                que el siguiente paso sea elegir horario, no pedir informacion.
              </p>
            </div>

            <div className="mt-7 grid gap-3">
              {[
                "Revisa especialista y clinica",
                "Elige ciudad y disponibilidad",
                "Confirma tu cita desde EncuentraTuClinica",
              ].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-md bg-[#F8F6F2] p-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs text-white">
                    {index + 1}
                  </div>
                  <div className="text-sm font-medium">{step}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-black/10 bg-white">
            <Image
              src={
                treatmentRecord?.image ||
                "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?q=80&w=1600&auto=format&fit=crop"
              }
              alt={treatmentName}
              fill
              sizes="(max-width: 1024px) 100vw, 52vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {treatmentReviews.length > 0 && (
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                  Opiniones verificadas
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                  Experiencias con {treatmentName}
                </h2>
              </div>
              <div className="rounded-full bg-black px-5 py-3 text-sm text-white">
                {treatmentRating}/5 - {treatmentReviews.length} reservas verificadas
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {treatmentReviews.slice(0, 6).map((review) => (
                <article key={review.id} className="rounded-lg border border-black/10 bg-white p-6">
                  <div className="flex items-center justify-between gap-4">
                    <span className="rounded-full bg-black px-3 py-1 text-sm text-white">
                      Reserva verificada
                    </span>
                    <span className="font-semibold">{review.rating || 5}/5</span>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-neutral-700">
                    {review.review}
                  </p>
                  <div className="mt-5 border-t border-black/5 pt-4 text-sm">
                    <div className="font-medium">
                      {review.patient_name || "Paciente verificado"}
                    </div>
                    <div className="mt-1 text-neutral-500">
                      {review.clinic_name}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                Especialistas
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Elige profesional para {treatmentName}
              </h2>
            </div>

            <Link
              href={`/especialistas?treatment=${encodeURIComponent(treatmentName)}`}
              className="text-sm font-medium underline underline-offset-4"
            >
              Ver todos
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {allSpecialists.map((specialist) => {
              const specialistTreatment = findSpecialistTreatment(specialist, slug);
              const price = formatPrice(getTreatmentPrice(specialistTreatment) || priceFrom);
              const clinic =
                (specialist.clinic_id && clinicsById.get(String(specialist.clinic_id))) ||
                clinicsByName.get(normalize(specialist.clinic_name));
              const isIndependent = !clinic?.name && !specialist.clinic_name;
              const reviewSummary = specialistReviewSummaries.get(
                normalizeReviewKey(specialist.name)
              );

              return (
                <article
                  key={String(specialist.id || specialist.slug)}
                  className="flex min-h-[390px] flex-col rounded-lg border border-black/10 bg-white p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={specialist.image || "/og-image.jpg"}
                        alt={specialist.name || "Especialista EncuentraTuClinica"}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold">{specialist.name}</h3>
                      <p className="mt-1 text-sm text-neutral-500">{specialist.specialty}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-[#F8F6F2] p-3">
                      <div className="text-lg font-semibold">
                        {reviewSummary?.rating || "-"}
                      </div>
                      <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                        Rating
                      </div>
                    </div>
                    <div className="rounded-md bg-[#F8F6F2] p-3">
                      <div className="text-lg font-semibold">
                        {reviewSummary?.count || 0}
                      </div>
                      <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                        Reviews
                      </div>
                    </div>
                  </div>

                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-neutral-600">
                    {specialist.bio ||
                      `${specialist.name || "Especialista"} realiza ${treatmentName} dentro de EncuentraTuClinica.`}
                  </p>

                  <div className="mt-5 rounded-md bg-[#F8F6F2] p-3 text-sm text-neutral-600">
                    <div className="font-medium text-black">
                      {clinic?.name ||
                        specialist.clinic_name ||
                        "Consulta independiente"}
                    </div>
                    <div className="mt-1">
                      {clinic
                        ? getClinicLocation(clinic)
                        : specialist.consultation_address || "Direccion a confirmar"}
                    </div>
                  </div>

                  {price && (
                    <div className="mt-4 text-sm text-neutral-500">
                      Desde <span className="font-semibold text-black">{price}</span>
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap gap-3 pt-7">
                    <Link
                      href={`/especialistas/${specialist.slug}?treatment=${encodeURIComponent(
                        treatmentName
                      )}`}
                      className="rounded-md bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Reservar este tratamiento
                    </Link>

                    {clinic?.slug ? (
                      <Link
                        href={`/clinics/${clinic.slug}`}
                        className="rounded-md border border-black/10 px-5 py-3 text-sm font-medium transition hover:border-black"
                      >
                        Ver clinica
                      </Link>
                    ) : isIndependent ? (
                      <span className="rounded-md border border-black/10 bg-[#F8F6F2] px-5 py-3 text-sm font-medium text-neutral-600">
                        Consulta independiente
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                Clinicas verificadas
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Donde hacer {treatmentName}
              </h2>
            </div>

            <Link
              href={`/clinics?treatment=${encodeURIComponent(treatmentName)}`}
              className="text-sm font-medium underline underline-offset-4"
            >
              Ver todas las clinicas
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {clinicsForTreatment.map((clinic) => {
              const reviewSummary = clinicReviewSummaries.get(
                normalizeReviewKey(clinic.name)
              );
              const clinicSpecialists = allSpecialists.filter((specialist) => {
                const sameId =
                  clinic.id &&
                  specialist.clinic_id &&
                  String(clinic.id) === String(specialist.clinic_id);
                const sameName = normalize(clinic.name) === normalize(specialist.clinic_name);

                return sameId || sameName;
              });
              const primarySpecialist = clinicSpecialists[0];

              return (
                <article
                  key={String(clinic.id || clinic.slug)}
                  className="group overflow-hidden rounded-lg border border-black/10 bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(0,0,0,0.08)]"
                >
                  <Link
                    href={`/clinics/${clinic.slug}`}
                    className="relative block h-56 overflow-hidden"
                  >
                    <Image
                      src={clinic.heroImage || clinic.image || "/og-image.jpg"}
                      alt={clinic.name || "Clinica EncuentraTuClinica"}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </Link>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-semibold">{clinic.name}</h3>
                        <p className="mt-2 text-sm text-neutral-500">
                          {getClinicLocation(clinic)}
                        </p>
                      </div>

                      <div className="rounded-full bg-black px-3 py-1 text-sm text-white">
                        {reviewSummary
                          ? `${reviewSummary.rating} - ${reviewSummary.count}`
                          : "Sin opiniones"}
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-neutral-600">
                      {clinic.description ||
                        `${clinic.name || "Clinica"} ofrece ${treatmentName} con especialistas verificados.`}
                    </p>

                    <div className="mt-5 rounded-md bg-[#F8F6F2] p-3 text-sm">
                      {clinicSpecialists.length} especialista
                      {clinicSpecialists.length === 1 ? "" : "s"} para este tratamiento
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {primarySpecialist?.slug && (
                        <Link
                          href={`/especialistas/${primarySpecialist.slug}?treatment=${encodeURIComponent(
                            treatmentName
                          )}`}
                          className="rounded-md bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                        >
                          Reservar este tratamiento
                        </Link>
                      )}

                      <Link
                        href={`/clinics/${clinic.slug}`}
                        className="rounded-md border border-black/10 px-5 py-3 text-sm font-medium transition hover:border-black"
                      >
                        Ver clinica
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
