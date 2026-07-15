import { NextResponse } from "next/server";

import {
  getAvailableBookingSlots,
  getEffectiveTreatmentDuration,
} from "@/lib/booking-availability";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const specialist = searchParams.get("specialist");
    const date = searchParams.get("date");
    const bookingId = searchParams.get("bookingId");
    const treatment = searchParams.get("treatment");
    const duration = Number(
      searchParams.get("duration") || 60
    );

    if (!specialist || !date) {
      return NextResponse.json({
        availableSlots: [],
        bookedSlots: [],
        blockedSlots: [],
        blocked: false,
      });
    }

    const availability = await getAvailableBookingSlots({
      specialistName: specialist,
      bookingDate: date,
      durationMinutes: await getEffectiveTreatmentDuration({
        specialistName: specialist,
        treatment,
        fallbackDuration: duration,
      }),
      bookingId,
    });

    return NextResponse.json(availability);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        availableSlots: [],
        bookedSlots: [],
        blockedSlots: [],
        blocked: false,
        error:
          error instanceof Error
            ? error.message
            : "Error interno",
      },
      {
        status: 500,
      }
    );
  }
}
