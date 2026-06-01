-- Identify the administrator behind sensitive operational changes.

alter table public.activity_logs
  add column if not exists actor_user_id uuid,
  add column if not exists actor_email text,
  add column if not exists actor_role text,
  add column if not exists entity_type text,
  add column if not exists entity_id text;

create index if not exists activity_logs_actor_created_idx
  on public.activity_logs (actor_user_id, created_at desc);

create index if not exists activity_logs_entity_created_idx
  on public.activity_logs (entity_type, entity_id, created_at desc);
