-- What the last weekly digest saw, so the next one only sends when something changed.
create table public.digest_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  eligible_slugs text[] not null default '{}',
  computed_at timestamptz not null default now()
);
alter table public.digest_snapshots enable row level security;
-- No policies: only Edge Functions (service role) read or write it.

-- Marks a check-in token used, only if it is unused and unexpired. Returns the application id, or null.
-- One statement, so two clicks at once cannot both succeed.
create or replace function public.consume_checkin_token(p_jti uuid, p_application_id uuid)
returns uuid
language sql security definer set search_path = '' as $$
  update public.checkin_tokens
     set used_at = now()
   where jti = p_jti and application_id = p_application_id and used_at is null and expires_at > now()
  returning application_id;
$$;
revoke all on function public.consume_checkin_token(uuid, uuid) from public, anon, authenticated;
grant execute on function public.consume_checkin_token(uuid, uuid) to service_role;
