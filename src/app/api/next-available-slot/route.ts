import { NextResponse } from "next/server";

import { findNextAvailableSlot } from "@/lib/next-available-slot";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const specialist = searchParams.get("specialist");
    const treatment = searchParams.get("treatment");
    const startDate = searchParams.get("startDate");

    if (!specialist) {
      return NextResponse.json(
        {
          slot: null,
          error: "Falta especialista",
        },
        {
          status: 400,
        }
      );
    }

    const slot = await findNextAvailableSlot({
      specialistName: specialist,
      treatment,
      startDate,
    });

    return NextResponse.json({
      slot,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        slot: null,
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
