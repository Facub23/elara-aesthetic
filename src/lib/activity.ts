import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function createActivityLog({
  title,
  description,
  actor,
  entityType,
  entityId,
}: {
  title: string;
  description?: string;
  actor?: {
    userId?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  entityType?: string | null;
  entityId?: string | number | null;
}) {
  await supabase
    .from("activity_logs")
    .insert({
      title,
      description,
      actor_user_id: actor?.userId || null,
      actor_email: actor?.email || null,
      actor_role: actor?.role || null,
      entity_type: entityType || null,
      entity_id: entityId === undefined || entityId === null ? null : String(entityId),
    });
}
