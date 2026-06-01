import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const treatment =
      searchParams.get("treatment");

    if (!treatment) {
      return NextResponse.json(
        {
          duration: 60,
        },
        {
          status: 200,
        }
      );
    }

    const { data, error } =
      await supabase
        .from(
          "treatment_durations"
        )
        .select("*")
        .ilike(
          "treatment_name",
          treatment
        )
        .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      duration:
        data?.duration_minutes ||
        60,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Error interno",
      },
      {
        status: 500,
      }
    );
  }
}