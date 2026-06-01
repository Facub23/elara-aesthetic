"use client";

import { useState } from "react";
import { adminBookingStatusOptions } from "@/lib/booking-status";

export default function BookingStatusSelect({
  bookingId,
  currentStatus,
}: {
  bookingId: number;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(
    currentStatus || "Pendiente"
  );

  async function handleChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    const newStatus = e.target.value;

    setStatus(newStatus);

    const res = await fetch(
      "/api/update-booking-status",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: bookingId,
          status: newStatus,
        }),
      }
    );

    if (!res.ok) {
      setStatus(currentStatus || "Pendiente");
    }
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      className="rounded-full bg-black px-4 py-2 text-sm text-white"
    >
      {adminBookingStatusOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
