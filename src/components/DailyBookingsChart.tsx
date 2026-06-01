"use client";

import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Booking = {
  id: number;
  booking_date: string;
};

export default function DailyBookingsChart({
  bookings,
}: {
  bookings: Booking[];
}) {
  const grouped: Record<
    string,
    number
  > = {};

  bookings.forEach((booking) => {
    if (!booking.booking_date)
      return;

    grouped[
      booking.booking_date
    ] =
      (grouped[
        booking.booking_date
      ] || 0) + 1;
  });

  const data = Object.entries(
    grouped
  )
    .sort((a, b) =>
      a[0].localeCompare(b[0])
    )
    .map(([date, total]) => ({
      date: new Date(
        date
      ).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
      }),

      total,
    }));

  return (
    <div className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Reservas diarias
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Actividad por día
          </h2>
        </div>

        <div className="rounded-full bg-black px-5 py-3 text-sm text-white">
          {bookings.length} reservas
        </div>
      </div>

      <div className="mt-10 h-[420px]">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <LineChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: -10,
              bottom: 0,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#ECE7DF"
            />

            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{
                fill: "#737373",
                fontSize: 12,
              }}
            />

            <Tooltip
              contentStyle={{
                borderRadius: 24,
                border:
                  "1px solid rgba(0,0,0,0.05)",
                background:
                  "rgba(255,255,255,0.95)",
                boxShadow:
                  "0 20px 60px rgba(0,0,0,0.08)",
              }}
            />

            <Line
              type="monotone"
              dataKey="total"
              stroke="#000"
              strokeWidth={4}
              dot={{
                r: 5,
                strokeWidth: 0,
                fill: "#000",
              }}
              activeDot={{
                r: 7,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}