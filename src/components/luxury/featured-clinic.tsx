"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookingModal } from "@/components/modals/booking-modal";

export function FeaturedClinic() {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] =
  useState("12 Mayo");
  const [selectedTime, setSelectedTime] =
  useState("10:30");
  const [confirmed, setConfirmed] =
  useState(false);
const [reservation, setReservation] =
  useState("");
  return (
    <>
      <section className="mx-auto max-w-7xl px-6 pb-32">

        <div className="relative overflow-hidden rounded-[48px]">

          {/* IMAGE */}

          <img
            src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1800&auto=format&fit=crop"
            alt="Featured Clinic"
            className="h-[750px] w-full object-cover"
          />

          {/* OVERLAY */}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* CONTENT */}

          <div className="absolute bottom-0 left-0 p-12 md:p-20">

            <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-md">
              Top Rated Clinic
            </div>

            <h2 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-white md:text-7xl">
              EncuentraTuClinica Clinic Madrid
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
              Experiencia premium en medicina estética avanzada con resultados naturales y especialistas certificados.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">

              <button
                onClick={() => setOpen(true)}
                className="rounded-full bg-white px-8 py-4 font-medium text-black transition hover:scale-[1.02]"
              >
                Reservar cita
              </button>

              <Link
                href="/clinics/encuentra-tu-clinica-madrid"
                className="rounded-full border border-white/20 bg-white/10 px-8 py-4 font-medium text-white backdrop-blur-md transition hover:bg-white hover:text-black"
              >
                Ver clínica
              </Link>

            </div>

          </div>

        </div>
        {reservation && (

  <div className="mt-10 rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">

    <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
      Próxima reserva
    </p>

    <div className="mt-4 text-3xl font-semibold tracking-tight">
      {reservation}
    </div>

  </div>

)}

      </section>

      {/* MODAL */}

    <BookingModal
  open={open}
  onClose={() => setOpen(false)}
  clinicName="EncuentraTuClinica Clinic Madrid"
  bookingSource="featured_clinic"
/>

    </>
  );
}
