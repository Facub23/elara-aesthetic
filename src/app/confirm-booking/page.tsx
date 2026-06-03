import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import {
  expirePendingBooking,
  isConfirmationExpired,
  pendingConfirmationStatuses,
} from "@/lib/booking-lifecycle";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Confirmar reserva",
  robots: {
    index: false,
    follow: false,
  },
};

function getBookingDate(value?: string | null) {
  return (value || "").slice(0, 10);
}

function getBookingTime(booking: any) {
  return (
    booking.booking_time?.slice(0, 5) ||
    booking.booking_date?.slice(11, 16) ||
    ""
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";

  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);

  return parsed.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function StatusCard({
  title,
  message,
  tone = "success",
  booking,
  confirmationToken,
}: {
  title: string;
  message: string;
  tone?: "success" | "error" | "info";
  booking?: any;
  confirmationToken?: string;
}) {
  const date = getBookingDate(booking?.booking_date);
  const time = getBookingTime(booking);
  const toneClasses = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    error: "bg-red-50 text-red-700 border-red-200",
    info: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <main className="min-h-screen bg-[#F6F3EE] px-6 py-10 text-black">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-5xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-[40px] border border-black/10 bg-white shadow-[0_24px_90px_rgba(0,0,0,0.06)]">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-black p-8 text-white lg:p-10">
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">
                EncuentraTuClinica
              </p>

              <h1 className="mt-6 text-5xl font-semibold leading-tight tracking-tight">
                {title}
              </h1>

              <p className="mt-6 text-lg leading-7 text-white/60">{message}</p>

              <div className={`mt-8 rounded-2xl border px-4 py-3 text-sm ${toneClasses[tone]}`}>
                {confirmationToken
                  ? "El horario queda protegido durante 30 minutos mientras completas la confirmacion."
                  : tone === "success"
                  ? "Tu cita queda registrada y el equipo puede verla en el panel admin."
                  : tone === "info"
                    ? "No hace falta volver a confirmar esta reserva."
                    : "Revisa el enlace recibido o solicita uno nuevo."}
              </div>
            </div>

            <div className="p-8 lg:p-10">
              {booking ? (
                <>
                  <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                    Resumen de la cita
                  </p>

                  <div className="mt-6 grid gap-3">
                    {[
                      ["Paciente", booking.full_name],
                      ["Clinica", booking.clinic_name],
                      ["Especialista", booking.specialist_name],
                      ["Tratamiento", booking.treatment],
                      ["Fecha", formatDate(date)],
                      ["Hora", time || "Sin hora"],
                      ["Estado", booking.status || "Confirmada"],
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
              ) : (
                <div className="rounded-3xl bg-[#F8F6F2] p-6 text-neutral-600">
                  No pudimos cargar los detalles de la reserva.
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                {confirmationToken && (
                  <form action="/api/confirm-booking" method="post">
                    <input type="hidden" name="token" value={confirmationToken} />
                    <button
                      type="submit"
                      className="rounded-full bg-black px-6 py-3 text-sm text-white transition hover:opacity-90"
                    >
                      Confirmar definitivamente
                    </button>
                  </form>
                )}

                <Link
                  href="/"
                  className="rounded-full border border-black/10 px-6 py-3 text-sm transition hover:border-black"
                >
                  Volver al inicio
                </Link>

                <Link
                  href="/tratamientos"
                  className="rounded-full border border-black/10 px-6 py-3 text-sm transition hover:border-black"
                >
                  Ver tratamientos
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default async function ConfirmBookingPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
  }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    redirect("/");
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (!booking) {
    return (
      <StatusCard
        title="Link invalido"
        message="Esta confirmacion ya no existe o no es valida."
        tone="error"
      />
    );
  }

  if (booking.confirmed_by_client) {
    return (
      <StatusCard
        title="Reserva ya confirmada"
        message="Tu reserva ya fue confirmada anteriormente."
        tone="info"
        booking={booking}
      />
    );
  }

  if (isConfirmationExpired(booking)) {
    await expirePendingBooking(booking);

    return (
      <StatusCard
        title="Enlace caducado"
        message="El plazo para confirmar esta solicitud ha terminado y el horario ha sido liberado. Puedes elegir un nuevo hueco disponible."
        tone="error"
        booking={{ ...booking, status: "Expirada" }}
      />
    );
  }

  if (!pendingConfirmationStatuses.includes(booking.status)) {
    return (
      <StatusCard
        title="Reserva no disponible"
        message="Esta solicitud ya no puede confirmarse porque su estado ha cambiado."
        tone="info"
        booking={booking}
      />
    );
  }

  return (
    <StatusCard
      title="Confirma tu reserva"
      message="Revisa los datos de la cita y confirma desde este enlace para dejar el horario reservado definitivamente."
      tone="info"
      booking={booking}
      confirmationToken={token}
    />
  );
}
