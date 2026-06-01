-- Remove legacy Storage write policies now that admin uploads go through the server.
-- Existing SELECT-only policies are kept so published marketplace media remains readable.

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  loop
    execute format(
      'drop policy if exists %I on storage.objects',
      policy_record.policyname
    );
  end loop;
end
$$;

revoke insert, update, delete on table storage.objects from anon, authenticated;
