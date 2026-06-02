"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

import { Navbar } from "@/components/layout/navbar";
import { SearchBar } from "@/components/search/search-bar";
import { clinics } from "@/data/clinics";
import { getTreatmentName } from "@/lib/treatment-utils";

type TreatmentSummary =
  | string
  | {
      name?: string;
    };

export default function HomeClient() {
  const featuredClinics = clinics.slice(0, 3);

  return (
    <main className="min-h-screen overflow-hidden bg-[#F6F3EE] text-black">
      <Navbar />

      <section className="relative overflow-hidden pt-32 sm:pt-40">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={false}
            className="relative z-10 max-w-6xl"
          >
            <div className="inline-flex rounded-full border border-black/5 bg-white/70 px-5 py-2 text-sm uppercase tracking-[0.22em] text-neutral-600 backdrop-blur-xl">
              Marketplace de medicina estetica
            </div>

            <h1 className="mt-8 max-w-6xl text-4xl font-semibold leading-[1.03] tracking-tight sm:text-6xl md:text-8xl xl:text-[112px]">
              Encuentra la clinica adecuada para tu tratamiento estetico.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600 md:text-2xl">
              Compara clinicas verificadas, especialistas y tratamientos con
              disponibilidad real para reservar con mas confianza.
            </p>

            <SearchBar />

            <div className="mt-14 flex flex-wrap gap-5">
              <Link
                href="/tratamientos"
                className="rounded-full bg-black px-10 py-5 text-lg text-white shadow-[0_15px_40px_rgba(0,0,0,0.18)] transition-all duration-300 hover:scale-[1.03]"
              >
                Buscar tratamientos
              </Link>

              <Link
                href="/clinics"
                className="rounded-full border border-black/5 bg-white/70 px-10 py-5 text-lg backdrop-blur-xl transition-all duration-300 hover:bg-black hover:text-white"
              >
                Ver clinicas disponibles
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 1.2,
              delay: 0.2,
            }}
            className="relative mt-24 overflow-hidden rounded-[36px]"
          >
            <div className="relative h-[620px] w-full md:h-[760px]">
              <Image
                src="https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?q=80&w=1800&auto=format&fit=crop"
                alt="Clinica estetica verificada"
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 grid gap-4 text-white md:bottom-8 md:left-8 md:right-auto md:grid-cols-3">
              {[
                ["Verificadas", "Clinicas"],
                ["Online", "Reserva"],
                ["Real", "Disponibilidad"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-[28px] border border-white/20 bg-white/15 p-6 backdrop-blur-2xl"
                >
                  <div className="text-4xl font-semibold">{value}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.2em] text-white/70">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative px-6 pb-28 pt-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
              Clinicas destacadas
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl">
              Compara centros por ciudad, tratamiento y especialista.
            </h2>

            <p className="mt-8 text-xl leading-relaxed text-neutral-600">
              Encuentra opciones verificadas para botox, acido hialuronico,
              armonizacion facial, laser, bioestimuladores y mas.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {featuredClinics.map((clinic, index) => (
              <motion.div
                key={clinic.slug || `clinic-${index}`}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.1,
                }}
                viewport={{ once: true }}
              >
                <Link
                  href={`/clinics/${clinic.slug}`}
                  className="group block overflow-hidden rounded-[28px] bg-white shadow-[0_20px_80px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="relative h-[380px] overflow-hidden">
                    <Image
                      src={clinic.heroImage || clinic.image}
                      alt={clinic.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition duration-700 group-hover:scale-105"
                    />
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <h3 className="min-w-0 text-2xl font-semibold sm:text-3xl">
                        {clinic.name}
                      </h3>

                      <div className="w-fit rounded-full bg-black px-4 py-2 text-sm text-white">
                        Clinica destacada
                      </div>
                    </div>

                    <div className="mt-4 text-neutral-500">
                      {clinic.location}
                    </div>

                    <div className="mt-8 flex flex-wrap gap-2">
                      {clinic.treatments?.slice(0, 3).map(
                        (
                          treatment: TreatmentSummary,
                          treatmentIndex: number
                        ) => (
                          <div
                            key={`${clinic.slug}-treatment-${treatmentIndex}`}
                            className="rounded-full bg-[#F6F3EE] px-4 py-2 text-sm"
                          >
                            {getTreatmentName(treatment)}
                          </div>
                        )
                      )}
                    </div>

                    <div className="mt-8 inline-flex rounded-full bg-black px-6 py-3 text-sm text-white transition group-hover:scale-[1.03]">
                      Ver clinica
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[36px] bg-black p-10 text-white md:p-16">
            <p className="text-sm uppercase tracking-[0.25em] text-white/50">
              Tratamientos buscados
            </p>

            <h2 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl">
              Empieza por el tratamiento y compara opciones reales.
            </h2>

            <div className="mt-14 flex flex-wrap gap-4">
              {[
                "botox",
                "acido-hialuronico",
                "armonizacion-facial",
                "rinomodelacion",
                "bioestimuladores",
                "perfilado-labial",
              ].map((treatment) => (
                <Link
                  key={treatment}
                  href={`/tratamientos/${treatment}`}
                  className="rounded-full bg-white/10 px-6 py-4 text-lg transition-all duration-300 hover:bg-white hover:text-black"
                >
                  {treatment.replaceAll("-", " ")}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-32">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[32px] bg-white/70 p-10 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
            <p className="text-sm uppercase tracking-[0.22em] text-neutral-500">
              EncuentraTuClinica
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Un marketplace para decidir mejor antes de reservar.
            </h2>

            <div className="mt-10 space-y-6 text-lg leading-relaxed text-neutral-600">
              <p>
                EncuentraTuClinica conecta pacientes con clinicas verificadas y
                especialistas de medicina estetica avanzada.
              </p>

              <p>
                Descubre tratamientos como botox, acido hialuronico,
                armonizacion facial, bioestimuladores, rinomodelacion y
                rejuvenecimiento facial.
              </p>

              <p>
                La experiencia esta pensada para comparar informacion clave,
                revisar profesionales y avanzar hacia una reserva con menos
                friccion.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
