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
}: {
  clinicName: string;
  specialistName: string;
  treatments: TreatmentOption[];
  initialTreatment?: string;
  initialDate?: string;
  initialTime?: string;
  bookingSource?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-black px-8 py-4 text-white"
      >
        Reservar consulta
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
