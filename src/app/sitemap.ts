import type { MetadataRoute } from "next";

import { supabase } from "@/lib/supabase";
import { getSiteUrl } from "@/lib/site-url";
import { getTreatmentName } from "@/lib/treatment-utils";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "-");
}

function getCityFromClinicName(clinicName?: string) {
  const value = clinicName?.toLowerCase() || "";

  if (value.includes("madrid")) return "madrid";
  if (value.includes("barcelona")) return "barcelona";
  if (value.includes("valencia")) return "valencia";

  return "";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const staticRoutes = [
    "",
    "/clinics",
    "/especialistas",
    "/tratamientos",
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

  clinics?.forEach((clinic: any) => {
    if (!clinic.slug) return;

    const url = `${baseUrl}/clinics/${clinic.slug}`;

    routes.set(url, {
      url,
      lastModified: new Date(),
    });
  });

  specialists?.forEach((specialist: any) => {
    if (!specialist.slug) return;

    const url = `${baseUrl}/especialistas/${specialist.slug}`;

    routes.set(url, {
      url,
      lastModified: new Date(),
    });
  });

  specialists?.forEach((specialist: any) => {
    if (!Array.isArray(specialist.treatments)) return;

    const city = getCityFromClinicName(specialist.clinic_name);

    specialist.treatments.forEach((treatment: any) => {
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
