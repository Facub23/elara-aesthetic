import Link from "next/link";
import { notFound } from "next/navigation";

import { Navbar } from "@/components/layout/navbar";
import { findNextAvailableSlot } from "@/lib/next-available-slot";
import { filterPublicRecords } from "@/lib/public-records";
import { buildReviewSummaryMap, normalizeReviewKey } from "@/lib/review-summary";
import { supabase } from "@/lib/supabase";
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
    };

type SpecialistRow = {
  id?: string | number | null;
  name?: string | null;
  slug?: string | null;
  clinic_id?: string | number | null;
  clinic_name?: string | null;
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

function getTreatmentPrice(treatment?: TreatmentOption | null) {
  return getTreatmentPriceValue(treatment) || undefined;
}

function formatPrice(value?: number) {
  if (!value) return null;

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getClinicLocation(clinic?: ClinicRow | null) {
  if (!clinic) return "";

  return clinic.location || [clinic.city, clinic.country].filter(Boolean).join(", ");
}

function getClinicCity(clinic?: ClinicRow | null) {
  return clinic?.city || clinic?.location?.split(",")[0]?.trim() || "";
}

function specialistHasTreatment(specialist: SpecialistRow, treatmentSlug: string) {
  return Boolean(
    specialist.treatments?.some(
      (treatment) => slugify(getTreatmentName(treatment)) === treatmentSlug
    )
  );
}

function findSpecialistTreatment(specialist: SpecialistRow, treatmentSlug: string) {
  return specialist.treatments?.find(
    (treatment) => slugify(getTreatmentName(treatment)) === treatmentSlug
  );
}

function formatSlotLabel(slot?: { date: string; time: string } | null) {
  if (!slot) return "Sin huecos proximos";

  const parsed = new Date(`${slot.date}T00:00:00`);
  const label = parsed.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return `${label} - ${slot.time}`;
}

export async function generateStaticParams() {
  const [{ data: specialists }, { data: clinics }] = await Promise.all([
    supabase.from("specialists").select("clinic_id,clinic_name,treatments"),
    supabase.from("clinics").select("id,name,city,location"),
  ]);

  const clinicsById = new Map(
    filterPublicRecords((clinics || []) as ClinicRow[])
      .filter((clinic) => clinic.id)
      .map((clinic) => [String(clinic.id), clinic])
  );
  const clinicsByName = new Map(
    filterPublicRecords((clinics || []) as ClinicRow[])
      .filter((clinic) => clinic.name)
      .map((clinic) => [normalize(clinic.name), clinic])
  );
  const params = new Map<string, { city: string; treatment: string }>();

  filterPublicRecords((specialists || []) as SpecialistRow[]).forEach((specialist) => {
    const clinic =
      (specialist.clinic_id && clinicsById.get(String(specialist.clinic_id))) ||
      clinicsByName.get(normalize(specialist.clinic_name));
    const city = getClinicCity(clinic);

    if (!city || !Array.isArray(specialist.treatments)) return;

    specialist.treatments.forEach((treatment) => {
      const name = getTreatmentName(treatment);

      if (!name) return;

      params.set(`${city}-${name}`, {
        city: slugify(city),
        treatment: slugify(name),
      });
    });
  });

  return Array.from(params.values());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    city: string;
    treatment: string;
  }>;
}) {
  const { city, treatment } = await params;
  const [{ data: clinics }, { data: treatmentRecords }] = await Promise.all([
    supabase.from("clinics").select("city,location"),
    supabase.from("treatments").select("name,slug"),
  ]);
  const cityRecord = ((clinics || []) as ClinicRow[]).find(
    (clinic) => slugify(getClinicCity(clinic)) === city
  );
  const treatmentRecord = treatmentRecords?.find(
    (item) => item.slug === treatment || slugify(item.name || "") === treatment
  );
  const cityName = cityRecord ? getClinicCity(cityRecord) : formatText(city);
  const treatmentName = treatmentRecord?.name || formatText(treatment);

  return {
    title: `${treatmentName} en ${cityName} | Clinicas y especialistas`,
    description: `Compara clinicas verificadas y especialistas para ${treatmentName} en ${cityName}. Reserva con disponibilidad real en EncuentraTuClinica.`,
    openGraph: {
      title: `${treatmentName} en ${cityName} | Clinicas y especialistas`,
      description: `Clinicas, especialistas y disponibilidad para ${treatmentName} en ${cityName}.`,
    },
  };
}

export default async function CityTreatmentPage({
  params,
}: {
  params: Promise<{
    city: string;
    treatment: string;
  }>;
}) {
  const { city, treatment } = await params;

  const [{ data: specialists }, { data: clinics }, { data: approvedReviews }] = await Promise.all([
    supabase.from("specialists").select("*"),
    supabase.from("clinics").select("*"),
    supabase.from("reviews").select("clinic_name,specialist_name,rating").eq("status", "Aprobada"),
  ]);

  const allClinics = filterPublicRecords((clinics || []) as ClinicRow[]);
  const clinicsById = new Map(
    allClinics.filter((clinic) => clinic.id).map((clinic) => [String(clinic.id), clinic])
  );
  const clinicsByName = new Map(
    allClinics.filter((clinic) => clinic.name).map((clinic) => [normalize(clinic.name), clinic])
  );
  const cityRecord = allClinics.find((clinic) => slugify(getClinicCity(clinic)) === city);
  const cityName = cityRecord ? getClinicCity(cityRecord) : formatText(city);
  const cityNormalized = normalize(cityName);
  const clinicReviewSummaries = buildReviewSummaryMap(
    approvedReviews || [],
    "clinic_name"
  );
  const specialistReviewSummaries = buildReviewSummaryMap(
    approvedReviews || [],
    "specialist_name"
  );

  const specialistContexts = filterPublicRecords((specialists || []) as SpecialistRow[])
    .map((specialist) => {
      const clinic =
        (specialist.clinic_id && clinicsById.get(String(specialist.clinic_id))) ||
        clinicsByName.get(normalize(specialist.clinic_name));
      const clinicCity = getClinicCity(clinic);

      return {
        specialist,
        clinic,
        clinicCity,
      };
    })
    .filter(
      ({ specialist, clinicCity }) =>
        normalize(clinicCity) === cityNormalized &&
        specialistHasTreatment(specialist, treatment)
    );

  if (specialistContexts.length === 0) {
    notFound();
  }

  const firstSpecialistTreatment = specialistContexts
    .map(({ specialist }) => findSpecialistTreatment(specialist, treatment))
    .find(Boolean);
  const treatmentName = firstSpecialistTreatment
    ? getTreatmentName(firstSpecialistTreatment)
    : formatText(treatment);

  const clinicContexts = Array.from(
    new Map(
      specialistContexts
        .map(({ clinic }) =>
          clinic ? [String(clinic.id || clinic.slug || clinic.name), clinic] : null
        )
        .filter(Boolean) as [string, ClinicRow][]
    ).values()
  ).map((clinic) => ({
    clinic,
    specialists: specialistContexts.filter(({ specialist }) => {
      const sameId =
        clinic.id &&
        specialist.clinic_id &&
        String(clinic.id) === String(specialist.clinic_id);
      const sameName = normalize(clinic.name) === normalize(specialist.clinic_name);

      return sameId || sameName;
    }),
  }));

  const specialistSlots = await Promise.all(
    specialistContexts.slice(0, 12).map(async ({ specialist }) => ({
      specialistId: String(specialist.id || specialist.slug || specialist.name),
      slot: await findNextAvailableSlot({
        specialistName: specialist.name || "",
        treatment: treatmentName,
        maxDays: 30,
      }),
    }))
  );
  const slotsBySpecialist = new Map(
    specialistSlots.map((item) => [item.specialistId, item.slot])
  );

  const prices = specialistContexts
    .map(({ specialist }) => getTreatmentPrice(findSpecialistTreatment(specialist, treatment)))
    .filter(Boolean) as number[];
  const priceFrom = prices.length > 0 ? Math.min(...prices) : undefined;
  const formattedPrice = formatPrice(priceFrom);
  const firstSpecialist = specialistContexts[0]?.specialist;
  const firstSlot = firstSpecialist
    ? slotsBySpecialist.get(String(firstSpecialist.id || firstSpecialist.slug || firstSpecialist.name))
    : null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F6F3EE] text-black">
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalBusiness",
            name: `${treatmentName} en ${cityName} | EncuentraTuClinica`,
            description: `Clinicas y especialistas para ${treatmentName} en ${cityName}.`,
            areaServed: cityName,
            medicalSpecialty: "AestheticMedicine",
            url: `/${city}/${treatment}`,
          }),
        }}
      />

      <section className="border-b border-black/10 px-6 pb-12 pt-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <Link
              href={`/tratamientos/${treatment}`}
              className="text-sm font-medium text-neutral-500 underline underline-offset-4"
            >
              Ver ficha de {treatmentName}
            </Link>

            <p className="mt-8 text-xs font-medium uppercase tracking-[0.28em] text-neutral-500">
              Comparador local
            </p>

            <h1 className="mt-5 text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-7xl">
              {treatmentName} en {cityName}
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-neutral-600 md:text-xl">
              Compara clinicas verificadas, especialistas disponibles y el primer
              hueco para reservar {treatmentName} en {cityName}.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {firstSpecialist?.slug ? (
                <Link
                  href={`/especialistas/${firstSpecialist.slug}?treatment=${encodeURIComponent(
                    treatmentName
                  )}${firstSlot ? `&date=${firstSlot.date}&time=${firstSlot.time}` : ""}`}
                  className="rounded-md bg-black px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Reservar primer hueco
                </Link>
              ) : null}

              <Link
                href={`/clinics?treatment=${encodeURIComponent(treatmentName)}&city=${encodeURIComponent(
                  city
                )}`}
                className="rounded-md border border-black/10 bg-white px-6 py-3 text-sm font-medium transition hover:border-black"
              >
                Ver clinicas
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-white p-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Clinicas", clinicContexts.length],
                ["Especialistas", specialistContexts.length],
                ["Precio desde", formattedPrice || "A consultar"],
                ["Primer hueco", formatSlotLabel(firstSlot)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-[#F8F6F2] p-4">
                  <div className="text-xl font-semibold">{value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                Clinicas verificadas
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Donde hacer {treatmentName} en {cityName}
              </h2>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {clinicContexts.map(({ clinic, specialists: clinicSpecialists }) => {
              const reviewSummary = clinicReviewSummaries.get(
                normalizeReviewKey(clinic.name)
              );
              const primarySpecialistContext = clinicSpecialists[0];
              const primarySpecialist = primarySpecialistContext?.specialist;
              const primarySlot = primarySpecialist
                ? slotsBySpecialist.get(
                    String(
                      primarySpecialist.id ||
                        primarySpecialist.slug ||
                        primarySpecialist.name
                    )
                  )
                : null;

              return (
                <article
                  key={String(clinic.id || clinic.slug)}
                  className="overflow-hidden rounded-lg border border-black/10 bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(0,0,0,0.08)]"
                >
                  <Link href={`/clinics/${clinic.slug}`}>
                    <img
                      src={clinic.heroImage || clinic.image || "/og-image.jpg"}
                      alt={clinic.name || "Clinica EncuentraTuClinica"}
                      className="h-56 w-full object-cover"
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

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-md bg-[#F8F6F2] p-3 text-sm">
                        {clinicSpecialists.length} especialista
                        {clinicSpecialists.length === 1 ? "" : "s"}
                      </div>
                      <div className="rounded-md bg-[#F8F6F2] p-3 text-sm">
                        {formatSlotLabel(primarySlot)}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {primarySpecialist?.slug ? (
                        <Link
                          href={`/especialistas/${primarySpecialist.slug}?treatment=${encodeURIComponent(
                            treatmentName
                          )}${primarySlot ? `&date=${primarySlot.date}&time=${primarySlot.time}` : ""}`}
                          className="rounded-md bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                        >
                          Reservar
                        </Link>
                      ) : null}

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

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                Especialistas
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Profesionales para {treatmentName} en {cityName}
              </h2>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {specialistContexts.map(({ specialist, clinic }) => {
              const reviewSummary = specialistReviewSummaries.get(
                normalizeReviewKey(specialist.name)
              );
              const slot = slotsBySpecialist.get(
                String(specialist.id || specialist.slug || specialist.name)
              );
              const price = formatPrice(
                getTreatmentPrice(findSpecialistTreatment(specialist, treatment))
              );

              return (
                <article
                  key={String(specialist.id || specialist.slug)}
                  className="flex min-h-[390px] flex-col rounded-lg border border-black/10 bg-white p-5"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={specialist.image || "/og-image.jpg"}
                      alt={specialist.name || "Especialista EncuentraTuClinica"}
                      className="h-20 w-20 rounded-full object-cover"
                    />

                    <div>
                      <h3 className="text-xl font-semibold">{specialist.name}</h3>
                      <p className="mt-1 text-sm text-neutral-500">
                        {specialist.specialty || "Medicina estetica"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-neutral-600">
                    {specialist.bio ||
                      `${specialist.name || "Especialista"} realiza ${treatmentName} en ${cityName}.`}
                  </p>

                  <div className="mt-5 rounded-md bg-[#F8F6F2] p-3 text-sm">
                    {clinic?.name || specialist.clinic_name}
                    {clinic ? ` - ${getClinicLocation(clinic)}` : ""}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md bg-[#F8F6F2] p-3">
                      {price ? `Desde ${price}` : "Precio a consultar"}
                    </div>
                    <div className="rounded-md bg-black p-3 text-white">
                      {formatSlotLabel(slot)}
                    </div>
                  </div>
                  <div className="mt-3 rounded-md bg-[#F8F6F2] p-3 text-sm text-neutral-600">
                    {reviewSummary
                      ? `${reviewSummary.rating}/5 - ${reviewSummary.count} opiniones verificadas`
                      : "Sin opiniones verificadas"}
                  </div>

                  <div className="mt-auto flex flex-wrap gap-3 pt-7">
                    {specialist.slug ? (
                      <Link
                        href={`/especialistas/${specialist.slug}?treatment=${encodeURIComponent(
                          treatmentName
                        )}${slot ? `&date=${slot.date}&time=${slot.time}` : ""}`}
                        className="rounded-md bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                      >
                        Reservar
                      </Link>
                    ) : null}

                    {clinic?.slug ? (
                      <Link
                        href={`/clinics/${clinic.slug}`}
                        className="rounded-md border border-black/10 px-5 py-3 text-sm font-medium transition hover:border-black"
                      >
                        Ver clinica
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl rounded-lg bg-black p-8 text-white md:p-12">
          <p className="text-sm uppercase tracking-[0.25em] text-white/50">
            Explorar mas
          </p>

          <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Otros tratamientos en {cityName}
          </h2>

          <div className="mt-8 flex flex-wrap gap-3">
            {[
              "botox",
              "acido-hialuronico",
              "rinomodelacion",
              "armonizacion-facial",
              "bioestimuladores",
              "perfilado-labial",
            ]
              .filter((item) => item !== treatment)
              .map((item) => (
                <Link
                  key={item}
                  href={`/${city}/${item}`}
                  className="rounded-full bg-white/10 px-5 py-3 text-sm transition hover:bg-white hover:text-black"
                >
                  {formatText(item)}
                </Link>
              ))}
          </div>
        </div>
      </section>
    </main>
  );
}
