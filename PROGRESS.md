# Progress

Plan approved 2026-10-15 with every suggested default in PLAN.md section 5. Admin email: arjnaidu@unc.edu (Q18).

## Done and verified
- **Step 1: vocabulary and scaffold.** `shared/vocab.ts` with every enum, profile field (label, question, layer, why we ask), CSV columns and `assertKnownKeys`. `npm test`: 13 of 13 passing. `npm run build` passes. Dev server renders the landing page; Bricolage Grotesque and Figtree load, and Figtree tabular figures measured equal width in the browser.

- **Step 2: database.** Migrations in `supabase/migrations/`: enums generated from vocab (`scripts/gen-enum-sql.ts`), 18 tables all with RLS, private `materials` bucket with owner-folder policies, guard trigger for organizer edits, outcome snapshot trigger, `founders_like_you` with the 10-report threshold enforced in SQL, `rotate_calendar_token`. `npx supabase db reset` applies cleanly. `npm run test:db`: 47 of 47 passing (enum match, columns match vocab, founder A vs B on 8 tables plus storage, anonymous access, non-admin access, admin cannot read profiles or founder groups, organizer scope, threshold at 9 and 10). Found and fixed during testing: Supabase grants `anon` execute on new functions by default; revoked.
- **Risk R1 (Edge Functions importing `shared/`):** works under `npx supabase functions serve` (the `health` function returns values read from `shared/vocab.ts`). Deploy bundling can only be confirmed at the deploy step.

- **Step 3: matching engine** (`shared/matching/`). Three-valued rule evaluation, statuses, targeted-program section, date windows with recurring projection, grouping, deterministic ranking (tie-breaks in `compareMatches` comments), "up to" totals, next-unlock advisor, newly unlocked, founders-like-you line, past winners summary, materials readiness, rule/question/winner validation. 58 matching tests, including every boundary in spec section 14 (today, 30 and 31 days, exactly 9 months and 9 months plus a day).
- **Step 4: `ramp()`** with the three spec values tested, plus `urgencyT` and `readinessT` mappings. `npm run contrast` measures 19 token pairs read from the CSS: all pass.
- Unit tests: 75 of 75. DB tests: 47 of 47. Build passes.

- **Step 5: admin.** `/admin` (opportunity list, full create and edit form for every field with JSON validation, Mark verified), `/admin/import` (check, per-row reasons, diff and overwrite prompt, report), `/admin/verification`. `csv-import` Edge Function plus `admin_import_opportunity` (one transaction per row, always unverified). Seed: 5 EXAMPLE rows generated with `data/examples.csv` from `scripts/examples.ts`, tested to match. Magic-link sign-in and callback built here because admin needs them. Verified in the browser: magic link from the local inbox signs in, admin list loads, CSV preview shows 1 diff and 1 rejected row with 3 reasons, import reports "Imported 0. Updated 1. Skipped 4. Rejected 1.", Mark verified wrote status, date and email, an invalid rule is refused before saving, no console errors. Unit 88 of 88, DB and function 52 of 52.
- Local dev note: after changing `supabase/config.toml`, run `npx supabase stop` then `npx supabase start` (a db reset does not reload auth settings).

- **Step 6: Layer 0 intake and preview** (`/start`, `/preview`). Verified in the browser as an anonymous visitor: 7 questions with why-we-ask notes, preview shows "You match 2 programs", up to $15,000, top matches with fit reasons, projected recurring cycle marked "(expected)", 1 targeted program counted, email form. Events `intake_started` and `layer0_finished` recorded with an anonymous ID.
- **Step 7: magic link and plan page** (`/plan`). Verified: magic link from the local inbox lands on `/plan`; Layer 0 answers moved into the new profile; total band ($15,000, $5,000 open now, $10,000 opening later), Apply now card with fit reasons, materials count, source and last verified, Coming up, targeted section, "2 programs don't fit your profile"; Save to my applications works. Found and fixed: `plan_generated` could be recorded twice when two loads race; the first snapshot is now an insert only one load can win.
- **Step 8: profile layers, milestones, Newly unlocked** (`/profile`). Verified: unfilled layers listed with what each unlocks (no percentages); marking "Ran a first pilot" and "Incorporated" changed nothing eligible and showed no Newly unlocked; answering incorporation state NC then showed "Newly unlocked: EXAMPLE: State matching grant"; database shows stage raised to pilot_users and incorporated true. Founder groups with "prefer not to say" and "remove my answer", email preference toggles.

- **Step 9: opportunity detail** (`/opportunity/:slug`). Verified: fit reasons, materials count, dates, money, "Past results, from the organizer" and "Founders like you, from Seedline" as two separate lines ("Not enough data yet."), past winners summary "Last 2 years: 3 winners, 2 in health or biotech.", calendar buttons, claim link, works signed out. Unverified listings return the 404 page (RLS returns nothing).
- **Step 10: materials and answers.** Verified: file upload ("1 of 10 materials added."), link save ("2 of 10"), "Needed by N programs on your plan"; answer bank saves three lengths with live word counts. `tests/rls/storage.test.ts`: bucket not public, owner signed URL works, another founder cannot sign, a 1-second signed URL fails after expiry (3 of 3).
- Found and fixed during step 10: Supabase fires an auth event when the tab regains focus; the answer bank reloaded on it and overwrote what the founder had typed (so a save did nothing). The auth provider now keeps the same session object when nothing changed, and pages key their loads on the user ID.
- **Step 11: draft view** (`/draft/:slug`). Verified: problem filled from the medium version (long is over 150 words), solution from the short version, missing answer flagged, unmapped question flagged, live count "34 of 30 words, 4 over the limit", draft persists after reload. 7 unit tests in `shared/drafts/fitAnswer.test.ts`.
- **Step 12: applications tracker** (`/applications`). Verified: status change to Won, amount "$2,500" saved, database snapshot stage pilot_users and sector health_biotech at application, `reported_at` set, events written.

- **Step 13: calendar** (`/calendar`). Month grid plus deadline list, urgency dots from `ramp()`, per-opportunity Google Calendar link and `.ics` (step 9), "Download all deadlines", private feed via `rotate_calendar_token` (raw token shown once, SHA-256 stored) served by `calendar-feed`. Verified in the browser: feed link returns 200 `text/calendar` with 6 events. Tests: right token works, wrong token 404, rotating the token turns the old link off; `shared/ics.test.ts` (4).
- **Step 14: emails.** `send-digest` (weekly, only when something changed), `send-reminders` (14 and 3 days before saved deadlines, once each), `send-checkins` (signed single-use links, all buttons in one email share one token row), `checkin`, `unsubscribe` (app page and RFC 8058 one-click), Resend in production, local Mailpit when no key. `pg_cron` jobs registered (URL and secret from Vault). `tests/functions/emails.test.ts` 14 of 14: cron secret required; check-in updates once, reuse rejected (409), the other button rejected, expired rejected, expired database row rejected, forged rejected; outcome check-in with optional amount; reminders once per window; digest sends, then nothing when unchanged, then again on a new match; one-click unsubscribe; forged unsubscribe rejected. `shared/signedToken.test.ts` (7). Browser: check-in page shows "This link is not valid." for a bad link.
- Also fixed: a stored session for a deleted account now signs out cleanly instead of failing; unexpected page errors show a friendly error page.

- **Step 15: share links.** `share-create` (PBKDF2 password hash, invited emails, expiry, token shown once, SHA-256 stored) and `share-open` (5 password attempts per 15 minutes per link, invite requires a signed-in invited email). Shared views compute the plan without founder groups and drop every program with target groups (PLAN Q15). Share panel on `/plan`, viewer at `/share/:token`. `tests/functions/share.test.ts` 11 of 11: password prompt, wrong password, right password, no group or materials data in the response, 6th attempt blocked (429), turned off (404), expired (410), anonymous invite viewer asked to sign in, stranger refused (403), invited viewer allowed, founders cannot write the password hash. Browser: created a password link on `/plan` and opened it.
- **Step 16: public map** (`/map`). Filters for type, geography, sector, stage and deadline, kept in the URL. Sector and stage filter through each listing's own rules (no rule means open to all). Source and last-verified shown on each entry. Browser: only `opportunities` is requested; no requests while idle. `shared/mapFilter.test.ts` (4).
- **Step 17: submissions, claims, staleness.** `/submit` with Turnstile (loaded only on that page) and `submit-opportunity` (Turnstile verified server side, 5 per hour per address); `/claim/:slug` with `claim-listing` (signed in, 5 per day), organizer editor once approved; admin submissions queue (prefill a new unverified listing), claims queue, staleness queue (over 90 days). `tests/functions/submissions.test.ts` 7 of 7. Browser: Turnstile issued its test token, submission accepted, rate limit message shown when over the limit, admin prefill and claims queue work.

- **Step 18: metrics** (`/admin/metrics`). `admin_metrics(from, to)` (admin only, aggregates only): funnel from events with a definition next to each number, applications by status, founder-reported dollars won with "N of M wins included an amount", outcome report rate as "X of Y", share links created and opened, accounts by school and sector, events by month, CSV export. `tests/db/metrics.test.ts` 3 of 3: non-admin and anonymous refused, every number equals a direct SQL count, no founder groups or row data in the output. Browser: page renders with labels and definitions.

- **Step 19: privacy, terms, 404, robots, headers, CSP.** `/privacy` and `/terms` marked "Draft, not binding.", describing only what the system does and naming Supabase, Resend, Cloudflare and Google Fonts. `public/robots.txt` allows `/` and `/map` only. `scripts/build-headers.ts` writes `dist/_headers` with a CSP built from the origins found in the built files and fails the build on any unreviewed origin. **No `unsafe-` directive is needed.** Verified with `wrangler pages dev dist` (the Cloudflare Pages runtime): all five headers present, SPA routes return the app, fonts and Turnstile work under the CSP, ramp colors render, no console errors. Also split rarely used pages into lazy chunks: main bundle 704 KB to 273 KB (83 KB gzipped).
- Note: unknown URLs return HTTP 200 with the app's 404 page (normal for a single-page app on Pages).

- **Step 20: accessibility and mobile pass, measured.** `tests/e2e/a11y.spec.ts` visits 29 routes (public, founder, admin) at 375x812 and 1280x800 and fails on: any horizontal overflow, any tap target under 44px (links inside a sentence are exempt, per WCAG 2.5.8), any element reached by Tab without a visible focus ring, any axe color-contrast violation, and rendered copy with em dashes, percentages, all-caps words (acronyms allowed) or uppercase styling. Found and fixed: card, map, list and back links under 44px; date inputs with no focus ring; amber used outside deadlines (now only through `ramp()`); the deadline chip tint was hand-picked (now `ramp()`). Final: 6 of 6 sweep runs pass. `tests/e2e/founder-flow.spec.ts` runs the whole founder flow in a browser, including a founder being refused at `/admin`: passes. `npm run contrast` 20 of 20 pairs. `npm run check:copy` 91 files clean.

- **QA fix after step 20:** "Past results and founders-like-you are separate lines on every card" was only true on the detail page. Apply now cards now show both lines, with founders-like-you fetched for all cards at once by `founders_like_you_many` (same 10-report threshold in SQL, tested at 9 and 10). Preview cards say to sign in for founders-like-you, since anonymous visitors cannot query it. The browser flow asserts both lines on every plan card.

## Audit fixes (prompt 5), in order of severity, each with its own commit
1. **Password sign-up was possible through the Auth API** (and with email confirmation off locally, an instant password account on an admin email would have been an admin). Fixed: custom access token hook refuses password tokens; `is_admin()` and Edge Function identity require a confirmed email; local email confirmation on, as in production. `tests/rls/auth.test.ts` 4 of 4 (password sign-in refused with the hook's message, magic link still works, unconfirmed admin email is not admin).
2. **Check-in emails could name a listing that is unverified or archived.** Fixed in `send-checkins`. New test fails without the fix and passes with it.
3. **Source, last verified and the two results lines were missing on plan rows (Coming up, Not ready yet, Needs info, equity, targeted), map entries and shared plans.** Fixed, with founders-like-you fetched once per page (`founders_like_you_many`, 10-report threshold in SQL). Browser test checks every listing on the plan, map and shared plan; it fails against the old map code.
4. **Edge Functions were never type-checked.** Added `npm run check:functions` (Deno). It found and I fixed a loose `Uint8Array` type in password hashing.
5. **Sign-in emails used Supabase's generic template.** Seedline templates for "magic link" and "confirm signup"; test checks both subjects and bodies.
6. **Unknown URLs returned 200.** `_redirects` now lists each route, `404.html` is generated, so unknown paths get a real 404 on Pages (verified with `wrangler pages dev`: routes 200, unknown 404). Unit test keeps `_redirects` in sync with the router.
7. **Smaller fixes:** nav shows founder pages only when signed in, with an Admin link for admins; Escape closes the mobile menu and returns focus; map filters fold away on phones; landing copy no longer says the ambiguous "No equity, no fees"; fit reasons use the founder's own answer; Not ready yet rows with unanswered questions get "Answer in profile". `tests/e2e/navigation.spec.ts` covers the first three.

## Design refresh (in progress, mockup awaiting approval)
Mockup: `design/mockups/b-plus-c.html` (open at http://localhost:5173/design/mockups/b-plus-c.html with `npm run dev`). Nothing in `src/` has changed for the design yet.
Decisions so far (answered by you):
- Direction: B (bold Carolina blue blocks) plus C (9-month deadline timeline on the plan, colored by `ramp()`).
- Hero shapes: allowed as brand texture, navy, Carolina blue and light blue only. Amber stays reserved for deadlines and wins.
- How it works: a numbered path in the timeline's style, not a three-card grid.
- Plan motion: stays bright; the total counts up and the rail grows (0.6s, off with reduced motion). No dark panel.
- Analytics: internal events only, as the spec says. No third-party analytics.
- Type chips: two groups. Money awards (university, state and federal grants, pitch competitions) solid navy; programs (fellowships, accelerators, showcases) light blue.
- Rollout after approval: all founder and public pages. Admin keeps its plain layout.
- Link preview image: 1200 by 630, built from the hero, no numbers.
- Fonts: keep Bricolage Grotesque and Figtree.
Handbook items applied for real (no visual change): HSTS header and `sitemap.xml` (verified on `wrangler pages dev`: both present, routes 200, unknown 404).

## Final numbers (from the last full run, `npm run qa`)
- `npm test`: 115 of 115 (9 files)
- `npm run check:functions`: all 12 Edge Functions type-check
- `npm run test:db`: 98 of 98 (10 files)
- `npm run test:e2e`: 12 passed, 2 skipped by design (founder flow runs at laptop width only; the menu test runs on mobile only)
- `npm run build`: passes; CSP has no `unsafe-` directive
- Local database reset to the clean seed afterwards: 5 EXAMPLE rows, all unverified, no users.

## Next
- Prompt 4 (audit), then prompt 6 (deploy). Nothing is deployed. The hosted Supabase project has not been touched.

## Needs your decision
1. **Contact email** for the privacy and terms drafts, and for account deletion requests (PLAN Q14). They currently say the address will be listed at launch.
2. **Rate limiting by IP** (submissions, check-ins, calendar feed) reads `cf-connecting-ip`, then the first `x-forwarded-for` entry. Whether Supabase's hosted proxy lets a client spoof that header must be checked at deploy. Share-password limits are per link and claims are per user, so those don't depend on it.
3. **Tap targets:** links inside running sentences are treated as exempt (WCAG 2.5.8). Every standalone link, button and field is at least 44px. Say if you want sentence links enlarged too.
4. **robots.txt** disallows `/opportunity/...` pages, as the spec says, so individual listings won't be indexed by search engines even though they're public. Confirm.
5. **Seed in production:** `supabase db push` does not load `seed.sql`. Do you want the 5 EXAMPLE rows in production at all?
6. **First weekly digest** only records a baseline of matches. It sends only if a deadline is within 14 days, and calls nothing "new" until the second week.

## Genuinely blocked
- Nothing blocks the local build. Deployment (prompt 6) needs your accounts: the hosted Supabase project and its database password, a Resend API key with a verified domain, Cloudflare Pages and Turnstile keys, and the domain.

## Stubbed, partial or unverified
- **Not deployed.** Headers were verified with `wrangler pages dev` locally, not on a live site.
- **Edge Functions importing `shared/`** works under `supabase functions serve`. The deploy bundler has not been tried (risk R1).
- **Emails** were verified through the local Mailpit inbox, not through Resend.
- **Turnstile** was verified with Cloudflare's always-pass test keys only.
- **Free-tier pause:** whether pg_cron activity keeps the project awake is unverified (README explains how to check).
- **The organizer editor** covers content fields. Target groups and past winners stay admin-only.
