-- Core tables. Column names match the keys in shared/vocab.ts.
-- RLS is enabled on every table in the next migration.

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Admins are defined by email. Nobody can read or write this table through the API.
create table public.admins (
  email extensions.citext primary key,
  created_at timestamptz not null default now()
);

-- One row per founder. Every answer column is nullable: null means "not answered".
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Layer 0
  school public.school,
  student_status public.student_status,
  state public.us_state,
  city text check (city is null or char_length(city) <= 120),
  stage public.stage,
  sector public.sector,
  incorporated boolean,
  -- Layer 2
  incorporation_state public.us_state,
  founded_on date check (founded_on is null or extract(day from founded_on) = 1),
  university_ip public.university_ip,
  team_size public.team_size,
  paying_customers public.paying_customers_range,
  monthly_revenue_range public.monthly_revenue_range,
  funding_needed public.funding_needed_range,
  funding_deadline date,
  equity_ok boolean,
  majority_us_owned boolean,
  us_citizen_or_pr boolean,
  -- Milestones the founder has marked. Present for every signed-in founder.
  milestones public.milestone[] not null default '{}',
  -- Email preferences
  email_digest boolean not null default true,
  email_reminders boolean not null default true,
  email_checkins boolean not null default true,
  -- Private calendar feed. Only a SHA-256 hash of the token is stored.
  calendar_token_hash text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Founder groups live apart from profiles so no admin, share or metrics query can touch them.
-- No row means "not answered". An empty array means "answered, none apply".
create table public.profile_founder_groups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  groups public.founder_group[] not null default '{}',
  prefer_not_to_say boolean not null default false,
  answered_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 200),
  organizer text not null,
  type public.opportunity_type not null,
  geography_level public.geography_level not null,
  regions text[] not null default '{}',
  description text,
  amount_min integer check (amount_min is null or amount_min >= 0),
  amount_max integer check (amount_max is null or amount_max >= 0),
  amount_notes text,
  equity_required boolean not null default false,
  equity_notes text,
  deadline_type public.deadline_type not null,
  opens_at date,
  deadline_at date,
  decision_at date,
  cycle_notes text,
  application_url text,
  source_url text not null,
  eligibility_rules jsonb not null default '[]' check (jsonb_typeof(eligibility_rules) = 'array'),
  target_groups public.founder_group[] not null default '{}',
  materials_required public.material_key[] not null default '{}',
  application_questions jsonb not null default '[]' check (jsonb_typeof(application_questions) = 'array'),
  past_results_text text,
  past_results_count integer check (past_results_count is null or past_results_count >= 0),
  past_results_year integer check (past_results_year is null or past_results_year between 1900 and 2200),
  past_results_source_url text,
  past_winners jsonb not null default '[]' check (jsonb_typeof(past_winners) = 'array'),
  verification_status public.verification_status not null default 'unverified',
  last_verified_at timestamptz,
  verified_by text,
  -- Set when an approved organizer edits the listing, so it shows in the admin queue.
  organizer_edited_at timestamptz,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_min is null or amount_max is null or amount_min <= amount_max),
  check (opens_at is null or deadline_at is null or opens_at <= deadline_at)
);
create trigger opportunities_updated_at before update on public.opportunities
  for each row execute function public.set_updated_at();
create index opportunities_visible_idx on public.opportunities (verification_status, archived);

-- research_notes is admin only. RLS works on rows, so it gets its own table.
create table public.opportunity_research_notes (
  opportunity_id uuid primary key references public.opportunities (id) on delete cascade,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table public.opportunity_claims (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  claimant_email extensions.citext not null,
  organization text not null,
  role_title text not null,
  message text,
  status public.review_status not null default 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index opportunity_claims_lookup_idx on public.opportunity_claims (opportunity_id, user_id, status);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  submitter_email extensions.citext not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status public.review_status not null default 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.materials (
  user_id uuid not null references auth.users (id) on delete cascade,
  material_key public.material_key not null,
  kind public.material_kind not null,
  storage_path text,
  url text,
  file_name text,
  updated_at timestamptz not null default now(),
  primary key (user_id, material_key),
  check ((kind = 'file' and storage_path is not null) or (kind = 'link' and url ~ '^https?://'))
);

create table public.answers (
  user_id uuid not null references auth.users (id) on delete cascade,
  answer_key public.answer_key not null,
  length public.answer_length not null,
  body text not null check (char_length(body) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, answer_key, length)
);

create table public.drafts (
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  question_index integer not null check (question_index >= 0),
  body text not null check (char_length(body) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, opportunity_id, question_index)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  status public.application_status not null default 'planning',
  -- Snapshotted the first time status leaves planning, for "Founders like you".
  stage_at_application public.stage,
  sector_at_application public.sector,
  amount_won integer check (amount_won is null or amount_won >= 0),
  reported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);
create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();
create index applications_outcomes_idx on public.applications (opportunity_id, stage_at_application, sector_at_application, status);

-- The last plan computed for a founder (slug -> status), for "Newly unlocked" and the digest.
create table public.plan_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  statuses jsonb not null default '{}' check (jsonb_typeof(statuses) = 'object'),
  computed_at timestamptz not null default now()
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  mode public.share_mode not null,
  password_hash text,
  label text,
  expires_at timestamptz,
  revoked_at timestamptz,
  open_count integer not null default 0,
  created_at timestamptz not null default now(),
  check ((mode = 'password') = (password_hash is not null))
);

create table public.share_invites (
  share_id uuid not null references public.share_links (id) on delete cascade,
  email extensions.citext not null,
  primary key (share_id, email)
);

-- Single-use check-in links. The link carries an HMAC signature; this row makes it single use.
create table public.checkin_tokens (
  jti uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.email_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.email_kind not null,
  ref text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);

create table public.rate_limits (
  bucket text not null,
  key_hash text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket, key_hash, window_start)
);

-- Internal analytics only. No free text, no founder groups.
create table public.events (
  id bigint generated always as identity primary key,
  name public.event_name not null,
  user_id uuid references auth.users (id) on delete set null,
  anon_id text check (anon_id is null or anon_id ~ '^[a-zA-Z0-9-]{8,64}$'),
  school public.school,
  sector public.sector,
  created_at timestamptz not null default now()
);
create index events_name_created_idx on public.events (name, created_at);
