import type { Metadata } from "next";

import HomeClient from "./home-client";
import VerifiedReviews from "@/components/VerifiedReviews";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "EncuentraTuClinica | Compara clinicas y tratamientos esteticos",
  description:
    "Busca tratamientos de medicina estetica, compara clinicas verificadas y reserva con especialistas en Espana.",
  keywords: [
    "EncuentraTuClinica",
    "clinicas esteticas",
    "medicina estetica",
    "botox",
    "acido hialuronico",
    "armonizacion facial",
    "rinomodelacion",
    "especialistas estetica",
    "tratamientos esteticos",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "EncuentraTuClinica | Compara clinicas esteticas",
    description:
      "Encuentra tratamientos, clinicas verificadas y especialistas con disponibilidad real.",
    url: "/",
    siteName: "EncuentraTuClinica",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "EncuentraTuClinica marketplace de medicina estetica",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EncuentraTuClinica | Compara clinicas esteticas",
    description:
      "Busca tratamientos, compara clinicas y reserva con especialistas.",
    images: ["/og-image.jpg"],
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "EncuentraTuClinica",
            url: "https://encuentratuclinica.es",
            logo: "https://encuentratuclinica.es/og-image.jpg",
            sameAs: [],
          }),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalBusiness",
            name: "EncuentraTuClinica",
            description:
              "Marketplace para comparar clinicas, especialistas y tratamientos de medicina estetica.",
            url: "https://encuentratuclinica.es",
            areaServed: "Espana",
            medicalSpecialty: "AestheticMedicine",
          }),
        }}
      />

      <HomeClient />
      <VerifiedReviews />
    </>
  );
}
