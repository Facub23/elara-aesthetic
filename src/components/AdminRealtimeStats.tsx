"use client";

import { useEffect, useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";
import {
  getBookingStatusKey,
  isPendingBookingStatus,
} from "@/lib/booking-status";

type Booking = {
  id: string;
  status: string;
  booking_date: string;
  full_name: string;
};

type Stat = {
  title: string;
  value: string | number;
  growth: string;
};

export default function AdminRealtimeStats({
  initialBookings,
}: {
  initialBookings: Booking[];
}) {
  const [bookings, setBookings] =
    useState(initialBookings);

  useEffect(() => {

    const channel =
      supabaseBrowser
        .channel("admin-realtime-stats")

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookings",
          },

          async () => {

            const {
              data,
            } = await supabaseBrowser
              .from("bookings")
              .select("*");

            setBookings(data || []);
          }
        )

        .subscribe();

    return () => {
      supabaseBrowser.removeChannel(
        channel
      );
    };

  }, []);

  const pendingBookings =
    bookings.filter(
      (booking) => isPendingBookingStatus(booking.status)
    ).length;

  const confirmedBookings =
    bookings.filter(
      (booking) => getBookingStatusKey(booking.status) === "confirmed"
    ).length;

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  const todayBookings =
    bookings.filter((booking) => {

      if (
        !booking.booking_date
      )
        return false;

      return booking.booking_date.includes(
        today
      );

    }).length;

  const totalPatients =
    new Set(
      bookings.map(
        (booking) =>
          booking.full_name
      )
    ).size;

  const conversionRate =
    bookings.length
      ? Math.round(
          (confirmedBookings /
            bookings.length) *
            100
        )
      : 0;

  const stats: Stat[] = [
    {
      title: "Reservas",
      value: bookings.length,
      growth: `+${todayBookings} hoy`,
    },

    {
      title: "Confirmadas",
      value: confirmedBookings,
      growth: "Citas activas",
    },

    {
      title: "Pacientes",
      value: totalPatients,
      growth: `${conversionRate}% conversión`,
    },

    {
      title: "Pendientes",
      value: pendingBookings,
      growth: "Por confirmar",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">

      {stats.map((stat) => (

        <div
          key={stat.title}
          className="rounded-[32px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)] backdrop-blur-2xl"
        >

          <div className="flex items-start justify-between gap-4">

            <div>

              <div className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                {stat.title}
              </div>

              <div className="mt-5 text-5xl font-semibold tracking-tight">
                {stat.value}
              </div>

            </div>

            <div className="rounded-full bg-[#F2EEE8] px-4 py-2 text-sm font-medium">
              {stat.growth}
            </div>

          </div>

        </div>

      ))}

    </div>
  );
}
