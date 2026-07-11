"use client";

import Link from "next/link";

export function Footer() {
  const navigationLinks = [
    ["Inicio", "/"],
    ["Clinicas verificadas", "/clinics"],
    ["Tratamientos", "/tratamientos"],
    ["Especialistas", "/especialistas"],
    ["Mi cuenta", "/mi-cuenta"],
  ];
  const treatmentLinks = [
    ["Botox", "/tratamientos/botox"],
    ["Acido hialuronico", "/tratamientos/acido-hialuronico"],
    ["Rinomodelacion", "/tratamientos/rinomodelacion"],
    ["Botox en Madrid", "/madrid/botox"],
  ];
  const trustItems = [
    "Clinicas verificadas",
    "Especialistas conectados a cada clinica",
    "Reservas con disponibilidad real",
  ];

  return (
    <footer
      id="contacto"
      className="relative overflow-hidden border-t border-black/10 bg-white"
    >
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-12 grid gap-5 rounded-lg bg-black p-6 text-white md:grid-cols-[1.2fr_0.8fr] md:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/50">
              Marketplace de medicina estetica
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
              Compara clinicas, especialistas y tratamientos antes de reservar.
            </h2>
          </div>

          <div className="flex flex-col justify-end gap-3 sm:flex-row md:flex-col">
            <Link
              href="/especialistas"
              className="rounded-md bg-white px-5 py-3 text-center text-sm font-medium text-black transition hover:bg-white/90"
            >
              Buscar disponibilidad
            </Link>
            <Link
              href="/clinics"
              className="rounded-md border border-white/20 px-5 py-3 text-center text-sm font-medium text-white transition hover:bg-white hover:text-black"
            >
              Comparar clinicas
            </Link>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr]">
          <div>
            <div className="text-3xl font-semibold tracking-tight md:text-4xl">
              EncuentraTuClinica
            </div>

            <p className="mt-5 max-w-xl text-base leading-7 text-neutral-600">
              Marketplace especializado en clinicas verificadas, tratamientos
              de medicina estetica y especialistas premium en Espana.
            </p>

            <div className="mt-6 grid gap-2">
              {trustItems.map((item) => (
                <div key={item} className="rounded-md bg-[#F8F6F2] px-4 py-3 text-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Navegacion
            </div>

            <div className="mt-8 flex flex-col gap-5">
              {navigationLinks.map(([label, href]) => (
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
              Comparar
            </div>

            <div className="mt-8 flex flex-col gap-5">
              {treatmentLinks.map(([label, href]) => (
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
          <div>Copyright 2026 EncuentraTuClinica. Todos los derechos reservados.</div>

          <div className="flex items-center gap-6">
            <Link href="/privacidad" className="transition hover:text-black">
              Privacidad
            </Link>

            <Link href="/terminos" className="transition hover:text-black">
              Terminos
            </Link>

            <Link href="/aviso-legal" className="transition hover:text-black">
              Aviso legal
            </Link>

            <Link href="/cookies" className="transition hover:text-black">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
