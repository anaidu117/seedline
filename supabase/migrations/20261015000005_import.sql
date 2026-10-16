-- Imports one validated row atomically: the listing and its admin-only research notes, or nothing.
-- Every imported row is unverified, whatever the file said (spec section 10).
-- Called only by the csv-import Edge Function with the service role.
create or replace function public.admin_import_opportunity(p_row jsonb, p_notes text, p_overwrite boolean)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  r public.opportunities;
  existing_id uuid;
  result text;
begin
  r := jsonb_populate_record(null::public.opportunities, p_row);
  select id into existing_id from public.opportunities where slug = r.slug;
  if existing_id is not null and not p_overwrite then
    return 'skipped';
  end if;
  if existing_id is null then
    insert into public.opportunities (
      slug, name, organizer, type, geography_level, regions, description, amount_min, amount_max, amount_notes,
      equity_required, equity_notes, deadline_type, opens_at, deadline_at, decision_at, cycle_notes, application_url,
      source_url, eligibility_rules, target_groups, materials_required, application_questions, past_results_text,
      past_results_count, past_results_year, past_results_source_url, past_winners, verification_status)
    values (
      r.slug, r.name, r.organizer, r.type, r.geography_level, r.regions, r.description, r.amount_min, r.amount_max, r.amount_notes,
      r.equity_required, r.equity_notes, r.deadline_type, r.opens_at, r.deadline_at, r.decision_at, r.cycle_notes, r.application_url,
      r.source_url, r.eligibility_rules, r.target_groups, r.materials_required, r.application_questions, r.past_results_text,
      r.past_results_count, r.past_results_year, r.past_results_source_url, r.past_winners, 'unverified')
    returning id into existing_id;
    result := 'inserted';
  else
    update public.opportunities set
      name = r.name, organizer = r.organizer, type = r.type, geography_level = r.geography_level, regions = r.regions,
      description = r.description, amount_min = r.amount_min, amount_max = r.amount_max, amount_notes = r.amount_notes,
      equity_required = r.equity_required, equity_notes = r.equity_notes, deadline_type = r.deadline_type,
      opens_at = r.opens_at, deadline_at = r.deadline_at, decision_at = r.decision_at, cycle_notes = r.cycle_notes,
      application_url = r.application_url, source_url = r.source_url, eligibility_rules = r.eligibility_rules,
      target_groups = r.target_groups, materials_required = r.materials_required,
      application_questions = r.application_questions, past_results_text = r.past_results_text,
      past_results_count = r.past_results_count, past_results_year = r.past_results_year,
      past_results_source_url = r.past_results_source_url, past_winners = r.past_winners,
      verification_status = 'unverified', last_verified_at = null, verified_by = null
    where id = existing_id;
    result := 'updated';
  end if;
  insert into public.opportunity_research_notes (opportunity_id, notes)
    values (existing_id, coalesce(p_notes, ''))
    on conflict (opportunity_id) do update set notes = excluded.notes, updated_at = now();
  return result;
end $$;
revoke all on function public.admin_import_opportunity(jsonb, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_import_opportunity(jsonb, text, boolean) to service_role;

-- Atomic counter for Edge Function rate limits. Returns the count after this request.
create or replace function public.bump_rate_limit(p_bucket text, p_key_hash text, p_window_start timestamptz)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  c integer;
begin
  insert into public.rate_limits (bucket, key_hash, window_start, count)
    values (p_bucket, p_key_hash, p_window_start, 1)
    on conflict (bucket, key_hash, window_start) do update set count = public.rate_limits.count + 1
    returning count into c;
  delete from public.rate_limits where window_start < now() - interval '2 days';
  return c;
end $$;
revoke all on function public.bump_rate_limit(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.bump_rate_limit(text, text, timestamptz) to service_role;
