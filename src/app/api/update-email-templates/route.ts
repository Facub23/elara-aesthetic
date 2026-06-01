import { NextResponse } from "next/server";

import { createActivityLog } from "@/lib/activity";
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/email-templates";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabaseAuth = await createClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!adminUser) {
    return NextResponse.json(
      {
        success: false,
        error: "Forbidden",
      },
      {
        status: 403,
      }
    );
  }

  const body = await req.json();
  const templates = body.reset ? DEFAULT_EMAIL_TEMPLATES : body.templates;

  if (!Array.isArray(templates)) {
    return NextResponse.json(
      {
        success: false,
        error: "Plantillas invalidas",
      },
      {
        status: 400,
      }
    );
  }

  const payload = templates.map((template) => ({
    key: template.key,
    name: template.name,
    description: template.description,
    subject: template.subject,
    title: template.title,
    body: template.body,
    cta_label: template.cta_label || null,
    active: Boolean(template.active),
    sort_order: Number(template.sort_order) || 0,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("email_templates")
    .upsert(payload, {
      onConflict: "key",
    });

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }

  await createActivityLog({
    title: body.reset ? "Plantillas de email restauradas" : "Plantillas de email actualizadas",
    description: `${payload.length} plantillas procesadas`,
    actor: {
      userId: user.id,
      email: user.email,
      role: adminUser.role,
    },
    entityType: "email_templates",
    entityId: "transactional",
  });

  return NextResponse.json({
    success: true,
    templates: payload,
  });
}
