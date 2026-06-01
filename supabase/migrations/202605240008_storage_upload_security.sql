-- Admin media uploads now pass through a server route using the service role.
-- Prevent direct browser writes even if an older bucket policy is permissive.

revoke insert, update, delete on table storage.objects from anon, authenticated;
