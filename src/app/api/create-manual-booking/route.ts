import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { createActivityLog } from "@/lib/activity";
import { hasAdminPermission } from "@/lib/admin-access";
import { getAssignedClinicName } from "@/lib/admin-scope";
import {
  getTreatmentDuration,
  validateBookingSlot,
} from "@/lib/booking-availability";
import { recordBookingEvent } from "@/lib/booking-events";
import { notifyManualBookingCreated } from "@/lib/booking-notifications";
import { syncBookingToGoogleCalendar } from "@/lib/google-calendar";
import { getSiteUrl } from "@/lib/site-url";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getTreatmentName } from "@/lib/treatment-utils";

type SpecialistRecord = {
  clinic_id?: string | number | null;
  clinic_name?: string | null;
  treatments?: Array<string | { name?: string | null }> | null;
};

function normalize(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    const { data: adminUser } = user
      ? await supabase
          .from("admin_users")
          .select("id,role,clinic_id,specialist_id,access_role,permissions,status")
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };

    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!hasAdminPermission({
      role: adminUser.role,
      accessRole: adminUser.access_role,
      permissions: adminUser.permissions,
      status: adminUser.status,
    }, "bookings")) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      clinic_name,
      specialist_name,
      full_name,
      email,
      booking_date,
      booking_time,
      treatment,
    } = body;

    const assignedClinicName = await getAssignedClinicName({
      role: adminUser.role,
      clinicId: adminUser.clinic_id,
    });

    if (assignedClinicName && assignedClinicName !== clinic_name) {
      return NextResponse.json(
        {
          success: false,
          error: "No puedes crear reservas para otra clinica",
        },
        { status: 403 }
      );
    }

    if (adminUser.access_role === "specialist") {
      const { data: assignedSpecialist } = adminUser.specialist_id
        ? await supabase
            .from("specialists")
            .select("name")
            .eq("id", adminUser.specialist_id)
            .maybeSingle()
        : { data: null };

      if (!assignedSpecialist?.name || assignedSpecialist.name !== specialist_name) {
        return NextResponse.json(
          {
            success: false,
            error: "No puedes crear reservas para otro especialista",
          },
          { status: 403 }
        );
      }
    }

    if (
      !specialist_name ||
      !full_name ||
      !booking_date ||
      !booking_time ||
      !treatment
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Faltan datos obligatorios",
        },
        {
          status: 400,
        }
      );
    }

    const { data: specialist, error: specialistError } = await supabase
      .from("specialists")
      .select("clinic_id,clinic_name,treatments")
      .eq("name", specialist_name)
      .maybeSingle();

    if (specialistError) {
      return NextResponse.json(
        {
          success: false,
          error: specialistError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!specialist) {
      return NextResponse.json(
        {
          success: false,
          error: "Especialista no encontrado",
        },
        {
          status: 404,
        }
      );
    }

    const specialistRecord = specialist as SpecialistRecord;
    const normalizedClinicName =
      clinic_name === "__independent__" ? "" : String(clinic_name || "").trim();
    const { data: selectedClinic } = normalizedClinicName
      ? await supabase
          .from("clinics")
          .select("id,name")
          .eq("name", normalizedClinicName)
          .maybeSingle()
      : { data: null };

    const isIndependentSpecialist =
      !specialistRecord.clinic_id && !specialistRecord.clinic_name;
    const belongsToClinic = isIndependentSpecialist
      ? !normalizedClinicName
      : (selectedClinic?.id &&
          specialistRecord.clinic_id &&
          String(selectedClinic.id) === String(specialistRecord.clinic_id)) ||
        normalize(specialistRecord.clinic_name) === normalize(normalizedClinicName);

    if (!belongsToClinic) {
      return NextResponse.json(
        {
          success: false,
          error: "El especialista no pertenece al lugar de atencion seleccionado",
        },
        {
          status: 409,
        }
      );
    }

    const offersTreatment = (specialistRecord.treatments || []).some(
      (item) => normalize(getTreatmentName(item)) === normalize(treatment)
    );

    if (!offersTreatment) {
      return NextResponse.json(
        {
          success: false,
          error: "El especialista no ofrece el tratamiento seleccionado",
        },
        {
          status: 409,
        }
      );
    }

    const bookingDateTime = `${booking_date} ${booking_time}`;
    const durationMinutes = await getTreatmentDuration(treatment);

    const validationError = await validateBookingSlot({
      specialistName: specialist_name,
      bookingDate: booking_date,
      bookingTime: booking_time,
      durationMinutes,
    });

    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: validationError,
        },
        {
          status: 409,
        }
      );
    }

    const cancellationToken = randomUUID();
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert([
        {
          clinic_name: isIndependentSpecialist
            ? "Consulta independiente"
            : normalizedClinicName,
          specialist_name,
          full_name,
          email: email || null,
          booking_date: bookingDateTime,
          booking_time,
          treatment,
          duration_minutes: durationMinutes,
          status: "Confirmada",
          confirmed_by_client: true,
          cancellation_token: cancellationToken,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Error creando reserva",
        },
        {
          status: 500,
        }
      );
    }

    const baseUrl = getSiteUrl();

    await recordBookingEvent({
      bookingId: booking.id,
      eventType: "created_manual",
      actorType: "admin",
      resultingStatus: "Confirmada",
      description: "Reserva creada manualmente desde el panel.",
      metadata: { booking_date, booking_time },
    });

    await createActivityLog({
      title: "Reserva creada manualmente",
      description: `Reserva #${booking.id} para ${booking.full_name || "Paciente"}`,
      actor: {
        userId: user?.id,
        email: user?.email,
        role: adminUser.role,
      },
      entityType: "booking",
      entityId: booking.id,
    });

    await notifyManualBookingCreated(booking, {
      cancellationUrl: `${baseUrl}/cancel-booking?token=${cancellationToken}`,
    });

    await syncBookingToGoogleCalendar(booking);

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Error interno",
      },
      {
        status: 500,
      }
    );
  }
}
