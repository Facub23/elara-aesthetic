"use client";

import { usePathname } from "next/navigation";

import { Footer } from "@/components/layout/footer";

export function PublicChrome() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || pathname === "/login") {
    return null;
  }

  return (
    <>
      <Footer />

      <a
        href="https://wa.me/34600111222"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-6 right-6 z-[999] hidden h-16 w-16 items-center justify-center rounded-full bg-black text-sm font-semibold text-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-all duration-300 hover:scale-110 md:flex"
      >
        WA
      </a>
    </>
  );
}
