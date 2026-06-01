import Link from "next/link";

import ManageBookingReschedule from "@/components/ManageBookingReschedule";
import {
  cancellableBookingStatuses,
  patientReschedulableStatuses,
} from "@/lib/booking-lifecycle";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

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
    <main className="min-h-screen bg-[#F6F3EE] px-6 py-10 text-black">
      <section className="mx-auto max-w-xl rounded-md border border-black/10 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">
          EncuentraTuClinica
        </p>
        <h1 className="mt-5 text-4xl font-semibold">
          {isCancelled ? "Cita cancelada" : "Gestionar cita"}
        </h1>

        {!booking && (
          <p className="mt-5 text-neutral-600">
            Este enlace no es valido o ya no existe.
          </p>
        )}

        {booking && (
          <div className="mt-7 rounded-md bg-[#F7F5F2] p-5 text-sm leading-7">
            <div className="font-medium">{booking.treatment || "Tratamiento"}</div>
            <div>{booking.clinic_name}</div>
            <div>{booking.specialist_name}</div>
            <div>{formatAppointment(booking)}</div>
            <div className="mt-2 text-neutral-500">Estado: {booking.status}</div>
          </div>
        )}

        {isCancelled && (
          <p className="mt-5 text-neutral-600">
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
          <section className="mt-7 border-t border-black/10 pt-7">
            <h2 className="text-lg font-semibold">Cancelar cita</h2>
            <p className="mt-5 text-neutral-600">
              Al cancelar, este hueco volvera a quedar disponible para otras personas.
            </p>
            <form action="/api/cancel-booking" method="post" className="mt-5">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="h-12 w-full rounded-md border border-red-200 bg-white px-6 text-red-700 transition hover:bg-red-50"
              >
                Confirmar cancelacion
              </button>
            </form>
          </section>
        )}

        {booking && !canCancel && !isCancelled && (
          <p className="mt-5 text-neutral-600">
            Esta reserva ya no puede cancelarse desde este enlace.
          </p>
        )}

        <Link
          href="/"
          className="mt-7 inline-flex text-sm font-medium underline underline-offset-4"
        >
          Volver al marketplace
        </Link>
      </section>
    </main>
  );
}
