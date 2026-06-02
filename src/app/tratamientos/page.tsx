import type { Metadata } from "next";
import Link from "next/link";

import { Navbar } from "@/components/layout/navbar";
import { filterPublicRecords } from "@/lib/public-records";
import { supabase } from "@/lib/supabase";
import {
  getTreatmentCategory,
  getTreatmentName as readTreatmentName,
  getTreatmentPriceValue,
} from "@/lib/treatment-utils";

export const metadata: Metadata = {
  title: "Tratamientos premium de medicina estetica",
  description:
    "Compara tratamientos de medicina estetica, clinicas verificadas y especialistas premium dentro de EncuentraTuClinica.",
  keywords: [
    "tratamientos esteticos",
    "botox",
    "acido hialuronico",
    "armonizacion facial",
    "bioestimuladores",
    "rinomodelacion",
    "marketplace medicina estetica",
    "EncuentraTuClinica",
  ],
  alternates: {
    canonical: "/tratamientos",
  },
  openGraph: {
    title: "Marketplace de tratamientos",
    description:
      "Explora tratamientos, compara clinicas y elige especialistas premium en medicina estetica.",
    url: "/tratamientos",
    siteName: "EncuentraTuClinica",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Tratamientos premium EncuentraTuClinica",
      },
    ],
  },
};

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
  specialty?: string | null;
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
  treatments?: TreatmentOption[] | null;
};

type TreatmentRecord = {
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  image?: string | null;
  price?: string | number | null;
  category?: string | null;
};

type MarketplaceTreatment = {
  name: string;
  slug: string;
  description: string;
  category: string;
  specialistCount: number;
  clinicCount: number;
  cities: string[];
  clinicNames: string[];
  specialists: SpecialistRow[];
  priceFrom?: number;
};

const categoryLabels = [
  "Todos",
  "Facial",
  "Labios",
  "Piel",
  "Corporal",
  "Regenerativo",
];

function getTreatmentName(treatment: TreatmentOption) {
  return readTreatmentName(treatment) || "Tratamiento";
}

function getTreatmentPrice(treatment: TreatmentOption | TreatmentRecord) {
  return getTreatmentPriceValue(treatment) || undefined;
}

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

function inferCategory(name: string, explicit?: string | null) {
  if (explicit) {
    return explicit;
  }

  const text = normalize(name);

  if (text.includes("labial") || text.includes("labio")) return "Labios";
  if (text.includes("piel") || text.includes("laser") || text.includes("peeling")) {
    return "Piel";
  }
  if (text.includes("corporal") || text.includes("celulitis")) return "Corporal";
  if (text.includes("bioestimul") || text.includes("plasma")) return "Regenerativo";

  return "Facial";
}

function getClinicCity(clinic?: ClinicRow) {
  if (!clinic) {
    return "";
  }

  return clinic.city || clinic.location?.split(",")[0]?.trim() || "";
}

function getDefaultDescription(name: string, specialistCount: number, clinicCount: number) {
  return `${name} con ${specialistCount} especialista${
    specialistCount === 1 ? "" : "s"
  } y ${clinicCount} clinica${clinicCount === 1 ? "" : "s"} verificada${
    clinicCount === 1 ? "" : "s"
  } dentro de EncuentraTuClinica.`;
}

function buildMarketplaceTreatments({
  specialists,
  clinics,
  treatmentRecords,
  clinicSlug,
}: {
  specialists: SpecialistRow[];
  clinics: ClinicRow[];
  treatmentRecords: TreatmentRecord[];
  clinicSlug?: string;
}) {
  const clinicsById = new Map(
    clinics.filter((clinic) => clinic.id).map((clinic) => [String(clinic.id), clinic])
  );
  const clinicsByName = new Map(
    clinics.filter((clinic) => clinic.name).map((clinic) => [normalize(clinic.name), clinic])
  );
  const treatmentsBySlug = new Map(
    treatmentRecords
      .filter((treatment) => treatment.name || treatment.slug)
      .map((treatment) => [treatment.slug || slugify(treatment.name || ""), treatment])
  );

  const selectedClinic = clinicSlug
    ? clinics.find((clinic) => clinic.slug === clinicSlug)
    : undefined;

  const catalog = new Map<
    string,
    MarketplaceTreatment & {
      specialistIds: Set<string>;
      clinicKeys: Set<string>;
      citySet: Set<string>;
      priceValues: number[];
    }
  >();

  specialists.forEach((specialist) => {
    const clinic =
      (specialist.clinic_id && clinicsById.get(String(specialist.clinic_id))) ||
      clinicsByName.get(normalize(specialist.clinic_name));

    if (selectedClinic) {
      const sameClinicId =
        selectedClinic.id &&
        specialist.clinic_id &&
        String(selectedClinic.id) === String(specialist.clinic_id);
      const sameClinicName =
        selectedClinic.name &&
        normalize(selectedClinic.name) === normalize(specialist.clinic_name);

      if (!sameClinicId && !sameClinicName) {
        return;
      }
    }

    if (!Array.isArray(specialist.treatments)) {
      return;
    }

    specialist.treatments.forEach((treatment) => {
      const name = getTreatmentName(treatment);

      if (!name || name === "Tratamiento") {
        return;
      }

      const slug = slugify(name);
      const record = treatmentsBySlug.get(slug);
      const category = inferCategory(
        name,
        record?.category || getTreatmentCategory(treatment)
      );
      const description =
        record?.description ||
        (typeof treatment === "string" ? "" : treatment.description) ||
        "";

      if (!catalog.has(slug)) {
        catalog.set(slug, {
          name,
          slug,
          description,
          category,
          specialistCount: 0,
          clinicCount: 0,
          cities: [],
          clinicNames: [],
          specialists: [],
          specialistIds: new Set(),
          clinicKeys: new Set(),
          citySet: new Set(),
          priceValues: [],
        });
      }

      const item = catalog.get(slug)!;
      const specialistKey = String(specialist.id || specialist.slug || specialist.name || "");
      const clinicKey = String(clinic?.id || specialist.clinic_name || "");
      const city = getClinicCity(clinic);
      const price = getTreatmentPrice(treatment) || getTreatmentPrice(record || {});

      if (specialistKey && !item.specialistIds.has(specialistKey)) {
        item.specialistIds.add(specialistKey);
        item.specialists.push(specialist);
      }

      if (clinicKey) {
        item.clinicKeys.add(clinicKey);
      }

      if (clinic?.name || specialist.clinic_name) {
        item.clinicNames.push(clinic?.name || specialist.clinic_name || "");
      }

      if (city) {
        item.citySet.add(city);
      }

      if (price) {
        item.priceValues.push(price);
      }
    });
  });

  return Array.from(catalog.values())
    .map((item) => {
      const priceFrom =
        item.priceValues.length > 0 ? Math.min(...item.priceValues) : undefined;

      return {
        name: item.name,
        slug: item.slug,
        description:
          item.description ||
          getDefaultDescription(item.name, item.specialistIds.size, item.clinicKeys.size),
        category: item.category,
        specialistCount: item.specialistIds.size,
        clinicCount: item.clinicKeys.size,
        cities: Array.from(item.citySet).sort(),
        clinicNames: Array.from(new Set(item.clinicNames.filter(Boolean))).sort(),
        specialists: item.specialists,
        priceFrom,
      };
    })
    .sort((a, b) => {
      const popularity = b.specialistCount + b.clinicCount - (a.specialistCount + a.clinicCount);

      if (popularity !== 0) {
        return popularity;
      }

      return a.name.localeCompare(b.name, "es");
    });
}

export default async function TreatmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    clinic?: string;
    q?: string;
    city?: string;
    category?: string;
  }>;
}) {
  const params = await searchParams;
  const clinicSlug = params.clinic;
  const query = params.q || "";
  const selectedCity = params.city || "Todas";
  const selectedCategory = params.category || "Todos";

  const [{ data: specialists }, { data: clinics }, { data: treatmentRecords }] =
    await Promise.all([
      supabase.from("specialists").select("*"),
      supabase.from("clinics").select("*"),
      supabase.from("treatments").select("*"),
    ]);

  const publicClinics = filterPublicRecords((clinics || []) as ClinicRow[]);
  const publicSpecialists = filterPublicRecords((specialists || []) as SpecialistRow[]);
  const publicTreatmentRecords = filterPublicRecords(
    (treatmentRecords || []) as TreatmentRecord[]
  );

  const clinicName =
    clinicSlug && publicClinics
      ? publicClinics.find((clinic: ClinicRow) => clinic.slug === clinicSlug)?.name || ""
      : "";

  const catalog = buildMarketplaceTreatments({
    specialists: publicSpecialists,
    clinics: publicClinics,
    treatmentRecords: publicTreatmentRecords,
    clinicSlug,
  });

  const cities = [
    "Todas",
    ...Array.from(new Set(catalog.flatMap((treatment) => treatment.cities))).sort(),
  ];

  const filteredTreatments = catalog.filter((treatment) => {
    const searchValue = normalize(query);
    const matchesSearch =
      !searchValue ||
      normalize(treatment.name).includes(searchValue) ||
      normalize(treatment.description).includes(searchValue) ||
      treatment.clinicNames.some((clinic) => normalize(clinic).includes(searchValue));
    const matchesCity =
      selectedCity === "Todas" || treatment.cities.includes(selectedCity);
    const matchesCategory =
      selectedCategory === "Todos" || treatment.category === selectedCategory;

    return matchesSearch && matchesCity && matchesCategory;
  });

  const totalSpecialists = new Set(
    catalog.flatMap((treatment) =>
      treatment.specialists.map((specialist) => String(specialist.id || specialist.slug))
    )
  ).size;
  const totalClinics = new Set(catalog.flatMap((treatment) => treatment.clinicNames)).size;
  const popularTreatments = catalog.slice(0, 4);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F6F3EE] text-black">
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalWebPage",
            name: clinicName ? `Tratamientos en ${clinicName}` : "Marketplace de tratamientos EncuentraTuClinica",
            description:
              "Marketplace premium de tratamientos de medicina estetica con clinicas y especialistas verificados.",
            url: clinicSlug ? `/tratamientos?clinic=${clinicSlug}` : "/tratamientos",
          }),
        }}
      />

      <section className="border-b border-black/10 px-6 pb-12 pt-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-neutral-500">
              Marketplace de tratamientos
            </p>

            <h1 className="mt-6 max-w-5xl text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-7xl">
              {clinicName
                ? `Tratamientos disponibles en ${clinicName}`
                : "Encuentra el tratamiento y compara donde reservarlo."}
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-neutral-600 md:text-xl">
              Explora procedimientos, clinicas verificadas y especialistas para
              pasar de la busqueda a la reserva con informacion clara.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-black/10 bg-white/85 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.05)] sm:grid-cols-3">
            {[
              ["Tratamientos", catalog.length],
              ["Clinicas", totalClinics],
              ["Especialistas", totalSpecialists],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-[#F6F3EE] p-4">
                <div className="text-2xl font-semibold">{value}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
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
            action="/tratamientos"
            className="grid gap-3 rounded-lg border border-black/10 bg-white/90 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.04)] md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]"
          >
            {clinicSlug && <input type="hidden" name="clinic" value={clinicSlug} />}

            <input
              name="q"
              defaultValue={query}
              placeholder="Buscar botox, labios, piel, clinica..."
              className="h-12 rounded-md border border-black/10 bg-[#F8F6F2] px-4 text-sm outline-none focus:border-black"
            />

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
              name="category"
              defaultValue={selectedCategory}
              className="h-12 rounded-md border border-black/10 bg-[#F8F6F2] px-4 text-sm outline-none focus:border-black"
            >
              {categoryLabels.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="h-12 rounded-md bg-black px-6 text-sm font-medium text-white transition hover:opacity-90"
            >
              Buscar
            </button>
          </form>

          {popularTreatments.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {popularTreatments.map((treatment) => (
                <Link
                  key={treatment.slug}
                  href={`/tratamientos/${treatment.slug}`}
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm transition hover:border-black"
                >
                  {treatment.name}
                </Link>
              ))}
            </div>
          )}
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
                {filteredTreatments.length} opciones para comparar
              </h2>
            </div>

            {(query || selectedCity !== "Todas" || selectedCategory !== "Todos" || clinicSlug) && (
              <Link
                href="/tratamientos"
                className="text-sm font-medium underline underline-offset-4"
              >
                Limpiar filtros
              </Link>
            )}
          </div>

          {filteredTreatments.length === 0 ? (
            <div className="rounded-lg border border-black/10 bg-white p-10 text-center">
              <h2 className="text-2xl font-semibold">No hay tratamientos con esos filtros</h2>

              <p className="mt-3 text-neutral-500">
                Prueba otra ciudad, categoria o busqueda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredTreatments.map((treatment) => {
                const price = formatPrice(treatment.priceFrom);

                return (
                  <article
                    key={treatment.slug}
                    className="flex min-h-[380px] flex-col rounded-lg border border-black/10 bg-white p-6 shadow-[0_12px_45px_rgba(0,0,0,0.04)] transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(0,0,0,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="rounded-full bg-[#F0ECE5] px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-600">
                        {treatment.category}
                      </div>

                      {price && (
                        <div className="text-right text-sm text-neutral-500">
                          Desde
                          <div className="text-lg font-semibold text-black">{price}</div>
                        </div>
                      )}
                    </div>

                    <h3 className="mt-6 text-3xl font-semibold leading-tight">
                      {treatment.name}
                    </h3>

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-neutral-600">
                      {treatment.description}
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-md bg-[#F8F6F2] p-4">
                        <div className="text-2xl font-semibold">{treatment.clinicCount}</div>
                        <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                          Clinicas
                        </div>
                      </div>

                      <div className="rounded-md bg-[#F8F6F2] p-4">
                        <div className="text-2xl font-semibold">
                          {treatment.specialistCount}
                        </div>
                        <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                          Especialistas
                        </div>
                      </div>
                    </div>

                    {treatment.cities.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {treatment.cities.slice(0, 4).map((city) => (
                          <Link
                            key={city}
                            href={`/${slugify(city)}/${treatment.slug}`}
                            className="rounded-full bg-[#F8F6F2] px-3 py-1 text-xs text-neutral-600 transition hover:bg-black hover:text-white"
                          >
                            {city}
                          </Link>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto flex flex-wrap gap-3 pt-8">
                      <Link
                        href={`/tratamientos/${treatment.slug}`}
                        className="rounded-md bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                      >
                        Ver tratamiento
                      </Link>

                      <Link
                        href={`/especialistas?treatment=${encodeURIComponent(treatment.name)}${
                          clinicSlug ? `&clinic=${clinicSlug}` : ""
                        }`}
                        className="rounded-md border border-black/10 px-5 py-3 text-sm font-medium transition hover:border-black"
                      >
                        Elegir especialista
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
