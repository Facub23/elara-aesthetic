import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Navbar } from "@/components/layout/navbar";
import { filterPublicRecords } from "@/lib/public-records";
import { supabase } from "@/lib/supabase";
import { findNextAvailableSlot } from "@/lib/next-available-slot";
import { buildReviewSummaryMap, normalizeReviewKey } from "@/lib/review-summary";
import {
  getTreatmentName as readTreatmentName,
  getTreatmentPriceValue,
} from "@/lib/treatment-utils";

export const metadata: Metadata = {
  title: "Especialistas premium con disponibilidad real",
  description:
    "Compara especialistas de medicina estetica por tratamiento, ciudad, clinica y disponibilidad dentro de EncuentraTuClinica.",
  keywords: [
    "especialistas estetica",
    "medicos esteticos",
    "botox",
    "acido hialuronico",
    "medicina estetica premium",
    "EncuentraTuClinica",
  ],
  alternates: {
    canonical: "/especialistas",
  },
  openGraph: {
    title: "Especialistas premium con disponibilidad real",
    description:
      "Elige especialistas premium por tratamiento, clinica y disponibilidad.",
    url: "/especialistas",
    siteName: "EncuentraTuClinica",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Especialistas premium EncuentraTuClinica",
      },
    ],
  },
};

type TreatmentOption =
  | string
  | {
      name?: string | null;
      price?: string | number | null;
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
};

type AvailabilityRow = {
  specialist_name?: string | null;
  weekday?: number | string | null;
  day_of_week?: number | string | null;
  start_time?: string | null;
  end_time?: string | null;
  active?: boolean | null;
  is_active?: boolean | null;
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

function getTreatmentName(treatment: TreatmentOption) {
  return readTreatmentName(treatment);
}

function getTreatmentPrice(treatment?: TreatmentOption | null) {
  return getTreatmentPriceValue(treatment) || undefined;
}

function getSpecialistPriceFrom(
  specialist: SpecialistRow,
  selectedTreatment?: string
) {
  const prices = (specialist.treatments || [])
    .filter((treatment) =>
      selectedTreatment
        ? normalize(getTreatmentName(treatment)) === normalize(selectedTreatment)
        : true
    )
    .map((treatment) => getTreatmentPrice(treatment))
    .filter((price): price is number => Boolean(price));

  return prices.length > 0 ? Math.min(...prices) : undefined;
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

function getClinicLocation(clinic?: ClinicRow) {
  if (!clinic) {
    return "";
  }

  return clinic.location || [clinic.city, clinic.country].filter(Boolean).join(", ");
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

function getAvailabilityLabel(rows: AvailabilityRow[]) {
  const activeRows = rows.filter(isActiveAvailability);

  if (activeRows.length === 0) {
    return "Sin horario activo";
  }

  const days = new Set(activeRows.map(getAvailabilityWeekday).filter(Number.isFinite));
  const firstRange = activeRows.find((row) => row.start_time && row.end_time);

  return `${days.size} dias/semana${
    firstRange ? ` - ${firstRange.start_time?.slice(0, 5)}-${firstRange.end_time?.slice(0, 5)}` : ""
  }`;
}

function matchesTreatment(specialist: SpecialistRow, selectedTreatment?: string) {
  if (!selectedTreatment) {
    return true;
  }

  return Boolean(
    specialist.treatments?.some(
      (treatment) => normalize(getTreatmentName(treatment)) === normalize(selectedTreatment)
    )
  );
}

export default async function SpecialistsPage({
  searchParams,
}: {
  searchParams: Promise<{
    clinic?: string;
    treatment?: string;
    city?: string;
    q?: string;
    price?: string;
    availability?: string;
  }>;
}) {
  const params = await searchParams;
  const clinicSlug = params.clinic;
  const selectedTreatment = params.treatment;
  const selectedCity = params.city || "Todas";
  const search = params.q || "";
  const selectedPrice = params.price || "Todos";
  const selectedAvailability = params.availability || "Todos";

  const [
    { data: specialists },
    { data: clinics },
    { data: availabilityRows },
    { data: approvedReviews },
  ] = await Promise.all([
    supabase.from("specialists").select("*").order("rating", { ascending: false }),
    supabase.from("clinics").select("*"),
    supabase.from("specialist_availability").select("*"),
    supabase.from("reviews").select("specialist_name,rating").eq("status", "Aprobada"),
  ]);

  const allSpecialists = filterPublicRecords((specialists || []) as SpecialistRow[]);
  const allClinics = filterPublicRecords((clinics || []) as ClinicRow[]);
  const allAvailability = (availabilityRows || []) as AvailabilityRow[];
  const reviewSummaries = buildReviewSummaryMap(
    approvedReviews || [],
    "specialist_name"
  );

  const clinicsById = new Map(
    allClinics.filter((clinic) => clinic.id).map((clinic) => [String(clinic.id), clinic])
  );
  const clinicsByName = new Map(
    allClinics.filter((clinic) => clinic.name).map((clinic) => [normalize(clinic.name), clinic])
  );
  const selectedClinic = clinicSlug
    ? allClinics.find((clinic) => clinic.slug === clinicSlug)
    : undefined;

  const specialistsWithContext = allSpecialists
    .map((specialist) => {
      const clinic =
        (specialist.clinic_id && clinicsById.get(String(specialist.clinic_id))) ||
        clinicsByName.get(normalize(specialist.clinic_name));
      const clinicCity =
        clinic?.city ||
        clinic?.location?.split(",")[0]?.trim() ||
        specialist.consultation_address?.split(",").at(-1)?.trim() ||
        "";
      const availability = allAvailability.filter(
        (item) => normalize(item.specialist_name) === normalize(specialist.name)
      );
      const selectedTreatmentData = selectedTreatment
        ? specialist.treatments?.find(
            (treatment) =>
              normalize(getTreatmentName(treatment)) === normalize(selectedTreatment)
          )
        : undefined;

      return {
        specialist,
        clinic,
        clinicCity,
        availability,
        availabilityLabel: getAvailabilityLabel(availability),
        selectedTreatmentData,
        reviewSummary: reviewSummaries.get(normalizeReviewKey(specialist.name)),
      };
    })
    .filter(({ specialist, clinic, clinicCity, availability }) => {
      const sameClinic =
        !selectedClinic ||
        (selectedClinic.id &&
          specialist.clinic_id &&
          String(selectedClinic.id) === String(specialist.clinic_id)) ||
        normalize(selectedClinic.name) === normalize(specialist.clinic_name);
      const sameTreatment = matchesTreatment(specialist, selectedTreatment);
      const sameCity = selectedCity === "Todas" || clinicCity === selectedCity;
      const activeAvailability = availability.filter(isActiveAvailability).length > 0;
      const priceFrom = getSpecialistPriceFrom(specialist, selectedTreatment);
      const samePrice =
        selectedPrice === "Todos" ||
        (priceFrom !== undefined &&
          ((selectedPrice === "0-300" && priceFrom <= 300) ||
            (selectedPrice === "300-500" && priceFrom > 300 && priceFrom <= 500) ||
            (selectedPrice === "500+" && priceFrom > 500)));
      const sameAvailability =
        selectedAvailability === "Todos" ||
        (selectedAvailability === "Con horario" && activeAvailability) ||
        (selectedAvailability === "Sin horario" && !activeAvailability);
      const searchValue = normalize(search);
      const sameSearch =
        !searchValue ||
        normalize(specialist.name).includes(searchValue) ||
        normalize(specialist.specialty).includes(searchValue) ||
        normalize(specialist.clinic_name).includes(searchValue) ||
        normalize(specialist.consultation_address).includes(searchValue) ||
        normalize(clinic?.name).includes(searchValue);

      return (
        sameClinic &&
        sameTreatment &&
        sameCity &&
        samePrice &&
        sameAvailability &&
        sameSearch
      );
    });

  const uniqueTreatments = Array.from(
    new Set(
      allSpecialists.flatMap(
        (specialist) => specialist.treatments?.map((treatment) => getTreatmentName(treatment)) || []
      )
    )
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"));

  const cities = [
    "Todas",
    ...Array.from(
      new Set(
        allSpecialists
          .map((specialist) => {
            const clinic =
              (specialist.clinic_id && clinicsById.get(String(specialist.clinic_id))) ||
              clinicsByName.get(normalize(specialist.clinic_name));

            return (
              clinic?.city ||
              clinic?.location?.split(",")[0]?.trim() ||
              specialist.consultation_address?.split(",").at(-1)?.trim()
            );
          })
          .filter(Boolean)
      )
    ).sort(),
  ] as string[];

  const clinicData = selectedClinic || null;
  const availableSpecialists = specialistsWithContext.filter(
    ({ availability }) => availability.filter(isActiveAvailability).length > 0
  ).length;
  const placeCount = new Set(
    specialistsWithContext
      .map(({ clinic, specialist }) =>
        clinic?.id ||
        clinic?.slug ||
        specialist.clinic_name ||
        specialist.consultation_address ||
        specialist.name
      )
      .filter(Boolean)
      .map(String)
  ).size;
  const independentCount = specialistsWithContext.filter(
    ({ clinic, specialist }) => !clinic?.name && !specialist.clinic_name
  ).length;
  const specialistsWithNextSlot = await Promise.all(
    specialistsWithContext.map(async (item) => ({
      ...item,
      nextSlot: await findNextAvailableSlot({
        specialistName: item.specialist.name || "",
        treatment: selectedTreatment,
      }),
    }))
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F6F3EE] text-black">
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalBusiness",
            name: selectedTreatment
              ? `Especialistas en ${selectedTreatment}`
              : "Especialistas EncuentraTuClinica",
            description:
              "Especialistas premium en medicina estetica con disponibilidad real.",
            url: clinicSlug
              ? `/especialistas?clinic=${clinicSlug}`
              : "/especialistas",
          }),
        }}
      />

      <section className="border-b border-black/10 px-6 pb-12 pt-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-neutral-500">
              Especialistas con disponibilidad
            </p>

            <h1 className="mt-6 max-w-5xl text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-7xl">
              {selectedTreatment
                ? `Elige especialista para ${selectedTreatment}`
                : clinicData
                  ? `Especialistas de ${clinicData.name}`
                  : "Compara especialistas y reserva con confianza."}
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-neutral-600 md:text-xl">
              Filtra por tratamiento, ciudad, precio y horario para llegar al
              profesional adecuado con contexto antes de reservar.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-black/10 bg-white/85 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.05)] sm:grid-cols-3">
            {[
              ["Especialistas", specialistsWithContext.length],
              ["Con horario", availableSpecialists],
              ["Lugares", placeCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-[#F8F6F2] p-4">
                <div className="text-2xl font-semibold">{value}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg bg-black p-6 text-white md:p-8">
            <p className="text-xs uppercase tracking-[0.24em] text-white/50">
              Comparador de profesionales
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Compara por tratamiento, agenda y lugar de atencion.
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/65 md:text-base">
              El perfil del especialista concentra bio, tratamientos, precios
              desde, proximo hueco y si atiende en clinica o consulta propia.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Con horario", availableSpecialists],
              ["Consultas", independentCount],
              ["Tratamientos", uniqueTreatments.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-black/10 bg-white/80 p-5">
                <div className="text-2xl font-semibold">{value}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <form
            action="/especialistas"
            className="grid gap-3 rounded-lg border border-black/10 bg-white/90 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.04)] md:grid-cols-[1.1fr_1fr_0.8fr_0.8fr_0.8fr_auto]"
          >
            {clinicSlug && <input type="hidden" name="clinic" value={clinicSlug} />}

            <input
              name="q"
              defaultValue={search}
              placeholder="Buscar especialista o clinica..."
              className="h-12 rounded-md border border-black/10 bg-[#F8F6F2] px-4 text-sm outline-none focus:border-black"
            />

            <select
              name="treatment"
              defaultValue={selectedTreatment || ""}
              className="h-12 rounded-md border border-black/10 bg-[#F8F6F2] px-4 text-sm outline-none focus:border-black"
            >
              <option value="">Todos los tratamientos</option>
              {uniqueTreatments.map((treatment) => (
                <option key={treatment} value={treatment}>
                  {treatment}
                </option>
              ))}
            </select>

            <select
              name="city"
              defaultValue={selectedCity}
              className="h-12 rounded-md border border-black/10 bg-[#F8F6F2] px-4 text-sm outline-none focus:border-black"
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              name="price"
              defaultValue={selectedPrice}
              className="h-12 rounded-md border border-black/10 bg-[#F8F6F2] px-4 text-sm outline-none focus:border-black"
            >
              <option value="Todos">Cualquier precio</option>
              <option value="0-300">Hasta 300 EUR</option>
              <option value="300-500">300-500 EUR</option>
              <option value="500+">Mas de 500 EUR</option>
            </select>

            <select
              name="availability"
              defaultValue={selectedAvailability}
              className="h-12 rounded-md border border-black/10 bg-[#F8F6F2] px-4 text-sm outline-none focus:border-black"
            >
              <option value="Todos">Toda disponibilidad</option>
              <option value="Con horario">Con horario</option>
              <option value="Sin horario">Sin horario</option>
            </select>

            <button
              type="submit"
              className="h-12 rounded-md bg-black px-6 text-sm font-medium text-white transition hover:opacity-90"
            >
              Buscar
            </button>
          </form>

          {selectedTreatment && (
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/tratamientos/${slugify(selectedTreatment)}`}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm transition hover:border-black"
              >
                Ver ficha de {selectedTreatment}
              </Link>
              <Link
                href={`/clinics?treatment=${encodeURIComponent(selectedTreatment)}`}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm transition hover:border-black"
              >
                Ver clinicas
              </Link>
            </div>
          )}

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              ["Agenda real", "Los perfiles muestran horario activo y proximo hueco disponible."],
              ["Lugar de atencion", "Compara especialistas con clinica asociada o consulta independiente."],
              ["Precio orientativo", "Cuando existe tarifa, se muestra el precio minimo del tratamiento."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-lg border border-black/5 bg-white/70 p-5">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                Resultados
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                {specialistsWithContext.length} especialistas para comparar
              </h2>
            </div>

            {(selectedTreatment ||
              selectedCity !== "Todas" ||
              selectedPrice !== "Todos" ||
              selectedAvailability !== "Todos" ||
              search ||
              clinicSlug) && (
              <Link
                href="/especialistas"
                className="text-sm font-medium underline underline-offset-4"
              >
                Limpiar filtros
              </Link>
            )}
          </div>

          {specialistsWithContext.length === 0 ? (
            <div className="rounded-lg border border-black/10 bg-white p-10 text-center">
              <h2 className="text-2xl font-semibold">No hay especialistas con esos filtros</h2>
              <p className="mt-3 text-neutral-500">
                Prueba otro tratamiento, ciudad o clinica.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {specialistsWithNextSlot.map(
                ({
                  specialist,
                  clinic,
                  clinicCity,
                  availabilityLabel,
                  selectedTreatmentData,
                  nextSlot,
                  reviewSummary,
                }) => {
                  const price = formatPrice(
                    getSpecialistPriceFrom(specialist, selectedTreatment)
                  );
                  const treatments = specialist.treatments || [];
                  const isIndependent = !clinic?.name && !specialist.clinic_name;
                  const placeName = clinic?.name || specialist.clinic_name;
                  const placeDetail = isIndependent
                    ? specialist.consultation_address
                    : clinicCity;

                  return (
                    <article
                      key={String(specialist.id || specialist.slug)}
                      className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_12px_45px_rgba(0,0,0,0.04)] transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(0,0,0,0.08)]"
                    >
                      <div className="relative h-64 bg-[#E7DED1]">
                        <Image
                          src={specialist.image || "/og-image.jpg"}
                          alt={specialist.name || "Especialista EncuentraTuClinica"}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover"
                        />
                        <div className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-sm font-medium">
                          {reviewSummary
                            ? `${reviewSummary.rating} - ${reviewSummary.count} opiniones verificadas`
                            : "Sin opiniones verificadas"}
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-2xl font-semibold">{specialist.name}</h3>
                            <p className="mt-1 text-sm text-neutral-500">
                              {specialist.specialty || "Medicina estetica"}
                            </p>
                          </div>
                          {price && (
                            <div className="text-right text-xs text-neutral-500">
                              Desde
                              <div className="text-lg font-semibold text-black">{price}</div>
                            </div>
                          )}
                        </div>

                        <p className="mt-4 line-clamp-3 text-sm leading-6 text-neutral-600">
                          {specialist.bio ||
                            `${specialist.name || "Especialista"} atiende tratamientos premium dentro de EncuentraTuClinica.`}
                        </p>

                        <div className="mt-5 grid gap-3">
                          <div className="rounded-md bg-[#F8F6F2] p-3 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">
                                {placeName || "Consulta independiente"}
                              </span>
                              {isIndependent && (
                                <span className="rounded-full bg-black px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white">
                                  Independiente
                                </span>
                              )}
                            </div>
                            {placeDetail && (
                              <div className="mt-1 text-neutral-500">
                                {placeDetail}
                              </div>
                            )}
                          </div>
                          <div className="rounded-md bg-[#F8F6F2] p-3 text-sm">
                            <span className="font-medium">Disponibilidad</span>
                            <span className="text-neutral-500"> - {availabilityLabel}</span>
                          </div>
                          <div className="rounded-md bg-black p-3 text-sm text-white">
                            <span className="font-medium">Proximo hueco</span>
                            <span className="text-white/70">
                              {" "}
                              -{" "}
                              {nextSlot
                                ? formatSlotLabel(nextSlot.date, nextSlot.time)
                                : "Sin huecos proximos"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 rounded-md border border-black/10 bg-white p-4 text-sm leading-6 text-neutral-600">
                          Perfil preparado para revisar experiencia, tratamientos, lugar de
                          atencion y agenda antes de confirmar una reserva.
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {treatments.slice(0, 4).map((treatment) => {
                            const name = getTreatmentName(treatment);

                            return (
                              <Link
                                key={name}
                                href={`/tratamientos/${slugify(name)}`}
                                className={`rounded-full px-3 py-1 text-xs transition ${
                                  selectedTreatment &&
                                  normalize(selectedTreatment) === normalize(name)
                                    ? "bg-black text-white"
                                    : "bg-[#F8F6F2] text-neutral-600 hover:bg-black hover:text-white"
                                }`}
                              >
                                {name}
                              </Link>
                            );
                          })}
                        </div>

                        <div className="mt-auto flex flex-wrap gap-3 pt-7">
                          <Link
                            href={`/especialistas/${specialist.slug}${
                              new URLSearchParams({
                                ...(selectedTreatment
                                  ? {
                                      treatment: selectedTreatment,
                                    }
                                  : {}),
                                ...(nextSlot
                                  ? {
                                      date: nextSlot.date,
                                      time: nextSlot.time,
                                    }
                                  : {}),
                              }).toString()
                                ? `?${new URLSearchParams({
                                    ...(selectedTreatment
                                      ? {
                                          treatment: selectedTreatment,
                                        }
                                      : {}),
                                    ...(nextSlot
                                      ? {
                                          date: nextSlot.date,
                                          time: nextSlot.time,
                                        }
                                      : {}),
                                  }).toString()}`
                                : ""
                            }`}
                            className="rounded-md bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                          >
                            {nextSlot ? "Ver agenda y reservar" : "Ver perfil completo"}
                          </Link>

                          {clinic?.slug ? (
                            <Link
                              href={`/clinics/${clinic.slug}`}
                              className="rounded-md border border-black/10 px-5 py-3 text-sm font-medium transition hover:border-black"
                            >
                              Clinica y tratamientos
                            </Link>
                          ) : isIndependent ? (
                            <span className="rounded-md border border-black/10 bg-[#F8F6F2] px-5 py-3 text-sm font-medium text-neutral-600">
                              Consulta independiente
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
