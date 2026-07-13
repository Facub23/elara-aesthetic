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
  const marketplaceStats = [
    ["Marketplace", "Clinicas y consultas"],
    ["Agenda real", "Huecos por especialista"],
    ["Decision guiada", "Tratamiento, precio y lugar"],
  ];
  const quickRoutes = [
    ["Botox en Madrid", "/madrid/botox"],
    ["Especialistas con horario", "/especialistas?availability=Con+horario"],
    ["Clinicas para Botox", "/clinics?treatment=Botox"],
    ["Especialistas en Madrid", "/especialistas?city=Madrid"],
  ];
  const decisionSteps = [
    {
      title: "Busca por tratamiento",
      text: "Empieza por botox, acido hialuronico, rinomodelacion u otro objetivo estetico.",
    },
    {
      title: "Compara clinicas",
      text: "Revisa ciudad, especialistas, tratamientos, precios orientativos y disponibilidad.",
    },
    {
      title: "Reserva con contexto",
      text: "Elige especialista, hueco real y recibe enlaces seguros para confirmar o gestionar la cita.",
    },
  ];
  const treatmentLinks = [
    ["Botox", "botox", "Desde 290 EUR"],
    ["Acido hialuronico", "acido-hialuronico", "Desde 350 EUR"],
    ["Armonizacion facial", "armonizacion-facial", "Plan completo"],
    ["Rinomodelacion", "rinomodelacion", "Sin cirugia"],
    ["Bioestimuladores", "bioestimuladores", "Calidad de piel"],
    ["Perfilado labial", "perfilado-labial", "Definicion natural"],
  ];

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

            <h1 className="mt-8 max-w-6xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl md:text-8xl xl:text-[108px]">
              Compara clinicas esteticas antes de reservar.
            </h1>

            <p className="mt-8 max-w-3xl text-lg leading-relaxed text-neutral-600 md:text-2xl">
              EncuentraTuClinica te ayuda a elegir tratamiento, revisar
              especialistas y reservar un hueco real con mas informacion antes
              de decidir.
            </p>

            <SearchBar />

            <div className="mt-6 flex flex-wrap gap-2">
              {quickRoutes.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="rounded-full border border-black/10 bg-white/65 px-4 py-2 text-sm text-neutral-700 backdrop-blur-xl transition hover:border-black hover:bg-white"
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="mt-12 flex flex-wrap gap-4">
              <Link
                href="/tratamientos"
                className="rounded-full bg-black px-8 py-4 text-base text-white shadow-[0_15px_40px_rgba(0,0,0,0.18)] transition-all duration-300 hover:scale-[1.03] sm:px-10 sm:py-5 sm:text-lg"
              >
                Explorar tratamientos
              </Link>

              <Link
                href="/clinics"
                className="rounded-full border border-black/5 bg-white/70 px-8 py-4 text-base backdrop-blur-xl transition-all duration-300 hover:bg-black hover:text-white sm:px-10 sm:py-5 sm:text-lg"
              >
                Ver clinicas verificadas
              </Link>
            </div>

            <div className="mt-12 grid max-w-4xl gap-3 sm:grid-cols-3">
              {marketplaceStats.map(([value, label]) => (
                <div
                  key={label}
                  className="border-t border-black/10 pt-4"
                >
                  <div className="text-2xl font-semibold tracking-tight">
                    {value}
                  </div>
                  <div className="mt-1 text-sm uppercase tracking-[0.16em] text-neutral-500">
                    {label}
                  </div>
                </div>
              ))}
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
                ["Con datos", "Comparacion"],
                ["Real", "Disponibilidad"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-[24px] border border-white/20 bg-white/15 p-5 backdrop-blur-2xl"
                >
                  <div className="text-3xl font-semibold">{value}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.2em] text-white/70">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Como funciona
              </p>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
                Menos intuicion. Mas contexto antes de elegir.
              </h2>
            </div>

            <p className="text-lg leading-relaxed text-neutral-600 md:text-xl">
              La plataforma esta pensada para transformar una busqueda dispersa
              en una decision ordenada: tratamiento, clinica, especialista,
              agenda y seguimiento.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {decisionSteps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-[28px] border border-black/5 bg-white/75 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.04)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm text-white">
                  {index + 1}
                </div>
                <h3 className="mt-8 text-2xl font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-4 leading-7 text-neutral-600">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 rounded-[28px] border border-black/10 bg-white/80 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.04)] lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div className="rounded-2xl bg-black p-6 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                Marketplace final
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                No eliges solo una clinica: comparas el lugar, el profesional y el horario.
              </h3>
            </div>
            {[
              ["Antes", "Busqueda dispersa, precios poco claros y mensajes para pedir disponibilidad."],
              ["Ahora", "Fichas conectadas, precios desde, especialistas y reserva guiada."],
            ].map(([label, text]) => (
              <div key={label} className="rounded-2xl bg-[#F6F3EE] p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                  {label}
                </p>
                <p className="mt-3 text-sm leading-6 text-neutral-700">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-6 pb-28 pt-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Clinicas destacadas
              </p>

              <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl">
                Centros para comparar con calma.
              </h2>

              <p className="mt-8 text-xl leading-relaxed text-neutral-600">
                Empieza con clinicas piloto y revisa ciudad, tratamientos,
                especialistas y disponibilidad antes de avanzar.
              </p>
            </div>

            <Link
              href="/clinics"
              className="w-fit rounded-full border border-black/10 bg-white px-6 py-3 text-sm transition hover:border-black hover:bg-black hover:text-white"
            >
              Ver todas las clinicas
            </Link>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-4">
            {[
              ["Tratamientos", "Botox, acido hialuronico y armonizacion facial"],
              ["Agenda", "Huecos reales por especialista"],
              ["Especialistas", "Perfiles vinculados a cada clinica"],
              ["Gestion", "Confirmacion, cambio y cancelacion por email"],
            ].map(([label, text]) => (
              <div key={label} className="rounded-2xl bg-white/70 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                  {label}
                </p>
                <p className="mt-3 text-sm leading-6 text-neutral-700">
                  {text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {featuredClinics.map((clinic, index) => {
              const treatmentCount = clinic.treatments?.length || 0;

              return (
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
                    className="group block h-full overflow-hidden rounded-[28px] bg-white shadow-[0_20px_80px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-2"
                  >
                    <div className="relative h-[340px] overflow-hidden">
                      <Image
                        src={clinic.heroImage || clinic.image}
                        alt={clinic.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition duration-700 group-hover:scale-105"
                      />
                      <div className="absolute left-5 top-5 rounded-full bg-white/90 px-4 py-2 text-xs uppercase tracking-[0.16em]">
                        Verificada
                      </div>
                    </div>

                    <div className="p-6 sm:p-8">
                      <div className="flex min-w-0 flex-col gap-3">
                        <h3 className="min-w-0 text-2xl font-semibold sm:text-3xl">
                          {clinic.name}
                        </h3>
                        <div className="text-neutral-500">{clinic.location}</div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-[#F6F3EE] p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                            Tratamientos
                          </p>
                          <p className="mt-2 text-xl font-semibold">
                            {treatmentCount}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[#F6F3EE] p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                            Reserva
                          </p>
                          <p className="mt-2 text-xl font-semibold">Online</p>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-2">
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
                        Ver ficha de la clinica
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid overflow-hidden rounded-[32px] bg-black text-white lg:grid-cols-[0.9fr_1.1fr]">
            <div className="p-8 md:p-12">
              <p className="text-sm uppercase tracking-[0.25em] text-white/50">
                Tratamientos buscados
              </p>

              <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
                Empieza por lo que quieres mejorar.
              </h2>

              <p className="mt-6 text-lg leading-8 text-white/60">
                Cada tratamiento conecta con clinicas y especialistas que lo
                ofrecen, con precios orientativos y duracion de cita.
              </p>

              <Link
                href="/tratamientos"
                className="mt-10 inline-flex rounded-full bg-white px-6 py-3 text-sm text-black transition hover:bg-white/90"
              >
                Ver catalogo completo
              </Link>
            </div>

            <div className="grid gap-px bg-white/10 md:grid-cols-2">
              {treatmentLinks.map(([label, slug, detail]) => (
                <Link
                  key={slug}
                  href={`/tratamientos/${slug}`}
                  className="bg-black p-6 transition hover:bg-white hover:text-black md:p-8"
                >
                  <p className="text-2xl font-semibold tracking-tight">
                    {label}
                  </p>
                  <p className="mt-3 text-sm uppercase tracking-[0.18em] opacity-60">
                    {detail}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-32">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-neutral-500">
              EncuentraTuClinica
            </p>

            <h2 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl">
              Un marketplace para decidir mejor antes de reservar.
            </h2>

            <div className="mt-10 space-y-6 text-lg leading-relaxed text-neutral-600">
              <p>
                EncuentraTuClinica conecta pacientes con clinicas verificadas y
                especialistas de medicina estetica avanzada.
              </p>

              <p>
                La experiencia esta pensada para comparar informacion clave,
                revisar profesionales y avanzar hacia una reserva con menos
                friccion.
              </p>
            </div>
          </div>

          <div className="rounded-[32px] bg-white/75 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
            <p className="text-sm uppercase tracking-[0.22em] text-neutral-500">
              Antes de reservar
            </p>

            <div className="mt-6 grid gap-4">
              {[
                "Compara varias opciones antes de contactar.",
                "Consulta tratamientos y especialistas vinculados.",
                "Elige solo huecos disponibles en la agenda real.",
                "Gestiona confirmacion, cambios y cancelacion desde enlaces seguros.",
              ].map((item) => (
                <div
                  key={item}
                  className="flex gap-4 rounded-2xl bg-[#F6F3EE] p-4 text-neutral-700"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-black" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/especialistas"
                className="rounded-full bg-black px-6 py-3 text-sm text-white"
              >
                Ver especialistas
              </Link>
              <Link
                href="/clinics"
                className="rounded-full border border-black/10 px-6 py-3 text-sm transition hover:border-black"
              >
                Comparar clinicas
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
