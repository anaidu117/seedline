-- Seedline signs people in with email magic links only (spec section 2).
-- 1. The custom access token hook refuses any token issued for a password sign-in, so a password
--    account created directly against the Auth API can never get a session.
-- 2. Admin status and share invites only trust confirmed email addresses.
create or replace function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
begin
  if event ->> 'authentication_method' = 'password' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'Seedline uses email sign-in links only. Request a link from the sign-in page.'));
  end if;
  return event;
end $$;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke all on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;

-- Only a confirmed email counts as an admin email.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select true from public.admins a
       join auth.users u on u.email::extensions.citext = a.email
      where u.id = auth.uid()
        and u.email_confirmed_at is not null
        and a.email = (auth.jwt() ->> 'email')::extensions.citext),
    false);
$$;
