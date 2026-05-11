import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import "./globals.css";

import { Footer } from "@/components/layout/footer";
import { PageTransition } from "@/components/providers/page-transition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {

  title: {
    default: "ELARA Aesthetic",
    template: "%s | ELARA Aesthetic",
  },

  description:
    "Luxury platform specialized in premium aesthetic clinics, facial harmonization, rejuvenation and advanced aesthetic medicine.",

  keywords: [
    "Aesthetic Clinics",
    "Luxury Clinics",
    "Facial Harmonization",
    "Aesthetic Medicine",
    "Botox",
    "Premium Beauty",
    "ELARA",
  ],

  authors: [
    {
      name: "ELARA",
    },
  ],

  creator: "ELARA",
  publisher: "ELARA",

  metadataBase: new URL("https://elara-aesthetic.com"),

  openGraph: {

    title: "ELARA Aesthetic",

    description:
      "Discover premium aesthetic clinics and luxury specialists in advanced aesthetic medicine.",

    url: "https://elara-aesthetic.com",

    siteName: "ELARA Aesthetic",

    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ELARA Aesthetic",
      },
    ],

    locale: "en_US",
    type: "website",

  },

  twitter: {

    card: "summary_large_image",

    title: "ELARA Aesthetic",

    description:
      "Luxury aesthetic clinics platform.",

    images: ["/og-image.jpg"],

  },

  icons: {
    icon: "/favicon.ico",
  },

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (

    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >

      <body className="min-h-full bg-white text-black">

        <PageTransition>

          <div className="flex min-h-screen flex-col">

            <div className="flex-1">

              {children}

            </div>

            <Footer />

          </div>

        </PageTransition>

        {/* FLOATING WHATSAPP */}

        <Link
          href="https://wa.me/34600111222"
          target="_blank"
          className="fixed bottom-6 right-6 z-[999] flex h-16 w-16 items-center justify-center rounded-full bg-black text-2xl text-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-all duration-300 hover:scale-110"
        >
          ✆
        </Link>

      </body>

    </html>
  );
}