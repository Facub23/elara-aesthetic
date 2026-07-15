import {
  getAvailableBookingSlots,
  getEffectiveTreatmentDuration,
} from "@/lib/booking-availability";

type NextAvailableSlotInput = {
  specialistName: string;
  treatment?: string | null;
  startDate?: string | null;
  maxDays?: number;
};

export type NextAvailableSlotResult = {
  date: string;
  time: string;
  duration: number;
} | null;

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getStartDate(value?: string | null) {
  if (!value) {
    return new Date();
  }

  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

export async function findNextAvailableSlot({
  specialistName,
  treatment,
  startDate,
  maxDays = 45,
}: NextAvailableSlotInput): Promise<NextAvailableSlotResult> {
  if (!specialistName) {
    return null;
  }

  const duration = await getEffectiveTreatmentDuration({
    specialistName,
    treatment,
  });
  const start = getStartDate(startDate);

  for (let dayOffset = 0; dayOffset < maxDays; dayOffset += 1) {
    const date = formatDate(addDays(start, dayOffset));
    const availability = await getAvailableBookingSlots({
      specialistName,
      bookingDate: date,
      durationMinutes: duration,
    });

    if (!availability.blocked && availability.availableSlots.length > 0) {
      return {
        date,
        time: availability.availableSlots[0],
        duration,
      };
    }
  }

  return null;
}
