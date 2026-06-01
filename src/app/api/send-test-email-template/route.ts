import { NextResponse } from "next/server";

import {
  EmailTemplate,
  renderEmailTemplateText,
} from "@/lib/email-templates";
import { sendNotificationChannel } from "@/lib/notification-channels";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const demoVariables = {
  nombre: "Paciente Demo",
  email: "paciente.demo@example.com",
  telefono: "+34 600 111 222",
  telefono_label: " - Telefono: +34 600 111 222",
  tratamiento: "Botox",
  clinica: "Clinica Demo Madrid",
  especialista: "Dra. Valentina Ruiz",
  fecha_label: " el 25/06/2026 a las 10:30",
  estado: "Confirmada",
  cambio_anterior: " Antes figuraba para 24/06/2026 a las 09:00.",
};

async function ensureAdmin() {
  const supabaseAuth = await createClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user?.email) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
      email: null,
    };
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminUser) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
      email: null,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    email: user.email,
  };
}

export async function POST(req: Request) {
  const admin = await ensureAdmin();

  if (!admin.ok) {
    return NextResponse.json(
      {
        success: false,
        error: admin.error,
      },
      {
        status: admin.status,
      }
    );
  }

  try {
    const body = await req.json();
    const template = body.template as Partial<EmailTemplate> | undefined;
    const to = body.to || admin.email;

    if (
      !template?.subject ||
      !template?.title ||
      !template?.body ||
      !to
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Plantilla o destinatario invalido",
        },
        {
          status: 400,
        }
      );
    }

    const result = await sendNotificationChannel({
      channel: "email",
      recipient: to,
      subject: renderEmailTemplateText(template.subject, demoVariables),
      title: renderEmailTemplateText(template.title, demoVariables),
      message: renderEmailTemplateText(template.body, demoVariables),
      ctaLabel: template.cta_label
        ? renderEmailTemplateText(template.cta_label, demoVariables)
        : undefined,
      ctaUrl: "https://encuentratuclinica.es",
    });

    return NextResponse.json({
      success: true,
      status: result.status,
      to,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
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
