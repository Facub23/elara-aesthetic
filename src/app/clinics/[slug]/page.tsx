import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ClinicProfilePageClient from "@/components/ClinicProfilePageClient";
import { getLocationSummary } from "@/lib/location-utils";
import {
  filterPublicRecords,
  isPublicPlaceholderRecord,
} from "@/lib/public-records";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

type ClinicPageProps = {
  params: Promise<{ slug: string }>;
};

function getClinicLocation(clinic: any) {
  return getLocationSummary({
    location: clinic.location,
    city: clinic.city,
    country: clinic.country,
  });
}

function getClinicDescription(clinic: any) {
  return (
    clinic.description ||
    `Compara tratamientos, especialistas y disponibilidad en ${clinic.name} dentro de EncuentraTuClinica.`
  );
}

async function getClinicBySlug(slug: string) {
  const { data } = await supabase
    .from("clinics")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return data;
}

async function getClinicPageData(slug: string) {
  const clinic = await getClinicBySlug(slug);

  if (!clinic || isPublicPlaceholderRecord(clinic)) {
    return null;
  }

  const { data: specialists } = await supabase
    .from("specialists")
    .select("*")
    .order("name", { ascending: true });

  return {
    clinic,
    specialists: filterPublicRecords(specialists || []).filter((specialist: any) => {
      const sameId =
        clinic.id &&
        specialist.clinic_id &&
        String(clinic.id) === String(specialist.clinic_id);
      const sameName =
        clinic.name &&
        specialist.clinic_name &&
        String(clinic.name).toLowerCase() ===
          String(specialist.clinic_name).toLowerCase();

      return sameId || sameName;
    }),
  };
}

export async function generateMetadata({
  params,
}: ClinicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);

  if (!clinic) {
    return {
      title: "Clinica no encontrada",
      description: "La clinica que buscas no esta disponible en EncuentraTuClinica.",
    };
  }

  const location = getClinicLocation(clinic);
  const description = getClinicDescription(clinic);
  const title = location
    ? `${clinic.name} en ${location} | Clinica verificada`
    : `${clinic.name} | Clinica verificada`;

  return {
    title,
    description,
    alternates: {
      canonical: `/clinics/${clinic.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/clinics/${clinic.slug}`,
      siteName: "EncuentraTuClinica",
      images: [
        {
          url: clinic.heroImage || clinic.image || "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: clinic.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [clinic.heroImage || clinic.image || "/og-image.jpg"],
    },
  };
}

export default async function ClinicPage({ params }: ClinicPageProps) {
  const { slug } = await params;
  const data = await getClinicPageData(slug);

  if (!data) {
    notFound();
  }

  const location = getClinicLocation(data.clinic);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalBusiness",
            name: data.clinic.name,
            description: getClinicDescription(data.clinic),
            image: data.clinic.heroImage || data.clinic.image || "/og-image.jpg",
            url: `/clinics/${data.clinic.slug}`,
            address: location,
            medicalSpecialty: "AestheticMedicine",
          }),
        }}
      />

      <ClinicProfilePageClient
        clinic={data.clinic}
        specialists={data.specialists}
      />
    </>
  );
}
