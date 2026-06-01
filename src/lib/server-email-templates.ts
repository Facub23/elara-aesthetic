import "server-only";

import {
  DEFAULT_EMAIL_TEMPLATES,
  renderEmailTemplateText,
  type EmailTemplateKey,
} from "@/lib/email-templates";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getRenderedEmailTemplate({
  key,
  variables,
}: {
  key: EmailTemplateKey;
  variables: Record<string, string | number | null | undefined>;
}) {
  const defaultTemplate = DEFAULT_EMAIL_TEMPLATES.find(
    (template) => template.key === key
  );

  if (!defaultTemplate) return null;

  const { data } = await supabaseAdmin
    .from("email_templates")
    .select("key,name,description,subject,title,body,cta_label,active,sort_order")
    .eq("key", key)
    .maybeSingle();

  const template = {
    ...defaultTemplate,
    ...(data || {}),
  };

  if (!template.active) return null;

  return {
    subject: renderEmailTemplateText(template.subject, variables),
    title: renderEmailTemplateText(template.title, variables),
    message: renderEmailTemplateText(template.body, variables),
    ctaLabel: template.cta_label
      ? renderEmailTemplateText(template.cta_label, variables)
      : undefined,
  };
}
