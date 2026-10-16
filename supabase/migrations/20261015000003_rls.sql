-- Row-level security on every table, plus the helper functions the policies use.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- True when the signed-in user's email is in public.admins.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select true from public.admins a
      where a.email = (auth.jwt() ->> 'email')::extensions.citext),
    false);
$$;

-- True when the signed-in user has an approved claim on this listing.
create or replace function public.is_organizer_of(opp uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.opportunity_claims c
    where c.opportunity_id = opp and c.user_id = auth.uid() and c.status = 'approved');
$$;

-- Requests through the API run as anon or authenticated. Anything else
-- (service_role in Edge Functions, postgres in migrations and seed) is trusted.
create or replace function public.is_trusted_role() returns boolean
language sql stable set search_path = '' as $$
  select current_user not in ('anon', 'authenticated');
$$;

revoke all on function public.is_organizer_of(uuid) from public, anon;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_organizer_of(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------

alter table public.admins enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_founder_groups enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_research_notes enable row level security;
alter table public.opportunity_claims enable row level security;
alter table public.submissions enable row level security;
alter table public.materials enable row level security;
alter table public.answers enable row level security;
alter table public.drafts enable row level security;
alter table public.applications enable row level security;
alter table public.plan_snapshots enable row level security;
alter table public.share_links enable row level security;
alter table public.share_invites enable row level security;
alter table public.checkin_tokens enable row level security;
alter table public.email_log enable row level security;
alter table public.rate_limits enable row level security;
alter table public.events enable row level security;

-- admins, checkin_tokens, email_log, rate_limits: no policies at all.
-- Only Edge Functions (service role) and SECURITY DEFINER functions reach them.

-- ---------------------------------------------------------------------------
-- Founder-owned tables: owner only. Admins get no row access (metrics are aggregates).
-- ---------------------------------------------------------------------------

create policy "profiles: owner reads" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "profiles: owner inserts" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "profiles: owner updates" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "founder groups: owner reads" on public.profile_founder_groups for select to authenticated using (user_id = auth.uid());
create policy "founder groups: owner inserts" on public.profile_founder_groups for insert to authenticated with check (user_id = auth.uid());
create policy "founder groups: owner updates" on public.profile_founder_groups for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "founder groups: owner deletes" on public.profile_founder_groups for delete to authenticated using (user_id = auth.uid());

create policy "materials: owner all" on public.materials for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "answers: owner all" on public.answers for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "drafts: owner all" on public.drafts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "plan snapshots: owner all" on public.plan_snapshots for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "applications: owner reads" on public.applications for select to authenticated using (user_id = auth.uid());
create policy "applications: owner inserts" on public.applications for insert to authenticated with check (user_id = auth.uid());
create policy "applications: owner updates" on public.applications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "applications: owner deletes" on public.applications for delete to authenticated using (user_id = auth.uid());
-- Founders cannot write the outcome snapshot columns themselves; a trigger sets them.
revoke insert, update on public.applications from authenticated;
grant insert (user_id, opportunity_id, status, amount_won) on public.applications to authenticated;
grant update (status, amount_won) on public.applications to authenticated;

create policy "share links: owner reads" on public.share_links for select to authenticated using (user_id = auth.uid());
create policy "share links: owner updates" on public.share_links for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "share links: owner deletes" on public.share_links for delete to authenticated using (user_id = auth.uid());
-- Links are created by the share-create Edge Function (hashing happens there).
-- Owners may only revoke or change the expiry directly.
revoke insert, update on public.share_links from authenticated;
grant update (revoked_at, expires_at, label) on public.share_links to authenticated;

create policy "share invites: owner reads" on public.share_invites for select to authenticated
  using (exists (select 1 from public.share_links s where s.id = share_id and s.user_id = auth.uid()));
create policy "share invites: owner deletes" on public.share_invites for delete to authenticated
  using (exists (select 1 from public.share_links s where s.id = share_id and s.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Opportunities
-- ---------------------------------------------------------------------------

-- Founders and the public see only verified, unarchived listings. Unverified never leaves the admin view.
create policy "opportunities: public reads verified" on public.opportunities for select to anon, authenticated
  using (verification_status <> 'unverified' and not archived);
create policy "opportunities: admin reads all" on public.opportunities for select to authenticated using (public.is_admin());
create policy "opportunities: organizer reads own" on public.opportunities for select to authenticated using (public.is_organizer_of(id));
create policy "opportunities: admin inserts" on public.opportunities for insert to authenticated with check (public.is_admin());
create policy "opportunities: admin updates" on public.opportunities for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "opportunities: organizer updates own" on public.opportunities for update to authenticated
  using (public.is_organizer_of(id)) with check (public.is_organizer_of(id));
create policy "opportunities: admin deletes" on public.opportunities for delete to authenticated using (public.is_admin());

-- Organizers can edit content, not verification or identity fields. Their edits go live,
-- are marked organizer-verified, and are flagged for the admin queue (PLAN.md Q4).
-- SECURITY INVOKER on purpose: current_user must be the caller's role for is_trusted_role().
create or replace function public.guard_opportunity_update() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if public.is_trusted_role() or public.is_admin() then
    return new;
  end if;
  if new.slug is distinct from old.slug
     or new.verification_status is distinct from old.verification_status
     or new.last_verified_at is distinct from old.last_verified_at
     or new.verified_by is distinct from old.verified_by
     or new.archived is distinct from old.archived
     or new.organizer_edited_at is distinct from old.organizer_edited_at then
    raise exception 'Only admins can change verification, slug or archive fields'
      using errcode = '42501';
  end if;
  new.verification_status := 'organizer_verified';
  new.last_verified_at := now();
  new.verified_by := 'organizer';
  new.organizer_edited_at := now();
  return new;
end $$;
create trigger opportunities_guard before update on public.opportunities
  for each row execute function public.guard_opportunity_update();

create policy "research notes: admin all" on public.opportunity_research_notes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Claims and submissions (inserted by Edge Functions with rate limits and Turnstile)
-- ---------------------------------------------------------------------------

create policy "claims: claimant reads own" on public.opportunity_claims for select to authenticated using (user_id = auth.uid());
create policy "claims: admin reads" on public.opportunity_claims for select to authenticated using (public.is_admin());
create policy "claims: admin updates" on public.opportunity_claims for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Approving a claim marks the listing as verified by its organizer.
create or replace function public.on_claim_reviewed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.opportunities
      set verification_status = 'organizer_verified', last_verified_at = now(), verified_by = 'organizer'
      where id = new.opportunity_id;
  end if;
  return new;
end $$;
create trigger opportunity_claims_reviewed after update of status on public.opportunity_claims
  for each row execute function public.on_claim_reviewed();

create policy "submissions: admin reads" on public.submissions for select to authenticated using (public.is_admin());
create policy "submissions: admin updates" on public.submissions for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Events: anyone may record their own events; only admins read them.
-- ---------------------------------------------------------------------------

create policy "events: anon inserts anonymous" on public.events for insert to anon with check (user_id is null);
create policy "events: user inserts own" on public.events for insert to authenticated with check (user_id is null or user_id = auth.uid());
create policy "events: admin reads" on public.events for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Application outcome snapshot
-- ---------------------------------------------------------------------------

-- The first time an application leaves "planning", record the founder's stage and sector,
-- so "Founders like you" compares founders as they were when they applied.
create or replace function public.snapshot_application() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status not in ('planning', 'skipped') and new.stage_at_application is null then
    select p.stage, p.sector into new.stage_at_application, new.sector_at_application
      from public.profiles p where p.user_id = new.user_id;
  end if;
  if new.status in ('won', 'not_selected')
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.reported_at := now();
  end if;
  return new;
end $$;
create trigger applications_snapshot before insert or update on public.applications
  for each row execute function public.snapshot_application();

-- ---------------------------------------------------------------------------
-- Aggregate outcome data. Only ever returned in aggregate, and only at 10 or more reports.
-- ---------------------------------------------------------------------------

create or replace function public.founders_like_you(opp uuid, p_stage public.stage, p_sector public.sector)
returns table (reported integer, won integer)
language sql stable security definer set search_path = '' as $$
  select r.reported, r.won from (
    select count(*) filter (where a.status in ('won', 'not_selected'))::integer as reported,
           count(*) filter (where a.status = 'won')::integer as won
    from public.applications a
    where a.opportunity_id = opp
      and a.stage_at_application = p_stage
      and a.sector_at_application = p_sector
  ) r
  where r.reported >= 10;
$$;
revoke all on function public.founders_like_you(uuid, public.stage, public.sector) from public, anon;
grant execute on function public.founders_like_you(uuid, public.stage, public.sector) to authenticated;

-- ---------------------------------------------------------------------------
-- Private calendar feed token: returns the raw token once, stores only its hash.
-- ---------------------------------------------------------------------------

create or replace function public.rotate_calendar_token() returns text
language plpgsql security definer set search_path = '' as $$
declare
  raw text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if auth.uid() is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  update public.profiles
    set calendar_token_hash = encode(extensions.digest(raw, 'sha256'), 'hex')
    where user_id = auth.uid();
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  return raw;
end $$;
revoke all on function public.rotate_calendar_token() from public, anon;
grant execute on function public.rotate_calendar_token() to authenticated;

-- Remove default execute from anon on the trigger and helper functions.
revoke all on function public.guard_opportunity_update() from public, anon, authenticated;
revoke all on function public.on_claim_reviewed() from public, anon, authenticated;
revoke all on function public.snapshot_application() from public, anon, authenticated;

-- Supabase grants anon execute on new functions by default. Close that for everything except is_admin().
revoke all on function public.is_trusted_role() from public, anon;
grant execute on function public.is_trusted_role() to authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
