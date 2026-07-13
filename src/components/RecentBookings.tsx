"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { getBookingStatusClass } from "@/lib/booking-status";

type Booking = {
  id: number;
  full_name: string;
  clinic_name?: string | null;
  treatment: string;
  specialist_name?: string | null;
  status: string;
  booking_date: string;
};

export default function RecentBookings({
  initialBookings,
  scopeClinicName,
  scopeSpecialistName,
}: {
  initialBookings: Booking[];
  scopeClinicName?: string | null;
  scopeSpecialistName?: string | null;
}) {
  const [bookings, setBookings] =
    useState(initialBookings);

  useEffect(() => {
    function isBookingInScope(booking: Booking) {
      if (scopeSpecialistName) {
        return booking.specialist_name === scopeSpecialistName;
      }

      if (scopeClinicName) {
        return booking.clinic_name === scopeClinicName;
      }

      return true;
    }

    const channel = supabase
      .channel("recent-bookings")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          const booking = payload.new as Booking;

          if (!isBookingInScope(booking)) return;

          setBookings((prev) => [
            booking,
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scopeClinicName, scopeSpecialistName]);

  return (
    <div className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Actividad en vivo
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Últimas reservas
          </h2>
        </div>

        <div className="rounded-full bg-black px-5 py-3 text-sm text-white">
          EN VIVO
        </div>
      </div>

      <div className="mt-10 overflow-hidden rounded-[28px] border border-black/5">
        <div className="grid grid-cols-5 bg-[#F7F5F2] px-6 py-4 text-sm uppercase tracking-[0.2em] text-neutral-500">
          <div>Paciente</div>
          <div>Tratamiento</div>
          <div>Especialista</div>
          <div>Estado</div>
          <div>Fecha</div>
        </div>

        <div className="divide-y divide-black/5">
          {bookings
            .slice(0, 8)
            .map((booking) => (
              <div
                key={booking.id}
                className="grid grid-cols-5 items-center px-6 py-5"
              >
                <div className="font-medium">
                  {booking.full_name}
                </div>

                <div className="text-neutral-500">
                  {booking.treatment}
                </div>

                <div className="text-neutral-500">
                  {booking.specialist_name ||
                    "—"}
                </div>

                <div>
                  <span
                    className={`rounded-full px-4 py-2 text-xs ${getBookingStatusClass(
                      booking.status
                    )}`}
                  >
                    {booking.status}
                  </span>
                </div>

                <div className="text-neutral-500">
                  {booking.booking_date}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
