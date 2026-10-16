-- Scheduled jobs (spec 2): weekly digest, daily reminders, daily check-ins.
-- The functions URL and cron secret are read from Vault, never stored in this file.
-- Set them once per environment (README "Scheduled jobs"):
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1', 'seedline_functions_url');
--   select vault.create_secret('<same value as the CRON_SECRET function secret>', 'seedline_cron_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_scheduled(fn text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  base text := (select decrypted_secret from vault.decrypted_secrets where name = 'seedline_functions_url');
  secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'seedline_cron_secret');
begin
  if base is null or secret is null then
    raise warning 'invoke_scheduled(%): Vault secrets seedline_functions_url and seedline_cron_secret are not set', fn;
    return null;
  end if;
  return net.http_post(
    url := base || '/' || fn,
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
end $$;
revoke all on function public.invoke_scheduled(text) from public, anon, authenticated;

-- Times are UTC. 13:00 UTC is 9:00 in New York during daylight time, 8:00 in winter.
select cron.schedule('seedline-weekly-digest', '0 13 * * 1', $$select public.invoke_scheduled('send-digest')$$);
select cron.schedule('seedline-daily-reminders', '0 13 * * *', $$select public.invoke_scheduled('send-reminders')$$);
select cron.schedule('seedline-daily-checkins', '30 13 * * *', $$select public.invoke_scheduled('send-checkins')$$);
