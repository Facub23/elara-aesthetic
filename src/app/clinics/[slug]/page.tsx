"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import { BookingModal } from "@/components/modals/booking-modal";
import { Navbar } from "@/components/layout/navbar";
import { notFound } from "next/navigation";
import { clinics } from "@/data/clinics";

export default function ClinicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {

  const { slug } = use(params);

  const clinic = clinics.find(
    (clinic) => clinic.slug === slug
  );

  if (!clinic) {
    notFound();
  }

  const [open, setOpen] = useState(false);

  return (

    <main className="min-h-screen bg-white text-black">

      <Navbar />

      {/* HERO */}

      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative overflow-hidden pt-36"
      >

        <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2">

          {/* LEFT */}

          <div className="flex flex-col justify-center">

            <div className="flex flex-wrap gap-3">

              <div className="rounded-full border border-black/5 bg-[#f5f5f5] px-5 py-2 text-sm">
                Clínica verificada
              </div>

              <div className="rounded-full bg-black px-5 py-2 text-sm text-white">
                ⭐ {clinic.rating} rating
              </div>

              <div className="rounded-full border border-black/5 bg-[#f5f5f5] px-5 py-2 text-sm">
                📍 {clinic.location}
              </div>

            </div>

            <h1 className="mt-10 text-6xl font-semibold leading-[1] tracking-tight md:text-7xl">
              {clinic.name}
            </h1>

            <p className="mt-8 max-w-2xl text-xl leading-relaxed text-neutral-600">
              {clinic.description}
            </p>

            {/* STATS */}

            <div className="mt-12 flex flex-wrap gap-5">

              <div className="rounded-[28px] bg-[#f5f5f5] px-6 py-5">

                <div className="text-sm text-neutral-500">
                  Rating
                </div>

                <div className="mt-2 text-3xl font-semibold">
                  {clinic.rating}
                </div>

              </div>

              <div className="rounded-[28px] bg-[#f5f5f5] px-6 py-5">

                <div className="text-sm text-neutral-500">
                  Pacientes
                </div>

                <div className="mt-2 text-3xl font-semibold">
                  {clinic.patients}
                </div>

              </div>

              <div className="rounded-[28px] bg-[#f5f5f5] px-6 py-5">

                <div className="text-sm text-neutral-500">
                  Experiencia
                </div>

                <div className="mt-2 text-3xl font-semibold">
                  {clinic.experience}
                </div>

              </div>

            </div>

            {/* CTA */}

            <div className="mt-12 flex flex-wrap gap-5">

              <button
                onClick={() => setOpen(true)}
                className="rounded-full bg-black px-9 py-5 text-white transition-all duration-300 hover:scale-[1.03]"
              >
                Reservar consulta
              </button>

              <a
                href={`https://wa.me/${clinic.whatsapp}`}
                target="_blank"
                className="rounded-full border border-black/5 bg-white px-9 py-5 transition-all duration-300 hover:bg-black hover:text-white"
              >
                WhatsApp
              </a>

            </div>

          </div>

          {/* RIGHT */}

          <div className="relative overflow-hidden rounded-[40px]">

            <img
              src={clinic.heroImage}
              alt={clinic.name}
              className="h-[760px] w-full object-cover"
            />

          </div>

        </div>

      </motion.section>

      {/* TREATMENTS */}

      <section className="mx-auto max-w-7xl px-6 py-32">

        <div className="max-w-3xl">

          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Tratamientos
          </p>

          <h2 className="mt-5 text-5xl font-semibold tracking-tight">
            Especialidades principales.
          </h2>

        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">

          {clinic.treatments.map((treatment) => (

            <motion.div
              key={treatment.name}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.3 }}
              className="rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)]"
            >

              <div className="text-3xl font-semibold">
                {treatment.name}
              </div>

              <p className="mt-4 leading-relaxed text-neutral-600">
                Resultados naturales, sofisticados y personalizados.
              </p>

              <div className="mt-10 text-sm font-medium tracking-wide text-neutral-500">
                Desde {treatment.price}
              </div>

            </motion.div>

          ))}

        </div>

      </section>

      {/* DOCTORS */}

      <section className="mx-auto max-w-7xl px-6 py-32">

        <div className="max-w-3xl">

          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Especialistas
          </p>

          <h2 className="mt-5 text-5xl font-semibold tracking-tight">
            Conoce a los doctores.
          </h2>

        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">

          {clinic.doctors.map((doctor) => (

            <motion.div
              key={doctor.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-[36px] border border-black/5 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.03)]"
            >

              <img
                src={doctor.image}
                alt={doctor.name}
                className="h-[460px] w-full object-cover"
              />

              <div className="p-8">

                <h3 className="text-3xl font-semibold">
                  {doctor.name}
                </h3>

                <p className="mt-3 text-lg text-neutral-600">
                  {doctor.specialty}
                </p>

                <div className="mt-7 inline-flex rounded-full bg-[#f5f5f5] px-5 py-2 text-sm">
                  {doctor.experience} experiencia
                </div>

              </div>

            </motion.div>

          ))}

        </div>

      </section>

      {/* REVIEWS */}

      <section className="mx-auto max-w-7xl px-6 py-32">

        <div className="max-w-3xl">

          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Opiniones
          </p>

          <h2 className="mt-5 text-5xl font-semibold tracking-tight">
            Lo que dicen los pacientes.
          </h2>

        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">

          {clinic.reviews.map((review) => (

            <motion.div
              key={review.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="rounded-[36px] border border-black/5 bg-[#fafafa] p-10"
            >

              <div className="text-2xl">
                ⭐⭐⭐⭐⭐
              </div>

              <p className="mt-7 text-xl leading-relaxed text-neutral-700">
                “{review.text}”
              </p>

              <div className="mt-8 text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
                {review.name}
              </div>

            </motion.div>

          ))}

        </div>

      </section>

      {/* GALLERY */}

      <section className="mx-auto max-w-7xl px-6 pb-32">

        <div>

          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Antes & Después
          </p>

          <h2 className="mt-5 text-5xl font-semibold tracking-tight">
            Resultados reales.
          </h2>

        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">

          {clinic.gallery.map((image) => (

            <motion.img
              key={image}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              src={image}
              alt="Gallery"
              className="h-[540px] w-full rounded-[36px] object-cover transition duration-700 hover:scale-[1.02]"
            />

          ))}

        </div>

      </section>

      {/* BOTTOM CTA */}

      <section className="mx-auto max-w-7xl px-6 pb-32">

        <div className="rounded-[48px] bg-black px-10 py-20 text-center text-white">

          <p className="text-sm uppercase tracking-[0.3em] text-white/60">
            Reserva premium
          </p>

          <h2 className="mx-auto mt-6 max-w-3xl text-5xl font-semibold leading-tight tracking-tight">
            Agenda tu consulta estética personalizada.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            Da el siguiente paso con especialistas líderes en armonización facial y medicina estética avanzada.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-5">

            <button
              onClick={() => setOpen(true)}
              className="rounded-full bg-white px-8 py-4 text-black transition hover:opacity-90"
            >
              Reservar consulta
            </button>

            <a
              href={`https://wa.me/${clinic.whatsapp}`}
              target="_blank"
              className="rounded-full border border-white/10 px-8 py-4 transition hover:bg-white hover:text-black"
            >
              WhatsApp
            </a>

          </div>

        </div>

      </section>

      <BookingModal
        open={open}
        onClose={() => setOpen(false)}
        clinicName={clinic.name}
      />

    </main>
  );
}