import Link from "next/link";
import type { Metadata } from "next";

import ManageBookingReschedule from "@/components/ManageBookingReschedule";
import { Navbar } from "@/components/layout/navbar";
import {
  cancellableBookingStatuses,
  patientReschedulableStatuses,
} from "@/lib/booking-lifecycle";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Gestionar cita",
  robots: {
    index: false,
    follow: false,
  },
};

function formatAppointment(booking: {
  booking_date?: string | null;
  booking_time?: string | null;
}) {
  const date = (booking.booking_date || "").slice(0, 10);
  const time =
    booking.booking_time?.slice(0, 5) ||
    booking.booking_date?.slice(11, 16) ||
    "";

  if (!date) return "Fecha pendiente";

  return `${new Date(`${date}T00:00:00`).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })}${time ? ` a las ${time}` : ""}`;
}

function formatPlace(value?: string | null) {
  return (value || "")
    .replace(/ELARA/gi, "EncuentraTuClinica")
    .replace(/Especialista independiente/gi, "Consulta independiente");
}

export default async function CancelBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; cancelled?: string }>;
}) {
  const params = await searchParams;
  const token = params.token || "";
  const { data: booking } = token
    ? await supabase
        .from("bookings")
        .select("*")
        .eq("cancellation_token", token)
        .maybeSingle()
    : { data: null };

  const isCancelled = booking?.status === "Cancelada";
  const canCancel = booking && cancellableBookingStatuses.includes(booking.status);
  const canReschedule =
    booking && patientReschedulableStatuses.includes(booking.status);

  return (
    <main className="min-h-screen bg-[#F6F3EE] text-black">
      <Navbar />

      <section className="px-6 pb-24 pt-28">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-black/10 bg-white shadow-[0_24px_90px_rgba(0,0,0,0.06)]">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <aside className="bg-black p-8 text-white lg:p-12">
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">
                EncuentraTuClinica
              </p>
              <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                {isCancelled ? "Tu cita ha sido cancelada" : "Gestiona tu cita"}
              </h1>
              <p className="mt-6 max-w-sm text-lg leading-8 text-white/60">
                Revisa los datos, cambia el horario disponible o cancela la cita
                desde este enlace privado.
              </p>

              {booking && (
                <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                    Estado
                  </div>
                  <div className="mt-3 text-2xl font-semibold">
                    {booking.status}
                  </div>
                </div>
              )}
            </aside>

            <div className="p-8 lg:p-12">
              {!booking && (
                <div className="rounded-2xl bg-[#F8F6F2] p-6 text-neutral-600">
                  Este enlace no es valido o ya no existe.
                </div>
              )}

              {booking && (
                <>
                  <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                    Resumen de la cita
                  </p>

                  <div className="mt-6 grid gap-3">
                    {[
                      ["Tratamiento", booking.treatment || "Tratamiento"],
                      ["Lugar", formatPlace(booking.clinic_name)],
                      ["Especialista", booking.specialist_name],
                      ["Fecha y hora", formatAppointment(booking)],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-4 rounded-2xl bg-[#F8F6F2] px-4 py-3 text-sm"
                      >
                        <span className="text-neutral-500">{label}</span>
                        <span className="text-right font-medium">{value || "-"}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {isCancelled && (
                <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  Tu horario ha sido liberado correctamente.
                </p>
              )}

              {canReschedule && (
                <ManageBookingReschedule
                  token={token}
                  currentDate={(booking.booking_date || "").slice(0, 10)}
                  currentTime={
                    booking.booking_time?.slice(0, 5) ||
                    booking.booking_date?.slice(11, 16) ||
                    ""
                  }
                />
              )}

              {canCancel && (
                <section className="mt-8 rounded-[24px] border border-red-100 bg-red-50/50 p-5">
                  <h2 className="text-lg font-semibold">Cancelar cita</h2>
                  <p className="mt-3 text-sm leading-6 text-neutral-600">
                    Al cancelar, este hueco volvera a quedar disponible para
                    otras personas.
                  </p>
                  <form action="/api/cancel-booking" method="post" className="mt-5">
                    <input type="hidden" name="token" value={token} />
                    <button
                      type="submit"
                      className="h-12 w-full rounded-2xl border border-red-200 bg-white px-6 text-sm font-medium text-red-700 transition hover:bg-red-50"
                    >
                      Confirmar cancelacion
                    </button>
                  </form>
                </section>
              )}

              {booking && !canCancel && !isCancelled && (
                <p className="mt-6 rounded-2xl bg-[#F8F6F2] p-4 text-sm text-neutral-600">
                  Esta reserva ya no puede cancelarse desde este enlace.
                </p>
              )}

              <Link
                href="/"
                className="mt-8 inline-flex rounded-full border border-black/10 px-6 py-3 text-sm font-medium transition hover:border-black"
              >
                Volver al marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
