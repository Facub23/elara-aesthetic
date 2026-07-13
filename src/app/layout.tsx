import type { Metadata, Viewport } from "next";

import "./globals.css";

import { PublicChrome } from "@/components/layout/public-chrome";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "EncuentraTuClinica | Clinicas y especialistas premium en medicina estetica",
    template: "%s | EncuentraTuClinica",
  },

  description:
    "EncuentraTuClinica es una plataforma premium para descubrir clinicas, especialistas y tratamientos de medicina estetica avanzada en Espana.",

  keywords: [
    "EncuentraTuClinica",
    "medicina estetica",
    "clinicas esteticas",
    "clinicas premium",
    "especialistas estetica",
    "botox",
    "acido hialuronico",
    "armonizacion facial",
    "rinomodelacion",
    "bioestimuladores",
    "tratamientos esteticos",
    "medicina estetica Espana",
  ],

  authors: [{ name: "EncuentraTuClinica" }],
  creator: "EncuentraTuClinica",
  publisher: "EncuentraTuClinica",

  applicationName: "EncuentraTuClinica",
  category: "Health",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "es_ES",
    url: siteUrl,
    siteName: "EncuentraTuClinica",
    title: "EncuentraTuClinica | Medicina estetica premium",
    description:
      "Descubre clinicas, especialistas y tratamientos premium de medicina estetica avanzada.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "EncuentraTuClinica Medicina Estetica Premium",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "EncuentraTuClinica | Medicina estetica premium",
    description:
      "Descubre clinicas, especialistas y tratamientos premium de medicina estetica avanzada.",
    images: ["/og-image.jpg"],
  },

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F6F3EE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="min-h-full bg-white text-black">
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>

          <PublicChrome />
        </div>

      </body>
    </html>
  );
}
