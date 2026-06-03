"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Navbar } from "@/components/layout/navbar";
import { buildReviewSummaryMap, normalizeReviewKey } from "@/lib/review-summary";
import {
  getTreatmentName,
  getTreatmentPriceValue,
} from "@/lib/treatment-utils";

type TreatmentOption =
  | string
  | {
      name?: string | null;
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
  patients?: string | null;
  experience?: string | null;
  description?: string | null;
  treatments?: TreatmentOption[] | null;
};

type SpecialistRow = {
  id?: string | number | null;
  name?: string | null;
  slug?: string | null;
  clinic_id?: string | number | null;
  clinic_name?: string | null;
  specialty?: string | null;
  treatments?: TreatmentOption[] | null;
};

type NextSlot = {
  date: string;
  time: string;
  duration: number;
};

function normalizeText(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function slugify(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getClinicImage(clinic: ClinicRow) {
  return clinic.heroImage || clinic.image || "/og-image.jpg";
}

function getClinicLocation(clinic: ClinicRow) {
  return clinic.location || [clinic.city, clinic.country].filter(Boolean).join(", ");
}

function specialistBelongsToClinic(specialist: SpecialistRow, clinic: ClinicRow) {
  const sameId =
    clinic.id && specialist.clinic_id && String(clinic.id) === String(specialist.clinic_id);
  const sameName = normalizeText(clinic.name) === normalizeText(specialist.clinic_name);

  return sameId || sameName;
}

function specialistHasTreatment(specialist: SpecialistRow, treatment?: string | null) {
  if (!treatment) {
    return true;
  }

  return Boolean(
    specialist.treatments?.some(
      (item) => normalizeText(getTreatmentName(item)) === normalizeText(treatment)
    )
  );
}

function formatSlotLabel(slot?: NextSlot | null) {
  if (!slot) {
    return "Sin huecos proximos";
  }

  const date = new Date(`${slot.date}T00:00:00`);
  const label = date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return `${label} - ${slot.time}`;
}

function buildSpecialistHref({
  specialist,
  treatment,
  slot,
}: {
  specialist?: SpecialistRow;
  treatment?: string | null;
  slot?: NextSlot | null;
}) {
  if (!specialist?.slug) {
    return "/especialistas";
  }

  const params = new URLSearchParams();

  if (treatment) {
    params.set("treatment", treatment);
  }

  if (slot) {
    params.set("date", slot.date);
    params.set("time", slot.time);
  }

  const query = params.toString();

  return `/especialistas/${specialist.slug}${query ? `?${query}` : ""}`;
}

function ClinicsPageContent() {
  const searchParams = useSearchParams();
  const selectedTreatment = searchParams.get("treatment");
  const selectedCity = searchParams.get("city");

  const [search, setSearch] = useState("");
  const [city, setCity] = useState(selectedCity || "Todas");
  const [priceRange, setPriceRange] = useState("Todos");
  const [availabilityFilter, setAvailabilityFilter] = useState("Todos");
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [specialists, setSpecialists] = useState<SpecialistRow[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<
    { clinic_name?: string | null; rating?: string | number | null }[]
  >([]);
  const [nextSlots, setNextSlots] = useState<Record<string, NextSlot | null>>({});

  useEffect(() => {
    if (selectedCity) {
      setCity(selectedCity);
    }
  }, [selectedCity]);

  useEffect(() => {
    async function loadMarketplaceData() {
      const response = await fetch("/api/public-marketplace-data");
      const data = await response.json();

      setClinics((data.clinics || []) as ClinicRow[]);
      setSpecialists((data.specialists || []) as SpecialistRow[]);
      setApprovedReviews(data.reviews || []);
    }

    loadMarketplaceData();
  }, []);

  const clinicReviewSummaries = useMemo(
    () => buildReviewSummaryMap(approvedReviews, "clinic_name"),
    [approvedReviews]
  );

  const clinicContexts = useMemo(
    () =>
      clinics.map((clinic) => {
        const reviewSummary = clinicReviewSummaries.get(normalizeReviewKey(clinic.name));
        const clinicSpecialists = specialists.filter(
          (specialist) =>
            specialistBelongsToClinic(specialist, clinic) &&
            specialistHasTreatment(specialist, selectedTreatment)
        );
        const clinicTreatments = Array.from(
          new Set(
            clinicSpecialists.flatMap(
              (specialist) =>
                specialist.treatments?.map((treatment) => getTreatmentName(treatment)) || []
            )
          )
        ).filter(Boolean);
        const prices = clinicSpecialists
          .flatMap((specialist) => specialist.treatments || [])
          .filter((treatment) =>
            selectedTreatment
              ? normalizeText(getTreatmentName(treatment)) ===
                normalizeText(selectedTreatment)
              : true
          )
          .map((treatment) => getTreatmentPriceValue(treatment))
          .filter((price): price is number => Boolean(price));

        return {
          clinic: {
            ...clinic,
            location: getClinicLocation(clinic),
            rating: reviewSummary?.rating || null,
            patients: clinic.patients || "500+",
            experience: clinic.experience || "10 anos",
          },
          specialists: clinicSpecialists,
          treatments: clinicTreatments,
          primarySpecialist: clinicSpecialists[0],
          priceFrom: prices.length > 0 ? Math.min(...prices) : null,
          reviewSummary,
        };
      }),
    [clinicReviewSummaries, clinics, specialists, selectedTreatment]
  );

  const cities = useMemo(() => {
    const uniqueCities = Array.from(
      new Set(
        clinicContexts
          .map(({ clinic }) => clinic.city || clinic.location?.split(",")[0]?.trim())
          .filter(Boolean)
      )
    ).sort();

    return ["Todas", ...uniqueCities];
  }, [clinicContexts]);

  const filteredClinicContexts = useMemo(() => {
    return clinicContexts.filter(({ clinic, specialists: clinicSpecialists, treatments, priceFrom }) => {
      const searchValue = normalizeText(search);
      const matchesSearch =
        !searchValue ||
        normalizeText(clinic.name).includes(searchValue) ||
        normalizeText(clinic.location).includes(searchValue) ||
        normalizeText(clinic.city).includes(searchValue) ||
        normalizeText(clinic.description).includes(searchValue) ||
        treatments.some((treatment) => normalizeText(treatment).includes(searchValue));
      const matchesCity =
        city === "Todas" ||
        normalizeText(clinic.location).includes(normalizeText(city)) ||
        normalizeText(clinic.city).includes(normalizeText(city));
      const matchesTreatment = !selectedTreatment || clinicSpecialists.length > 0;
      const matchesPrice =
        priceRange === "Todos" ||
        (priceFrom !== null &&
          ((priceRange === "0-300" && priceFrom <= 300) ||
            (priceRange === "300-500" && priceFrom > 300 && priceFrom <= 500) ||
            (priceRange === "500+" && priceFrom > 500)));

      return matchesSearch && matchesCity && matchesTreatment && matchesPrice;
    });
  }, [clinicContexts, search, city, selectedTreatment, priceRange]);

  useEffect(() => {
    let cancelled = false;

    async function loadNextSlots() {
      const entries = await Promise.all(
        filteredClinicContexts.map(async ({ clinic, primarySpecialist }) => {
          const key = String(clinic.id || clinic.slug || clinic.name);

          if (!primarySpecialist?.name) {
            return [key, null] as const;
          }

          const params = new URLSearchParams({
            specialist: primarySpecialist.name,
          });

          if (selectedTreatment) {
            params.set("treatment", selectedTreatment);
          }

          try {
            const res = await fetch(`/api/next-available-slot?${params.toString()}`);
            const data = await res.json();

            return [key, data.slot || null] as const;
          } catch {
            return [key, null] as const;
          }
        })
      );

      if (!cancelled) {
        const nextSlotMap = Object.fromEntries(entries);
        setNextSlots(nextSlotMap);
      }
    }

    loadNextSlots();

    return () => {
      cancelled = true;
    };
  }, [filteredClinicContexts, selectedTreatment]);

  const visibleClinicContexts = useMemo(() => {
    if (availabilityFilter === "Todos") {
      return filteredClinicContexts;
    }

    return filteredClinicContexts.filter(({ clinic }) => {
      const clinicKey = String(clinic.id || clinic.slug || clinic.name);
      const hasSlot = Boolean(nextSlots[clinicKey]);

      return availabilityFilter === "Con huecos" ? hasSlot : !hasSlot;
    });
  }, [availabilityFilter, filteredClinicContexts, nextSlots]);

  const specialistCount = new Set(
    visibleClinicContexts.flatMap(({ specialists: clinicSpecialists }) =>
      clinicSpecialists.map((specialist) => String(specialist.id || specialist.slug))
    )
  ).size;

  function formatPrice(value?: number | null) {
    if (!value) return "Consultar";

    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F6F3EE] text-black">
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: selectedTreatment
              ? `Clinicas para ${selectedTreatment}`
              : "Clinicas premium EncuentraTuClinica",
            description:
              "Marketplace premium de clinicas de medicina estetica con especialistas y disponibilidad real.",
            url: selectedTreatment
              ? `https://encuentratuclinica.es/clinics?treatment=${selectedTreatment}`
              : "https://encuentratuclinica.es/clinics",
          }),
        }}
      />

      <section className="border-b border-black/10 px-6 pb-12 pt-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-neutral-500">
              Marketplace de clinicas
            </p>

            <h1 className="mt-6 max-w-5xl text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-7xl">
              {selectedTreatment
                ? `Clinicas con disponibilidad para ${selectedTreatment}`
                : "Compara clinicas y reserva con especialistas verificados."}
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-neutral-600 md:text-xl">
              Compara clinicas premium por tratamientos, especialistas, precio
              orientativo y primer hueco disponible antes de avanzar a reserva.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-black/10 bg-white/85 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.05)] sm:grid-cols-3">
            {[
              ["Clinicas", visibleClinicContexts.length],
              ["Especialistas", specialistCount],
              ["Ciudades", cities.length - 1],
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
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-3 rounded-lg border border-black/10 bg-white/90 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.04)] md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]">
            <input
              type="text"
              placeholder="Buscar clinica, ciudad o tratamiento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 rounded-md border border-black/10 bg-[#F8F6F2] px-4 text-sm outline-none focus:border-black"
            />

            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="h-12 rounded-md border border-black/10 bg-[#F8F6F2] px-4 text-sm outline-none focus:border-black"
            >
              {cities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={priceRange}
              onChange={(event) => setPriceRange(event.target.value)}
              className="h-12 rounded-md border border-black/10 bg-[#F8F6F2] px-4 text-sm outline-none focus:border-black"
            >
              <option value="Todos">Cualquier precio</option>
              <option value="0-300">Hasta 300 EUR</option>
              <option value="300-500">300-500 EUR</option>
              <option value="500+">Mas de 500 EUR</option>
            </select>

            <select
              value={availabilityFilter}
              onChange={(event) => setAvailabilityFilter(event.target.value)}
              className="h-12 rounded-md border border-black/10 bg-[#F8F6F2] px-4 text-sm outline-none focus:border-black"
            >
              <option value="Todos">Toda disponibilidad</option>
              <option value="Con huecos">Con huecos</option>
              <option value="Sin huecos">Sin huecos</option>
            </select>

            <Link
              href="/tratamientos"
              className="flex h-12 items-center justify-center rounded-md bg-black px-6 text-sm font-medium text-white transition hover:opacity-90"
            >
              Ver tratamientos
            </Link>
          </div>

          {selectedTreatment && (
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/tratamientos/${slugify(selectedTreatment)}`}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm transition hover:border-black"
              >
                Ver ficha de {selectedTreatment}
              </Link>

              <Link
                href={`/especialistas?treatment=${encodeURIComponent(selectedTreatment)}`}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm transition hover:border-black"
              >
                Ver especialistas disponibles
              </Link>

              <Link
                href="/clinics"
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm transition hover:border-black"
              >
                Limpiar tratamiento
              </Link>
            </div>
          )}

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {[
              ["Comparacion", "Ciudad, tratamientos y especialistas en una sola vista."],
              ["Agenda", "Primer hueco estimado desde disponibilidad real."],
              ["Precios", "Importe orientativo cuando el especialista lo informa."],
              ["Reserva", "Acceso directo al perfil con fecha y hora sugeridas."],
            ].map(([label, text]) => (
              <div key={label} className="rounded-lg border border-black/5 bg-white/70 p-5">
                <p className="text-sm font-semibold">{label}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
              Resultados
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              {visibleClinicContexts.length} clinicas para comparar
            </h2>
          </div>

          {visibleClinicContexts.length === 0 ? (
            <div className="rounded-lg border border-black/10 bg-white p-10 text-center">
              <h3 className="text-2xl font-semibold">No encontramos clinicas</h3>
              <p className="mt-3 text-neutral-500">
                Prueba con otra ciudad, busqueda o tratamiento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {visibleClinicContexts.map(
                ({
                  clinic,
                  specialists: clinicSpecialists,
                  treatments,
                  primarySpecialist,
                  priceFrom,
                  reviewSummary,
                }) => {
                  const clinicKey = String(clinic.id || clinic.slug || clinic.name);
                  const nextSlot = nextSlots[clinicKey];
                  const specialistHref = buildSpecialistHref({
                    specialist: primarySpecialist,
                    treatment: selectedTreatment,
                    slot: nextSlot,
                  });

                  return (
                    <article
                      key={clinicKey}
                      className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_12px_45px_rgba(0,0,0,0.04)] transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(0,0,0,0.08)]"
                    >
                      <div className="relative h-[360px] overflow-hidden bg-[#E7DED1]">
                        <Image
                          src={getClinicImage(clinic)}
                          alt={clinic.name || "Clinica EncuentraTuClinica"}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover transition duration-700 hover:scale-105"
                        />

                        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                          <div className="rounded-full bg-white px-3 py-1 text-sm font-medium">
                            {reviewSummary
                              ? `${reviewSummary.rating} - ${reviewSummary.count} opiniones`
                              : "Sin opiniones verificadas"}
                          </div>
                          <div className="rounded-full bg-black px-3 py-1 text-sm text-white">
                            {clinic.location}
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-3xl font-semibold tracking-tight">
                              {clinic.name}
                            </h3>
                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
                              {clinic.description ||
                                `${clinic.name || "Clinica"} forma parte del marketplace premium de EncuentraTuClinica.`}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                          <div className="rounded-md bg-[#F8F6F2] p-3">
                            <div className="text-xl font-semibold">
                              {clinicSpecialists.length}
                            </div>
                            <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                              Especialistas
                            </div>
                          </div>
                          <div className="rounded-md bg-[#F8F6F2] p-3">
                            <div className="text-xl font-semibold">{treatments.length}</div>
                            <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                              Tratamientos
                            </div>
                          </div>
                          <div className="rounded-md bg-black p-3 text-white">
                            <div className="text-sm font-semibold">
                              {formatSlotLabel(nextSlot)}
                            </div>
                            <div className="text-xs uppercase tracking-[0.16em] text-white/50">
                              Proximo hueco
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 rounded-md border border-black/10 bg-white p-4 text-sm">
                          Precio orientativo:{" "}
                          <span className="font-semibold">
                            {priceFrom
                              ? `desde ${formatPrice(priceFrom)}`
                              : "a consultar"}
                          </span>
                        </div>

                        {selectedTreatment && primarySpecialist && (
                          <div className="mt-5 rounded-md bg-[#F8F6F2] p-4 text-sm">
                            Primer especialista disponible:{" "}
                            <span className="font-semibold">{primarySpecialist.name}</span>
                          </div>
                        )}

                        <div className="mt-5 flex flex-wrap gap-2">
                          {treatments.slice(0, 5).map((treatment) => (
                            <Link
                              key={treatment}
                              href={`/tratamientos/${slugify(treatment)}`}
                              className={`rounded-full px-3 py-1 text-xs transition ${
                                selectedTreatment &&
                                normalizeText(selectedTreatment) === normalizeText(treatment)
                                  ? "bg-black text-white"
                                  : "bg-[#F8F6F2] text-neutral-600 hover:bg-black hover:text-white"
                              }`}
                            >
                              {treatment}
                            </Link>
                          ))}
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                          <Link
                            href={specialistHref}
                            className="rounded-md bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                          >
                            Reservar con especialista
                          </Link>

                          <Link
                            href={`/clinics/${clinic.slug}`}
                            className="rounded-md border border-black/10 px-5 py-3 text-sm font-medium transition hover:border-black"
                          >
                            Ver clinica
                          </Link>

                          <Link
                            href={`/tratamientos?clinic=${clinic.slug}`}
                            className="rounded-md border border-black/10 px-5 py-3 text-sm font-medium transition hover:border-black"
                          >
                            Ver tratamientos
                          </Link>

                          <Link
                            href={`/especialistas?clinic=${clinic.slug}${
                              selectedTreatment
                                ? `&treatment=${encodeURIComponent(selectedTreatment)}`
                                : ""
                            }`}
                            className="rounded-md border border-black/10 px-5 py-3 text-sm font-medium transition hover:border-black"
                          >
                            Ver especialistas
                          </Link>
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

export default function ClinicsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen overflow-x-hidden bg-[#F6F3EE] text-black">
          <Navbar />
        </main>
      }
    >
      <ClinicsPageContent />
    </Suspense>
  );
}
