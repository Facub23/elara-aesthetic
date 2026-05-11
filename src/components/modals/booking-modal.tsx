"use client";

import { useState } from "react";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  clinicName: string;
}

export function BookingModal({
  open,
  onClose,
  clinicName,
}: BookingModalProps) {

  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setSuccess(true);

    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 2500);
  };

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">

      <div className="w-full max-w-xl rounded-[36px] bg-white p-10 shadow-2xl">

        {/* HEADER */}

        <div className="flex items-start justify-between gap-6">

          <div>

            <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
              Reserva
            </p>

            <h2 className="mt-3 text-4xl font-semibold tracking-tight">
              Reserva en {clinicName}
            </h2>

          </div>

          <button
            onClick={onClose}
            className="rounded-full border border-black/10 px-4 py-2 text-sm transition hover:bg-black hover:text-white"
          >
            Cerrar
          </button>

        </div>

        {/* SUCCESS */}

        {success ? (

          <div className="mt-10 rounded-[28px] bg-black p-8 text-white">

            <div className="text-2xl font-semibold">
              Reserva enviada ✨
            </div>

            <p className="mt-3 text-white/70">
              Nos pondremos en contacto contigo muy pronto.
            </p>

          </div>

        ) : (

          <form
            onSubmit={handleSubmit}
            className="mt-10 space-y-6"
          >

            {/* NAME */}

            <div>

              <label className="mb-3 block text-sm font-medium">
                Nombre completo
              </label>

              <input
                type="text"
                required
                placeholder="Tu nombre"
                className="w-full rounded-2xl border border-black/10 bg-[#F7F5F2] px-5 py-4 outline-none transition focus:border-black"
              />

            </div>

            {/* EMAIL */}

            <div>

              <label className="mb-3 block text-sm font-medium">
                Email
              </label>

              <input
                type="email"
                required
                placeholder="tu@email.com"
                className="w-full rounded-2xl border border-black/10 bg-[#F7F5F2] px-5 py-4 outline-none transition focus:border-black"
              />

            </div>

            {/* DATE */}

            <div>

              <label className="mb-3 block text-sm font-medium">
                Fecha deseada
              </label>

              <input
                type="date"
                required
                className="w-full rounded-2xl border border-black/10 bg-[#F7F5F2] px-5 py-4 outline-none transition focus:border-black"
              />

            </div>

            {/* TREATMENT */}

            <div>

              <label className="mb-3 block text-sm font-medium">
                Tratamiento
              </label>

              <select
                className="w-full rounded-2xl border border-black/10 bg-[#F7F5F2] px-5 py-4 outline-none transition focus:border-black"
              >

                <option>Botox</option>
                <option>Ácido hialurónico</option>
                <option>Full Face</option>
                <option>Rinomodelación</option>

              </select>

            </div>

            {/* BUTTON */}

            <button
              type="submit"
              className="w-full rounded-full bg-black px-8 py-5 text-lg text-white transition hover:opacity-90"
            >
              Confirmar reserva
            </button>

          </form>

        )}

      </div>

    </div>
  );
}