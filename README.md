# Seedline

Seedline helps early-stage founders find the non-dilutive funding and programs they should apply to, and in what order. The full specification is in `SEEDLINE_SPEC.md`. Build status is in `PROGRESS.md`.

Stack: Vite, React, TypeScript, React Router and Tailwind (static site on Cloudflare Pages), Supabase (Postgres with RLS, Auth with magic links, Storage, Edge Functions, pg_cron), Resend for email, and Cloudflare Turnstile on the public form. No AI, no paid APIs, no analytics beyond the internal `events` table.

## Layout

| Path | What lives there |
|---|---|
| `shared/vocab.ts` | Every field name and allowed value. Everything else imports from here. |
| `shared/matching/` | The matching engine: rules, statuses, grouping, ranking, totals, next-unlock advisor. Pure TypeScript. |
| `shared/` (other) | Dates, money, `ramp()`, CSV parsing, `.ics`, signed tokens, draft fitting, map filters. Used by the app and the Edge Functions. |
| `src/` | The React app. |
| `supabase/migrations/` | Schema, enums (generated from `vocab.ts`), RLS, storage, cron. |
| `supabase/functions/` | Edge Functions: CSV import, emails, check-ins, unsubscribe, calendar feed, share links, submissions, claims. |
| `supabase/seed.sql`, `data/examples.csv` | The 5 EXAMPLE listings, generated from `scripts/examples.ts`. |
| `tests/` | RLS, database and Edge Function tests (`tests/rls`, `tests/db`, `tests/functions`) and browser tests (`tests/e2e`). |
| `scripts/` | Header and CSP builder, contrast measurement, copy checks, enum SQL generator. |

## Local setup

You need Node.js (current LTS), Git and Docker Desktop (running).

```bash
npm install
```

```bash
npx supabase start
```

The first start downloads several GB of images. When it finishes it prints the local URLs and keys. Then:

1. Copy `.env.example` to `.env`. Set `VITE_SUPABASE_URL=http://127.0.0.1:54321` and `VITE_SUPABASE_ANON_KEY` to the `ANON_KEY` from `npx supabase status`.
2. Create `supabase/functions/.env` (gitignored) for local function secrets. See "Environment variables" below. Locally, leave `RESEND_API_KEY` empty and set `LOCAL_MAIL_API=http://supabase_inbucket_seedline:8025/api/v1/send`, so emails land in the local inbox.
3. Apply migrations and the seed:

```bash
npx supabase db reset
```

4. Serve the Edge Functions (keep this running):

```bash
npx supabase functions serve --env-file supabase/functions/.env
```

5. Start the app:

```bash
npm run dev
```

Open http://localhost:5173. Sign-in emails and every other email arrive in the local inbox at http://127.0.0.1:54324. Supabase Studio is at http://127.0.0.1:54323.

To make yourself an admin locally:

```bash
docker exec supabase_db_seedline psql -U postgres -c "insert into public.admins (email) values ('you@example.com')"
```

The 5 EXAMPLE listings import as unverified, so founders see nothing until you mark them verified at `/admin/verification`.

Notes:
- After changing `supabase/config.toml`, run `npx supabase stop` then `npx supabase start`. A `db reset` does not reload auth settings.
- `db reset` restarts containers and stops `functions serve`. Start it again afterwards.

## Tests

| Command | What it runs |
|---|---|
| `npm test` | Unit tests for `shared/` (vocabulary, matching, ramp, CSV, drafts, `.ics`, tokens, map filters). |
| `npm run test:db` | RLS, storage, database and Edge Function tests against the local stack. Needs Supabase and `functions serve` running. |
| `npm run test:e2e` | Browser tests: the full founder flow, plus every route measured at 375px and 1280px for overflow, tap targets, focus, color contrast (axe) and copy rules. Needs everything running. Run `npx playwright install chromium` once first. |
| `npm run contrast` | Measures every text and color pair from the CSS tokens against 4.5:1 (3:1 for control borders). |
| `npm run check:copy` | Scans source, email templates and data for em dashes, UNC branding and bare percentages. |
| `npm run build` | Typecheck, production build, then writes `dist/_headers` with a CSP built from the built files. |
| `npm run qa` | All of the above in order. |

The database and browser tests write test rows into your local database. Run `npx supabase db reset` for a clean slate.

## Environment variables

Frontend (safe to expose, built into the site):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` in production |
| `VITE_SUPABASE_ANON_KEY` | The project's public (anon or publishable) key |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile site key. Locally: `1x00000000000000000000AA` (Cloudflare's always-pass test key) |
| `VITE_SITE_URL` | `http://localhost:5173` locally, your domain in production |

Server only (Supabase Edge Function secrets, never in frontend code):

| Name | Value |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Provided to functions automatically by Supabase. Do not set it yourself. |
| `RESEND_API_KEY` | From Resend. Empty locally. |
| `EMAIL_FROM` | For example `Seedline <hello@yourdomain.com>`. The domain must be verified in Resend. |
| `TURNSTILE_SECRET_KEY` | Turnstile secret. Locally: `1x0000000000000000000000000000000AA` |
| `CHECKIN_SIGNING_SECRET` | A long random string: `openssl rand -hex 32` |
| `SITE_URL` | Your production URL, for links in emails |
| `CRON_SECRET` | A long random string. Scheduled jobs must send it. |
| `LOCAL_MAIL_API` | Local only, see above. Do not set in production. |

## Supabase setup (production)

1. Create the project. In Authentication, enable email sign-in. Under URL configuration, set the site URL to your domain and add `https://yourdomain.com/**` and `http://localhost:5173/**` as redirect URLs.
2. Set custom SMTP to Resend (Authentication, then SMTP settings), so sign-in emails are not limited by Supabase's built-in sender.
3. Link and push the schema (you will be asked for the database password):

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <project-ref>
```

```bash
npx supabase db push
```

Do not push `supabase/seed.sql` unless you want the 5 EXAMPLE listings in production.

4. Set function secrets, then deploy the functions:

```bash
npx supabase secrets set RESEND_API_KEY=... EMAIL_FROM="Seedline <hello@yourdomain.com>" TURNSTILE_SECRET_KEY=... CHECKIN_SIGNING_SECRET=... SITE_URL=https://yourdomain.com CRON_SECRET=...
```

```bash
npx supabase functions deploy
```

5. Add your admin email:

```sql
insert into public.admins (email) values ('you@yourdomain.com');
```

### Scheduled jobs

The migrations register three `pg_cron` jobs (times in UTC): weekly digest Mondays 13:00, reminders daily 13:00, check-ins daily 13:30. They call the Edge Functions through `pg_net`, using two Vault secrets you set once in the SQL editor:

```sql
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1', 'seedline_functions_url');
select vault.create_secret('<the same value as CRON_SECRET>', 'seedline_cron_secret');
```

To check that they ran:

```sql
select jobname, status, start_time, return_message from cron.job_run_details d join cron.job j using (jobid) order by start_time desc limit 20;
select id, status_code, content from net._http_response order by created desc limit 20;
```

## CSV import format

Upload at `/admin/import`. Every row is checked against `shared/vocab.ts`; a row with any problem is rejected whole, with the reasons listed. Every imported row is set to unverified. A slug that already exists shows a field-by-field diff and is only overwritten if you tick it.

The header must be exactly these 29 columns, in any order:

`slug, name, organizer, type, geography_level, regions, description, amount_min, amount_max, amount_notes, equity_required, equity_notes, deadline_type, opens_at, deadline_at, decision_at, cycle_notes, application_url, source_url, eligibility_rules, target_groups, materials_required, application_questions, past_results_text, past_results_count, past_results_year, past_results_source_url, past_winners, research_notes`

- Required: `slug` (lowercase, hyphens), `name`, `organizer`, `type`, `geography_level`, `deadline_type`, `source_url`. A `fixed` deadline needs `deadline_at`.
- `type`: university_grant, pitch_competition, state_grant, federal_grant, fellowship, accelerator, showcase_conference.
- `geography_level`: campus, triangle, north_carolina, southeast, national. `deadline_type`: fixed, rolling, recurring.
- Lists (`regions`, `target_groups`, `materials_required`) are separated by semicolons. Values for the last two come from `vocab.ts`.
- Amounts and counts are whole numbers with digits only (no `$` or commas). Leave them empty if not disclosed. `equity_required` is `true` or `false`.
- Dates are `YYYY-MM-DD`.
- `eligibility_rules`: JSON list of `{"field", "op", "value", "kind"}`, with an optional `"note"` for custom gap text. `field` is a profile field or milestone from `vocab.ts`. `op` is one of eq, in, not_in, gte, lte, exists, is_true, is_false. `kind` is eligibility or readiness. Example: `[{"field":"stage","op":"gte","value":"prototype","kind":"readiness"}]`.
- `application_questions`: JSON list of `{"text", "word_limit", "maps_to"}`, where `maps_to` is an answer bank key or null.
- `past_winners`: JSON list of `{"name", "sector", "stage", "award", "year", "source_url"}`.
- `research_notes` is admin-only and never shown to anyone else.

`data/examples.csv` holds 5 complete example rows.

## Deploying to Cloudflare Pages

1. Build with production values: set the `VITE_*` variables to production values (in `.env.production`, or as environment variables), then:

```bash
npm run build
```

The build writes `dist/_headers` (security headers and the CSP, which includes your Supabase origin) and copies `public/_redirects` (single-page app routing) and `public/robots.txt`.

2. Deploy the `dist` folder:

```bash
npx wrangler login
```

```bash
npx wrangler pages deploy dist --project-name seedline
```

Alternatively, connect the GitHub repo in the Cloudflare dashboard with build command `npm run build`, output directory `dist`, and the `VITE_*` variables set in the project's environment variables.

3. Point your domain at the Pages project, and add it to the Supabase redirect URLs and to `SITE_URL`.

To preview the production build locally with the same headers and routing:

```bash
npm run preview
```

## Free-tier pause

Supabase pauses free projects after roughly a week of inactivity. Whether the `pg_cron` jobs count as activity has **not been verified**. Check it rather than assume:

- Watch for Supabase's warning email, and the project status banner in the dashboard.
- Run the `cron.job_run_details` query above after a quiet week. If jobs stopped, the project was paused.

To restore a paused project, open it in the Supabase dashboard and choose Restore. Data is kept, but a paused project serves no requests, so sign-in, plans and scheduled emails all stop until it is restored. If pausing becomes a problem, upgrading to a paid plan removes it.

## Honesty rules (spec section 8)

Numbers on screen come only from data: totals are always "up to", rates always show their counts, "Founders like you" appears only at 10 or more reports (enforced in SQL and in the UI), empty values read "Not disclosed" or "Not enough data yet", and unverified listings never reach founders or the public map.
