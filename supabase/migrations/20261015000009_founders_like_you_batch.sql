-- "Founders like you" for many listings at once (the plan page's cards). Same rule as founders_like_you:
-- aggregates only, same stage and sector at application time, nothing returned below 10 reports.
create or replace function public.founders_like_you_many(opps uuid[], p_stage public.stage, p_sector public.sector)
returns table (opportunity_id uuid, reported integer, won integer)
language sql stable security definer set search_path = '' as $$
  select a.opportunity_id,
         count(*) filter (where a.status in ('won', 'not_selected'))::integer,
         count(*) filter (where a.status = 'won')::integer
  from public.applications a
  where a.opportunity_id = any (opps)
    and a.stage_at_application = p_stage
    and a.sector_at_application = p_sector
  group by a.opportunity_id
  having count(*) filter (where a.status in ('won', 'not_selected')) >= 10;
$$;
revoke all on function public.founders_like_you_many(uuid[], public.stage, public.sector) from public, anon;
grant execute on function public.founders_like_you_many(uuid[], public.stage, public.sector) to authenticated;
