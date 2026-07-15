import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { Navbar } from "@/components/layout/navbar";
import { getAddressCities, getLocationSummary } from "@/lib/location-utils";
import { filterPublicRecords, isPublicPlaceholderRecord } from "@/lib/public-records";
import { supabase } from "@/lib/supabase";
import { buildReviewSummaryMap, normalizeReviewKey } from "@/lib/review-summary";
import {
  getTreatmentDurationValue,
  getTreatmentName as readTreatmentName,
  getTreatmentPriceValue,
} from "@/lib/treatment-utils";

export const revalidate = 300;

type TreatmentOption =
  | string
  | {
      name?: string | null;
      price?: string | number | null;
      duration_minutes?: string | number | null;
      durationMinutes?: string | number | null;
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

function buildSpecialistHref({
  slug,
  treatment,
  slot,
}: {
  slug?: string | null;
  treatment?: string | null;
  slot?: { date: string; time: string } | null;
}) {
  if (!slug) return "";

  const params = new URLSearchParams();

  if (treatment) params.set("treatment", treatment);
  if (slot) {
    params.set("date", slot.date);
    params.set("time", slot.time);
  }

  const query = params.toString();

  return `/especialistas/${slug}${query ? `?${query}` : ""}`;
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

function getSpecialistTreatmentDuration(treatment?: TreatmentOption | null) {
  return getTreatmentDurationValue(treatment) || undefined;
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

function formatDuration(value?: number | null) {
  return value ? `${value} min` : "Duracion a confirmar";
}

function getClinicLocation(clinic: ClinicRow) {
  return getLocationSummary({
    location: clinic.location,
    city: clinic.city,
    country: clinic.country,
  });
}

function findSpecialistTreatment(specialist: SpecialistRow, treatmentSlug: string) {
  return specialist.treatments?.find(
    (treatment) => slugify(getTreatmentName(treatment)) === treatmentSlug
  );
}

function getFallbackDescription(treatmentName: string) {
  return `${treatmentName} es un tratamiento de medicina estetica que puedes comparar en EncuentraTuClinica por clinica, ciudad, especialista y disponibilidad.`;
}

function getTreatmentLandingContent(slug: string, treatmentName: string) {
  const normalized = normalize(`${slug} ${treatmentName}`);
  const base = {
    heroImage: "/og-image.jpg",
    gallery: [] as string[],
    intro:
      "Una guia pensada para entender el tratamiento, comparar opciones y elegir profesional con mas contexto antes de reservar.",
    idealFor: [
      "Personas que quieren comparar opciones antes de decidir.",
      "Pacientes que valoran ver especialista, lugar de atencion y precio orientativo.",
      "Reservas donde la disponibilidad real importa tanto como la ficha del tratamiento.",
    ],
    expectations: [
      "Consulta inicial para valorar objetivo, historial y expectativas.",
      "Recomendacion personalizada segun zona, tecnica y experiencia del especialista.",
      "Reserva online con confirmacion, gestion de cambios y seguimiento por email.",
    ],
    faqs: [
      {
        question: `Como elegir especialista para ${treatmentName}?`,
        answer:
          "Compara experiencia, lugar de atencion, precio orientativo, opiniones verificadas y disponibilidad antes de reservar.",
      },
      {
        question: `Cuanto dura una cita de ${treatmentName}?`,
        answer:
          "La duracion depende del tratamiento y del criterio profesional, pero la agenda muestra el tiempo estimado configurado para reservar.",
      },
      {
        question: "Puedo reservar online?",
        answer:
          "Si hay disponibilidad activa, puedes entrar al perfil del especialista, elegir un hueco real y confirmar la reserva desde EncuentraTuClinica.",
      },
      {
        question: "El precio es definitivo?",
        answer:
          "El precio mostrado es orientativo o desde. La valoracion final puede variar segun zona, tecnica, producto y necesidades del paciente.",
      },
    ],
  };

  if (normalized.includes("botox") || normalized.includes("toxina")) {
    return {
      ...base,
      intro:
        "El botox se suele valorar para suavizar lineas de expresion y planificar un resultado natural con un especialista cualificado.",
      idealFor: [
        "Lineas de expresion en frente, entrecejo o zona periocular.",
        "Pacientes que buscan una mejora sutil y progresiva.",
        "Personas que quieren comparar experiencia, precio y disponibilidad antes de reservar.",
      ],
      expectations: [
        "Valoracion facial y explicacion de zonas recomendadas.",
        "Sesion habitualmente breve, con indicaciones posteriores del especialista.",
        "Seguimiento segun criterio medico y respuesta individual.",
      ],
      faqs: [
        {
          question: "Cuando se notan los resultados del botox?",
          answer:
            "Suelen apreciarse de forma progresiva tras la sesion. El especialista indicara tiempos esperados y seguimiento segun cada caso.",
        },
        {
          question: "Como elegir especialista para botox?",
          answer:
            "Revisa experiencia en medicina estetica facial, opiniones verificadas, precio orientativo y disponibilidad real antes de reservar.",
        },
        {
          question: "Cuanto dura una cita de botox?",
          answer:
            "Depende de la valoracion y las zonas tratadas. La pagina muestra la duracion configurada para la reserva.",
        },
        {
          question: "Puedo comparar clinicas antes de reservar?",
          answer:
            "Si. Puedes comparar clinicas, especialistas disponibles, precio desde y ciudades antes de elegir horario.",
        },
      ],
    };
  }

  if (
    normalized.includes("hialuronico") ||
    normalized.includes("labial") ||
    normalized.includes("relleno")
  ) {
    return {
      ...base,
      intro:
        "Los tratamientos con acido hialuronico se plantean para armonizar volumen, hidratacion o definicion segun la zona y el objetivo.",
      idealFor: [
        "Personas que buscan hidratacion, definicion o soporte facial.",
        "Pacientes que quieren comparar tecnica y criterio estetico del profesional.",
        "Reservas donde es importante revisar precio orientativo por zona.",
      ],
      expectations: [
        "Analisis de proporciones y plan de tratamiento personalizado.",
        "Explicacion de producto, cantidad estimada y cuidados posteriores.",
        "Resultado dependiente de anatomia, tecnica y seguimiento profesional.",
      ],
      faqs: [
        {
          question: "Para que se usa el acido hialuronico?",
          answer:
            "Puede utilizarse para hidratacion, definicion, soporte o armonizacion, siempre segun indicacion y valoracion profesional.",
        },
        {
          question: "Como comparar especialistas para rellenos?",
          answer:
            "Fijate en experiencia, criterio estetico, lugar de atencion, precio orientativo y opiniones verificadas.",
        },
        {
          question: "El precio cambia segun la zona?",
          answer:
            "Si, puede variar por zona, producto, cantidad estimada y complejidad del caso.",
        },
        {
          question: "Puedo reservar directamente?",
          answer:
            "Puedes elegir un especialista con agenda activa y avanzar a una reserva con huecos reales.",
        },
      ],
    };
  }

  if (normalized.includes("rino")) {
    return {
      ...base,
      intro:
        "La rinomodelacion se valora para armonizar el perfil nasal sin cirugia, siempre con indicacion profesional y expectativas realistas.",
      idealFor: [
        "Pacientes que quieren valorar alternativas no quirurgicas.",
        "Casos donde el perfil y la armonia facial son el objetivo principal.",
        "Personas que necesitan comparar especialistas con experiencia especifica.",
      ],
      expectations: [
        "Valoracion individual para confirmar si el caso es candidato.",
        "Planificacion de zonas, producto y limites del resultado.",
        "Indicaciones posteriores y seguimiento segun criterio profesional.",
      ],
      faqs: [
        {
          question: "La rinomodelacion sustituye una cirugia?",
          answer:
            "No necesariamente. Es una alternativa no quirurgica para ciertos casos, pero requiere valoracion profesional para confirmar indicacion.",
        },
        {
          question: "Como elegir especialista para rinomodelacion?",
          answer:
            "Compara experiencia especifica, criterio estetico, lugar de atencion, opiniones y disponibilidad.",
        },
        {
          question: "Que debo revisar antes de reservar?",
          answer:
            "Revisa si el profesional explica limites del tratamiento, cuidados posteriores y expectativas realistas.",
        },
        {
          question: "Puedo comparar clinicas?",
          answer:
            "Si. La landing conecta el tratamiento con clinicas y especialistas disponibles para comparar antes de reservar.",
        },
      ],
    };
  }

  return base;
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
    alternates: {
      canonical: `/tratamientos/${slug}`,
    },
    openGraph: {
      title: `${treatmentName} | Compara clinicas y especialistas`,
      description: `Clinicas, especialistas y disponibilidad para ${treatmentName}.`,
      url: `/tratamientos/${slug}`,
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

  if (!treatmentRecord && allSpecialists.length === 0 && clinicsForTreatment.length === 0) {
    notFound();
  }

  const cityNames = Array.from(
    new Set(
      [
        ...clinicsForTreatment.flatMap((clinic) => [
          clinic.city,
          ...getAddressCities(clinic.location),
        ]),
        ...allSpecialists
          .filter((specialist) => !specialist.clinic_name && !specialist.clinic_id)
          .flatMap((specialist) => getAddressCities(specialist.consultation_address)),
      ].filter((item): item is string => Boolean(item))
    )
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
  const landingContent = getTreatmentLandingContent(slug, treatmentName);
  const heroImage = treatmentRecord?.image || landingContent.heroImage;
  const galleryImages = Array.from(
    new Set([heroImage, ...landingContent.gallery])
  ).slice(0, 3);
  const featuredSpecialists = allSpecialists.slice(0, 3);
  const sortedSpecialists = [...allSpecialists].sort((a, b) => {
    const aTreatment = findSpecialistTreatment(a, slug);
    const bTreatment = findSpecialistTreatment(b, slug);
    const aPrice = getTreatmentPrice(aTreatment) || Number.MAX_SAFE_INTEGER;
    const bPrice = getTreatmentPrice(bTreatment) || Number.MAX_SAFE_INTEGER;

    return aPrice - bPrice;
  });
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

  const independentSpecialistCount = allSpecialists.filter((specialist) => {
    const clinic =
      (specialist.clinic_id && clinicsById.get(String(specialist.clinic_id))) ||
      clinicsByName.get(normalize(specialist.clinic_name));

    return !clinic?.name && !specialist.clinic_name;
  }).length;
  const clinicSpecialistCount = allSpecialists.length - independentSpecialistCount;
  const stats = [
    ["Clinicas", clinicsForTreatment.length],
    ["Especialistas", allSpecialists.length],
    ["Independientes", independentSpecialistCount],
    ["Duracion", `${duration} min`],
  ];
  const comparisonRows = [
    ["Precio desde", formattedPrice || "A consultar"],
    ["Duracion estimada", `${duration} min`],
    ["En clinica", clinicSpecialistCount],
    ["Independientes", independentSpecialistCount],
    ["Lugares de atencion", clinicsForTreatment.length + independentSpecialistCount],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: landingContent.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }),
        }}
      />

      <section className="border-b border-black/10 px-6 pb-12 pt-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
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

            <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-600">
              {landingContent.intro}
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
            <div className="relative mb-3 h-[360px] overflow-hidden rounded-md bg-[#E7DED1]">
              <Image
                src={heroImage}
                alt={treatmentName}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 46vw"
                className="object-contain bg-[#F8F5F1]"
              />
              <div className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-2 text-xs uppercase tracking-[0.18em] backdrop-blur">
                Guia del tratamiento
              </div>
            </div>

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

      <section className="px-6 py-10">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-black/10 bg-white p-7 shadow-[0_12px_45px_rgba(0,0,0,0.04)]">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
              Guia del tratamiento
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
              Que debes saber antes de reservar {treatmentName}
            </h2>
            <p className="mt-5 text-sm leading-7 text-neutral-600 md:text-base">
              Esta landing agrupa explicacion, fotos de contexto, lugares de
              atencion y especialistas disponibles para que compares antes de
              elegir horario.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Para quien puede encajar
                </h3>
                <div className="mt-4 grid gap-3">
                  {landingContent.idealFor.map((item) => (
                    <div key={item} className="rounded-md bg-[#F8F6F2] p-4 text-sm leading-6">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Como suele ser el proceso
                </h3>
                <div className="mt-4 grid gap-3">
                  {landingContent.expectations.map((item, index) => (
                    <div key={item} className="flex gap-3 rounded-md bg-[#F8F6F2] p-4 text-sm leading-6">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs text-white">
                        {index + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {galleryImages.map((image, index) => (
              <div
                key={image}
                className={`relative overflow-hidden rounded-lg border border-black/10 bg-white ${
                  index === 0 ? "min-h-[320px] sm:col-span-3 lg:col-span-1" : "min-h-[180px]"
                }`}
              >
                <Image
                  src={image}
                  alt={`${treatmentName} ${index + 1}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain bg-[#F8F5F1]"
                />
              </div>
            ))}
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

      <section className="px-6 py-8">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg bg-black p-7 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-white/50">
              Comparacion abierta
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
              Compara clinicas y consultas independientes en la misma busqueda.
            </h2>
            <p className="mt-5 text-sm leading-6 text-white/65 md:text-base">
              Para {treatmentName}, EncuentraTuClinica mezcla especialistas de
              clinicas verificadas y profesionales independientes para que elijas
              por precio, duracion, ubicacion, rating y agenda.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href={`/especialistas?treatment=${encodeURIComponent(
                treatmentName
              )}&practice=Clinica`}
              className="rounded-lg border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(0,0,0,0.08)]"
            >
              <div className="text-3xl font-semibold">{clinicSpecialistCount}</div>
              <div className="mt-2 text-sm uppercase tracking-[0.16em] text-neutral-500">
                Especialistas en clinica
              </div>
              <p className="mt-4 text-sm leading-6 text-neutral-600">
                Profesionales asociados a clinicas verificadas para este tratamiento.
              </p>
            </Link>

            <Link
              href={`/especialistas?treatment=${encodeURIComponent(
                treatmentName
              )}&practice=Consulta%20independiente`}
              className="rounded-lg border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(0,0,0,0.08)]"
            >
              <div className="text-3xl font-semibold">{independentSpecialistCount}</div>
              <div className="mt-2 text-sm uppercase tracking-[0.16em] text-neutral-500">
                Consultas independientes
              </div>
              <p className="mt-4 text-sm leading-6 text-neutral-600">
                Profesionales verificados con direccion propia de atencion.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg bg-black p-7 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-white/50">
              Comparador marketplace
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
              Decide {treatmentName} con datos, no solo con una descripcion.
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/65 md:text-base">
              La landing combina explicacion editorial con comparacion real:
              especialistas, clinicas, precio orientativo, ciudad y acceso a
              agenda.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/especialistas?treatment=${encodeURIComponent(treatmentName)}&availability=Con+horario`}
                className="rounded-md bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
              >
                Ver especialistas con horario
              </Link>
              <Link
                href={`/clinics?treatment=${encodeURIComponent(treatmentName)}`}
                className="rounded-md border border-white/20 px-5 py-3 text-sm font-medium transition hover:bg-white hover:text-black"
              >
                Comparar clinicas
              </Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-black/10 bg-white/90 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.04)] sm:grid-cols-2">
            {comparisonRows.map(([label, value]) => (
              <div key={label} className="rounded-md bg-[#F8F6F2] p-5">
                <div className="text-2xl font-semibold">{value}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
                  {label}
                </div>
              </div>
            ))}

            <div className="rounded-md border border-black/10 bg-white p-5 sm:col-span-2">
              <p className="text-sm font-semibold">Siguiente paso recomendado</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Empieza comparando especialistas si ya sabes el tratamiento.
                Si todavia estas eligiendo lugar, compara clinicas primero.
              </p>
            </div>
          </div>
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

              {featuredSpecialists.length === 0 && (
                <div className="rounded-md bg-[#F8F6F2] p-5 text-sm leading-6 text-neutral-600">
                  Aun no hay especialistas asociados. La guia ya esta publicada
                  y quedara conectada cuando asignes profesionales desde el
                  admin.
                </div>
              )}
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

              {featuredClinics.length === 0 && (
                <div className="rounded-md bg-white/10 p-5 text-sm leading-6 text-white/70">
                  Aun no hay clinicas asociadas. Cuando asignes especialistas
                  de clinica, apareceran aqui.
                </div>
              )}
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
                "/og-image.jpg"
              }
              alt={treatmentName}
              fill
              sizes="(max-width: 1024px) 100vw, 52vw"
              className="object-contain bg-[#F8F5F1]"
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
          <div className="mb-6 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
              Preguntas frecuentes
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Dudas habituales sobre {treatmentName}
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Respuestas breves para decidir mejor antes de comparar
              especialistas, clinicas y horarios disponibles.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {landingContent.faqs.map((faq) => (
              <article
                key={faq.question}
                className="rounded-lg border border-black/10 bg-white p-6 shadow-[0_12px_45px_rgba(0,0,0,0.04)]"
              >
                <h3 className="text-lg font-semibold tracking-tight">
                  {faq.question}
                </h3>
                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                Especialistas y consultas disponibles
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Todas las opciones para reservar {treatmentName}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
                Compara especialistas de clinicas y consultas independientes
                que ofrecen {treatmentName}, con ubicacion, precio, duracion y
                acceso directo a reserva.
              </p>
            </div>

            <Link
              href={`/especialistas?treatment=${encodeURIComponent(treatmentName)}`}
              className="text-sm font-medium underline underline-offset-4"
            >
              Ver todos
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sortedSpecialists.map((specialist) => {
              const specialistTreatment = findSpecialistTreatment(specialist, slug);
              const price = formatPrice(getTreatmentPrice(specialistTreatment) || priceFrom);
              const durationLabel = formatDuration(
                getSpecialistTreatmentDuration(specialistTreatment) || duration
              );
              const clinic =
                (specialist.clinic_id && clinicsById.get(String(specialist.clinic_id))) ||
                clinicsByName.get(normalize(specialist.clinic_name));
              const isIndependent = !clinic?.name && !specialist.clinic_name;
              const practiceLabel = isIndependent
                ? "Consulta independiente"
                : "Especialista en clinica";
              const placeName =
                clinic?.name || specialist.clinic_name || "Consulta independiente";
              const placeLocation = clinic
                ? getClinicLocation(clinic)
                : specialist.consultation_address || "Direccion a confirmar";
              const reviewSummary = specialistReviewSummaries.get(
                normalizeReviewKey(specialist.name)
              );
              const reserveHref = buildSpecialistHref({
                slug: specialist.slug,
                treatment: treatmentName,
              });
              const profileHref = buildSpecialistHref({
                slug: specialist.slug,
                treatment: treatmentName,
              });

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
                        className="object-contain bg-[#F8F5F1]"
                      />
                    </div>

                    <div>
                      <div
                        className={`mb-2 w-fit rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.14em] ${
                          isIndependent
                            ? "bg-black text-white"
                            : "bg-[#F8F6F2] text-neutral-600"
                        }`}
                      >
                        {practiceLabel}
                      </div>
                      <h3 className="text-xl font-semibold">{specialist.name}</h3>
                      <p className="mt-1 text-sm text-neutral-500">{specialist.specialty}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
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
                    <div className="rounded-md bg-[#F8F6F2] p-3">
                      <div className="text-lg font-semibold">{durationLabel}</div>
                      <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                        Duracion
                      </div>
                    </div>
                  </div>

                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-neutral-600">
                    {specialist.bio ||
                      `${specialist.name || "Especialista"} realiza ${treatmentName} dentro de EncuentraTuClinica.`}
                  </p>

                  <div className="mt-5 rounded-md bg-[#F8F6F2] p-3 text-sm text-neutral-600">
                    <div className="font-medium text-black">
                      {placeName}
                    </div>
                    <div className="mt-1">
                      {placeLocation}
                    </div>
                    <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-700">
                      {isIndependent
                        ? "Atencion en direccion propia"
                        : "Atencion dentro de clinica"}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md border border-black/10 bg-white p-3 text-neutral-500">
                      Desde
                      <div className="mt-1 font-semibold text-black">
                        {price || "A consultar"}
                      </div>
                    </div>
                    <div className="rounded-md border border-black/10 bg-white p-3 text-neutral-500">
                      Duracion
                      <div className="mt-1 font-semibold text-black">
                        {durationLabel}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-3 pt-7">
                    {reserveHref ? (
                      <Link
                        href={reserveHref}
                        className="rounded-md bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                      >
                        Ver agenda y reservar
                      </Link>
                    ) : (
                      <span className="rounded-md border border-black/10 bg-[#F8F6F2] px-5 py-3 text-sm font-medium text-neutral-600">
                        Perfil pendiente
                      </span>
                    )}

                    {profileHref ? (
                      <Link
                        href={profileHref}
                        className="rounded-md border border-black/10 px-5 py-3 text-sm font-medium transition hover:border-black"
                      >
                        Ver perfil
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}

            {sortedSpecialists.length === 0 && (
              <div className="rounded-lg border border-black/10 bg-white p-7 text-sm leading-7 text-neutral-600 md:col-span-2 xl:col-span-3">
                Todavia no hay especialistas disponibles para este tratamiento.
                Puedes publicar primero la guia y asociar especialistas,
                precios, duracion y disponibilidad despues.
              </div>
            )}
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
                      className="object-contain bg-[#F8F5F1] transition duration-500"
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
