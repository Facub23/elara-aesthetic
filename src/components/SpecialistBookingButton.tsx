"use client";

import { useState } from "react";

import { BookingModal } from "@/components/modals/booking-modal";

type TreatmentOption =
  | string
  | {
      name?: string | null;
      price?: string | number | null;
    };

export default function SpecialistBookingButton({
  clinicName,
  specialistName,
  treatments,
  initialTreatment,
  initialDate,
  initialTime,
  bookingSource = "specialist_profile",
  label = "Reservar consulta",
}: {
  clinicName: string;
  specialistName: string;
  treatments: TreatmentOption[];
  initialTreatment?: string;
  initialDate?: string;
  initialTime?: string;
  bookingSource?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-black px-8 py-4 text-sm font-medium text-white shadow-[0_14px_35px_rgba(0,0,0,0.18)] transition hover:scale-[1.02] hover:opacity-95"
      >
        {label}
      </button>

      <BookingModal
        open={open}
        onClose={() => setOpen(false)}
        clinicName={clinicName}
        specialistName={specialistName}
        treatments={treatments}
        initialTreatment={initialTreatment}
        initialDate={initialDate}
        initialTime={initialTime}
        bookingSource={bookingSource}
      />
    </>
  );
}
