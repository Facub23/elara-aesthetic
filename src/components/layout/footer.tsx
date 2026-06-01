"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer
      id="contacto"
      className="relative overflow-hidden border-t border-black/5 bg-white"
    >
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="text-4xl font-semibold tracking-tight">
              EncuentraTuClinica
            </div>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-600">
              Marketplace especializado en clinicas verificadas, tratamientos
              de medicina estetica y especialistas premium.
            </p>

            <div className="mt-10 flex items-center gap-4">
              {["IG", "TW", "IN"].map((label) => (
                <a
                  key={label}
                  href="#contacto"
                  aria-label={label}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-black/5 bg-[#f5f5f5] transition hover:scale-105"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Navegacion
            </div>

            <div className="mt-8 flex flex-col gap-5">
              {[
                ["Inicio", "/"],
                ["Clinicas", "/clinics"],
                ["Tratamientos", "/tratamientos"],
                ["Especialistas", "/especialistas"],
                ["Mi cuenta", "/mi-cuenta"],
              ].map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="text-neutral-600 transition hover:text-black"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Contacto
            </div>

            <div className="mt-8 flex flex-col gap-5 text-neutral-600">
              <a
                href="mailto:hello@encuentratuclinica.es"
                className="transition hover:text-black"
              >
                hello@encuentratuclinica.es
              </a>

              <a href="tel:+34600111222" className="transition hover:text-black">
                +34 600 111 222
              </a>

              <div>Madrid, Espana</div>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-black/5 pt-8 text-sm text-neutral-500 md:flex-row">
          <div>Copyright 2026 EncuentraTuClinica. All rights reserved.</div>

          <div className="flex items-center gap-6">
            <Link href="/" className="transition hover:text-black">
              Privacidad
            </Link>

            <Link href="/" className="transition hover:text-black">
              Terminos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
