-- Admin metrics (spec 7.5). Aggregates only, computed from what was recorded. Admin only.
-- Never returns individual rows, emails, or founder groups.
create or replace function public.admin_metrics(p_from date, p_to date)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  t_from timestamptz := p_from::timestamptz;
  t_to timestamptz := (p_to + 1)::timestamptz;
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  with ev as (select * from public.events where created_at >= t_from and created_at < t_to),
  apps as (select * from public.applications where created_at >= t_from and created_at < t_to)
  select jsonb_build_object(
    'funnel', jsonb_build_object(
      'intake_started_visitors', (select count(distinct anon_id) from ev where name = 'intake_started' and anon_id is not null),
      'layer0_finished_visitors', (select count(distinct anon_id) from ev where name = 'layer0_finished' and anon_id is not null),
      'accounts_created', (select count(distinct user_id) from ev where name = 'account_created'),
      'layer2_finished', (select count(distinct user_id) from ev where name = 'layer2_finished'),
      'plans_generated', (select count(*) from ev where name = 'plan_generated')
    ),
    'applications', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from apps group by status) s),
    'dollars_won', (select coalesce(sum(amount_won), 0) from apps where status = 'won'),
    'won_with_amount', (select count(*) from apps where status = 'won' and amount_won is not null),
    'won_total', (select count(*) from apps where status = 'won'),
    'outcomes_reported', (select count(*) from apps where status in ('won', 'not_selected')),
    'outcomes_possible', (select count(*) from apps where status in ('applied', 'waiting', 'won', 'not_selected')),
    'shares', jsonb_build_object(
      'created', (select count(*) from ev where name = 'share_created'),
      'opened', (select count(*) from ev where name = 'share_opened')
    ),
    'by_school', (select coalesce(jsonb_object_agg(k, n), '{}') from (select coalesce(school::text, 'not_recorded') k, count(distinct user_id) n from ev where name = 'account_created' group by 1) s),
    'by_sector', (select coalesce(jsonb_object_agg(k, n), '{}') from (select coalesce(sector::text, 'not_recorded') k, count(distinct user_id) n from ev where name = 'account_created' group by 1) s),
    'by_month', (select coalesce(jsonb_agg(jsonb_build_object('month', m, 'event', name, 'count', n) order by m, name), '[]')
                 from (select to_char(date_trunc('month', created_at at time zone 'America/New_York'), 'YYYY-MM') m, name, count(*) n from ev group by 1, 2) s)
  ) into result;
  return result;
end $$;
revoke all on function public.admin_metrics(date, date) from public, anon;
grant execute on function public.admin_metrics(date, date) to authenticated;
