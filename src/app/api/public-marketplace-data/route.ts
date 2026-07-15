import { NextResponse } from "next/server";

import { filterPublicRecords } from "@/lib/public-records";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const [
    { data: clinics, error: clinicsError },
    { data: specialists, error: specialistsError },
    { data: reviews, error: reviewsError },
  ] = await Promise.all([
    supabase
      .from("clinics")
      .select(
        "id,name,slug,city,country,location,image,description,rating,patients,experience"
      ),
    supabase
      .from("specialists")
      .select(
        "id,name,slug,clinic_id,clinic_name,specialty,treatments"
      ),
    supabase
      .from("reviews")
      .select("clinic_name,specialist_name,patient_name,treatment,review,rating")
      .eq("status", "Aprobada"),
  ]);

  const error = clinicsError || specialistsError || reviewsError;

  if (error) {
    console.error("Public marketplace data error", error);

    return NextResponse.json(
      {
        success: false,
        error: "No se pudieron cargar los datos publicos.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(
    {
      clinics: filterPublicRecords(clinics || []),
      specialists: filterPublicRecords(specialists || []),
      reviews: filterPublicRecords(reviews || []),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
