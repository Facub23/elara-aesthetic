import { notFound } from "next/navigation";
import type { Metadata } from "next";

import ReviewForm from "@/components/ReviewForm";
import { getBookingStatusKey } from "@/lib/booking-status";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Opinion verificada",
  robots: {
    index: false,
    follow: false,
  },
};

function cleanBrandText(value?: string | null) {
  return (value || "").replace(/ELARA/gi, "EncuentraTuClinica");
}

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { bookingId } = await params;
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id,full_name,clinic_name,specialist_name,treatment,status")
    .eq("id", bookingId)
    .eq("review_token", token)
    .maybeSingle();

  if (!booking) {
    notFound();
  }

  if (getBookingStatusKey(booking.status) !== "completed") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F6F3EE] p-6">
        <div className="w-full max-w-2xl rounded-lg bg-white p-10 text-center shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            Opinion verificada
          </p>
          <h1 className="mt-6 text-4xl font-semibold">Todavia no disponible</h1>
          <p className="mt-4 text-neutral-500">
            Podras compartir tu experiencia cuando la cita haya sido completada.
          </p>
        </div>
      </main>
    );
  }

  const { data: existingReview } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existingReview) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F6F3EE] p-6">
        <div className="w-full max-w-2xl rounded-lg bg-white p-10 text-center shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            Opinion recibida
          </p>
          <h1 className="mt-6 text-4xl font-semibold">Ya compartiste tu experiencia</h1>
          <p className="mt-4 text-neutral-500">
            Gracias por ayudar a otras personas a elegir con mas confianza.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F3EE] p-6 lg:p-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg bg-black p-10 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Opinion de reserva verificada
          </p>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight">
            {booking.full_name}
          </h1>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              cleanBrandText(booking.clinic_name),
              cleanBrandText(booking.specialist_name),
              cleanBrandText(booking.treatment),
            ]
              .filter(Boolean)
              .map((label) => (
                <div key={label} className="rounded-full bg-white/10 px-5 py-3 text-sm">
                  {label}
                </div>
              ))}
          </div>
        </div>

        <div className="mt-8">
          <ReviewForm bookingId={bookingId} reviewToken={token} />
        </div>
      </div>
    </main>
  );
}
