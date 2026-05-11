"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Navbar } from "@/components/layout/navbar";
import { clinics } from "@/data/clinics";

export default function HomePage() {

  return (

    <main className="min-h-screen bg-white text-black overflow-hidden">

      <Navbar />

      {/* HERO */}

      <section className="relative overflow-hidden pt-36">

        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">

          {/* LEFT */}

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >

            <div className="inline-flex rounded-full border border-black/5 bg-[#f5f5f5] px-5 py-2 text-sm">
              Medicina estética premium
            </div>

            <h1 className="mt-8 text-6xl font-semibold leading-[0.95] tracking-tight md:text-8xl">
              Belleza estética elevada al siguiente nivel.
            </h1>

            <p className="mt-8 max-w-2xl text-xl leading-relaxed text-neutral-600">
              Descubre clínicas cuidadosamente seleccionadas especializadas en armonización facial, rejuvenecimiento y medicina estética avanzada.
            </p>

            <div className="mt-12 flex flex-wrap gap-5">

              <Link
                href="/clinics"
                className="rounded-full bg-black px-9 py-5 text-white transition-all duration-300 hover:scale-[1.03]"
              >
                Explorar clínicas
              </Link>

              <Link
                href="/clinics"
                className="rounded-full border border-black/5 bg-white px-9 py-5 transition-all duration-300 hover:bg-black hover:text-white"
              >
                Reservar consulta
              </Link>

            </div>

            {/* STATS */}

            <div className="mt-16 flex flex-wrap gap-10">

              <div>

                <div className="text-4xl font-semibold">
                  +12k
                </div>

                <div className="mt-2 text-neutral-500">
                  Pacientes satisfechos
                </div>

              </div>

              <div>

                <div className="text-4xl font-semibold">
                  +40
                </div>

                <div className="mt-2 text-neutral-500">
                  Especialistas premium
                </div>

              </div>

              <div>

                <div className="text-4xl font-semibold">
                  98%
                </div>

                <div className="mt-2 text-neutral-500">
                  Satisfacción
                </div>

              </div>

            </div>

          </motion.div>

          {/* RIGHT */}

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >

            <div className="overflow-hidden rounded-[48px]">

              <img
                src={clinics[0].heroImage}
                alt="Luxury Clinic"
                className="h-[820px] w-full object-cover"
              />

            </div>

          </motion.div>

        </div>

      </section>

      {/* FEATURED CLINICS */}

      <section className="mx-auto max-w-7xl px-6 py-32">

        <div className="max-w-3xl">

          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Clínicas destacadas
          </p>

          <h2 className="mt-5 text-5xl font-semibold tracking-tight">
            Especialistas cuidadosamente seleccionados.
          </h2>

        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">

          {clinics.slice(0, 3).map((clinic) => (

            <motion.div
              key={clinic.slug}
              whileHover={{ y: -10 }}
              transition={{ duration: 0.3 }}
              className="group overflow-hidden rounded-[36px] border border-black/5 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.03)]"
            >

              <div className="relative overflow-hidden">

                <img
                  src={clinic.image}
                  alt={clinic.name}
                  className="h-[420px] w-full object-cover transition duration-1000 group-hover:scale-110"
                />

                <div className="absolute left-6 top-6 rounded-full bg-white/90 px-4 py-2 text-sm font-medium backdrop-blur">
                  ⭐ {clinic.rating}
                </div>

              </div>

              <div className="p-8">

                <h3 className="text-3xl font-semibold tracking-tight">
                  {clinic.name}
                </h3>

                <p className="mt-4 leading-relaxed text-neutral-600">
                  {clinic.description}
                </p>

                <div className="mt-8 flex gap-4">

                  <div className="rounded-2xl bg-[#f5f5f5] px-4 py-3">

                    <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      Pacientes
                    </div>

                    <div className="mt-1 font-semibold">
                      {clinic.patients}
                    </div>

                  </div>

                  <div className="rounded-2xl bg-[#f5f5f5] px-4 py-3">

                    <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      Experiencia
                    </div>

                    <div className="mt-1 font-semibold">
                      {clinic.experience}
                    </div>

                  </div>

                </div>

                <div className="mt-10">

                  <Link
                    href={`/clinics/${clinic.slug}`}
                    className="rounded-full bg-black px-8 py-4 text-white transition hover:opacity-90"
                  >
                    Explorar clínica
                  </Link>

                </div>

              </div>

            </motion.div>

          ))}

        </div>

      </section>

      {/* EXPERIENCE */}

      <section className="mx-auto max-w-7xl px-6 py-32">

        <div className="grid gap-16 lg:grid-cols-2">

          <div>

            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Experiencia premium
            </p>

            <h2 className="mt-5 text-5xl font-semibold leading-tight tracking-tight">
              Tecnología avanzada y resultados naturales.
            </h2>

            <p className="mt-8 max-w-2xl text-xl leading-relaxed text-neutral-600">
              Trabajamos con clínicas líderes en armonización facial y medicina estética moderna para ofrecer experiencias exclusivas y seguras.
            </p>

          </div>

          <div className="grid grid-cols-2 gap-6">

            <div className="rounded-[36px] bg-[#f5f5f5] p-10">

              <div className="text-5xl">
                ✨
              </div>

              <h3 className="mt-8 text-2xl font-semibold">
                Resultados naturales
              </h3>

              <p className="mt-4 leading-relaxed text-neutral-600">
                Técnicas avanzadas enfocadas en armonía facial y elegancia estética.
              </p>

            </div>

            <div className="rounded-[36px] bg-black p-10 text-white">

              <div className="text-5xl">
                🖤
              </div>

              <h3 className="mt-8 text-2xl font-semibold">
                Clínicas exclusivas
              </h3>

              <p className="mt-4 leading-relaxed text-white/70">
                Profesionales certificados y clínicas premium cuidadosamente seleccionadas.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* FINAL CTA */}

      <section className="mx-auto max-w-7xl px-6 pb-32">

        <div className="rounded-[48px] bg-black px-10 py-24 text-center text-white">

          <p className="text-sm uppercase tracking-[0.3em] text-white/60">
            Reserva premium
          </p>

          <h2 className="mx-auto mt-6 max-w-4xl text-6xl font-semibold leading-tight tracking-tight">
            Comienza tu transformación estética hoy.
          </h2>

          <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-white/70">
            Descubre especialistas líderes en medicina estética avanzada y agenda tu consulta personalizada.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-5">

            <Link
              href="/clinics"
              className="rounded-full bg-white px-9 py-5 text-black transition hover:opacity-90"
            >
              Explorar clínicas
            </Link>

            <Link
              href="/clinics"
              className="rounded-full border border-white/10 px-9 py-5 transition hover:bg-white hover:text-black"
            >
              Reservar consulta
            </Link>

          </div>

        </div>

      </section>

    </main>
  );
}