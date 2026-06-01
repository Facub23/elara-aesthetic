import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ClinicProfilePageClient from "@/components/ClinicProfilePageClient";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

type ClinicPageProps = {
  params: Promise<{ slug: string }>;
};

function getClinicLocation(clinic: any) {
  return clinic.location || [clinic.city, clinic.country].filter(Boolean).join(", ");
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

  if (!clinic) {
    return null;
  }

  const [{ data: specialists }, { data: reviews }] = await Promise.all([
    supabase
      .from("specialists")
      .select("*")
      .eq("clinic_name", clinic.name)
      .order("name", { ascending: true }),
    supabase
      .from("reviews")
      .select("*")
      .eq("clinic_name", clinic.name)
      .eq("status", "Aprobada")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  return {
    clinic,
    specialists: specialists || [],
    reviews: reviews || [],
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

  return (
    <ClinicProfilePageClient
      clinic={data.clinic}
      specialists={data.specialists}
      reviews={data.reviews}
    />
  );
}
