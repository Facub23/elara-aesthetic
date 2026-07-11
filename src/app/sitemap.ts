import type { MetadataRoute } from "next";

import { filterPublicRecords } from "@/lib/public-records";
import { supabase } from "@/lib/supabase";
import { getSiteUrl } from "@/lib/site-url";
import { getTreatmentName } from "@/lib/treatment-utils";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getClinicCity(clinic?: { city?: string | null; location?: string | null }) {
  return clinic?.city || clinic?.location?.split(",")[0]?.trim() || "";
}

function normalize(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

type ClinicRow = {
  id?: string | number | null;
  name?: string | null;
  slug?: string | null;
  city?: string | null;
  location?: string | null;
};

type TreatmentOption =
  | string
  | {
      name?: string | null;
    };

type SpecialistRow = {
  id?: string | number | null;
  name?: string | null;
  slug?: string | null;
  clinic_id?: string | number | null;
  clinic_name?: string | null;
  treatments?: TreatmentOption[] | null;
};

function getSpecialistClinic(
  specialist: SpecialistRow,
  clinicsById: Map<string, ClinicRow>,
  clinicsByName: Map<string, ClinicRow>
) {
  return (
    (specialist.clinic_id && clinicsById.get(String(specialist.clinic_id))) ||
    clinicsByName.get(normalize(specialist.clinic_name))
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const staticRoutes = [
    "",
    "/clinics",
    "/especialistas",
    "/tratamientos",
    "/privacidad",
    "/terminos",
    "/aviso-legal",
    "/cookies",
  ];

  const { data: clinics } = await supabase.from("clinics").select("*");
  const { data: specialists } = await supabase.from("specialists").select("*");

  const routes = new Map<string, MetadataRoute.Sitemap[number]>();

  staticRoutes.forEach((route) => {
    routes.set(`${baseUrl}${route}`, {
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
    });
  });

  const publicClinics = filterPublicRecords((clinics || []) as ClinicRow[]);
  const publicSpecialists = filterPublicRecords((specialists || []) as SpecialistRow[]);
  const clinicsById = new Map(
    publicClinics.filter((clinic) => clinic.id).map((clinic) => [String(clinic.id), clinic])
  );
  const clinicsByName = new Map(
    publicClinics.filter((clinic) => clinic.name).map((clinic) => [normalize(clinic.name), clinic])
  );

  publicClinics.forEach((clinic) => {
    if (!clinic.slug) return;

    const url = `${baseUrl}/clinics/${clinic.slug}`;

    routes.set(url, {
      url,
      lastModified: new Date(),
    });
  });

  publicSpecialists.forEach((specialist) => {
    if (!specialist.slug) return;

    const url = `${baseUrl}/especialistas/${specialist.slug}`;

    routes.set(url, {
      url,
      lastModified: new Date(),
    });
  });

  publicSpecialists.forEach((specialist) => {
    if (!Array.isArray(specialist.treatments)) return;

    const clinic = getSpecialistClinic(specialist, clinicsById, clinicsByName);
    const city = slugify(getClinicCity(clinic));

    specialist.treatments.forEach((treatment) => {
      const treatmentName = getTreatmentName(treatment);

      if (!treatmentName) return;

      const treatmentSlug = slugify(treatmentName);

      const treatmentUrl = `${baseUrl}/tratamientos/${treatmentSlug}`;

      routes.set(treatmentUrl, {
        url: treatmentUrl,
        lastModified: new Date(),
      });

      if (city) {
        const cityTreatmentUrl = `${baseUrl}/${city}/${treatmentSlug}`;

        routes.set(cityTreatmentUrl, {
          url: cityTreatmentUrl,
          lastModified: new Date(),
        });
      }
    });
  });

  return Array.from(routes.values());
}
