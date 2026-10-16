# Seedline: build spec for Claude Code

Read this whole file before doing anything. Then enter plan mode and show me the plan, file structure, database schema and build order. Wait for my approval before writing code.

---

## 0. Working agreement

These are standing rules for how the work gets done.

- **Plan first.** Show the plan and schema before code. Wait for my OK.
- **Audit before you assert.** Never tell me a feature works unless you ran it. Every number you report must come from a command you ran.
- **Separate status clearly.** When reporting, use three lists: "Done and verified", "Needs your decision", "Genuinely blocked". Never blur them.
- **Comprehensive over terse.** If you skipped something, say what and why.
- **Raise design changes, don't make them.** If something in this spec seems wrong or unbuildable, stop and ask.
- **No em dashes** in any user-facing copy. Use commas, colons or periods.
- **Do not invent data.** No real-looking opportunities, amounts, deadlines, winners or statistics anywhere. Real data arrives later as a CSV from me.
- **Tests passing is not the same as working.** For each feature, also confirm it is reachable and works in the running UI.

---

## 1. What Seedline is

Seedline helps early-stage founders find the non-dilutive funding and programs they should apply to, and in what order.

A founder builds a profile in layers. Seedline matches them to university grants, pitch competitions, state and federal grants (including SBIR and STTR), fellowships, accelerators, and showcases or conferences. It explains why each one fits, what is missing, and turns the matches into a sequenced plan: **Apply now**, **Coming up**, and **Not ready yet**.

- Anyone can sign up. Data covers UNC Chapel Hill, the Research Triangle, North Carolina, the Southeast and national programs.
- Angel groups are **out of scope** for version one.
- There is **no AI** in version one. Everything is deterministic and works with no API keys.
- The goal of version one is a real tool used by real founders, with honest, trackable outcome numbers.

---

## 2. Stack (total cost: $0, plus an optional domain)

- **Frontend:** Vite + React + TypeScript + React Router + Tailwind. Static build.
- **Hosting:** Cloudflare Pages free tier (use a `_headers` file for security headers).
- **Backend:** Supabase free tier only.
  - Postgres with row-level security (RLS) on every table.
  - Supabase Auth, email magic links only. No other auth provider.
  - Supabase Storage, private bucket for founder materials, signed URLs only.
  - Supabase Edge Functions for anything needing secrets or server logic (emails, share-link passwords, CSV import, signed check-in links).
  - `pg_cron` for scheduled jobs (weekly digest, reminders, check-ins).
- **Email:** Resend free tier, called only from Edge Functions.
- **Bot protection** on public forms: Cloudflare Turnstile (free).
- **No custom server.** No paid APIs. No third-party scripts besides Turnstile.
- Shared TypeScript code (vocabulary, matching engine) lives in one `shared/` folder used by both the frontend and Edge Functions.

Note for the README: Supabase pauses free projects after roughly a week of inactivity. Document how to check whether scheduled jobs prevent pausing, and how to restore a paused project.

---

## 3. The canonical vocabulary (build this first)

Silent string mismatches between modules are the most dangerous bug in this kind of app. **One file owns every field name and allowed value:** `shared/vocab.ts`.

It defines, for each field: a stable machine key, a display label, its type, allowed values (for enums), which profile layer it belongs to, and a one-line "why we ask" note.

Rules:
- Every other module (intake form, matching engine, eligibility rules, CSV import, database enums, email templates) imports keys from `vocab.ts`. No hardcoded field strings anywhere else.
- Provide `assertKnownKeys(keys, who)` that throws on any unknown key. Call it at module load wherever a table or rule set is keyed by vocabulary.
- Database enum or check constraints must match `vocab.ts` exactly. Add a test that compares them.
- The CSV importer rejects any column or rule key not in `vocab.ts`.

### Enumerations

- **stage** (ordered): `idea` < `prototype` < `pilot_users` < `revenue`
- **sector:** `software`, `fintech`, `health_biotech`, `medtech`, `deep_tech_hardware`, `energy_climate`, `consumer`, `education`, `social_impact`, `food_ag`, `other`
- **school:** `unc`, `duke`, `nc_state`, `nccu`, `other`, `none`
- **student_status:** `undergrad`, `grad`, `recent_alum`, `faculty_staff`, `not_affiliated`
- **opportunity_type:** `university_grant`, `pitch_competition`, `state_grant`, `federal_grant`, `fellowship`, `accelerator`, `showcase_conference`
- **geography_level:** `campus`, `triangle`, `north_carolina`, `southeast`, `national`
- **materials:** `pitch_deck`, `pitch_video`, `one_pager`, `executive_summary`, `budget`, `faculty_sponsor_letter`, `financials`, `demo`, `team_bios`, `business_plan`
- **answer_bank keys:** `problem`, `solution`, `customer`, `market`, `competition`, `team`, `traction`, `business_model`, `use_of_funds`, `impact`
- **milestones:** `incorporated`, `prototype_built`, `first_pilot`, `first_paying_customer`, `first_revenue`, `won_award`, `graduated`
- **founder_groups** (optional, multi-select): `woman_founder`, `veteran`, `black_founder`, `hispanic_latino_founder`, `native_american_founder`, `first_generation_college`, `lgbtq_founder`, `founder_with_disability`
- **verification_status:** `unverified`, `verified`, `organizer_verified`
- **application_status:** `planning`, `applied`, `won`, `not_selected`, `waiting`, `skipped`

---

## 4. Progressive profile

The profile is built in layers. Each layer unlocks something specific. There is **no "profile X% complete" score**. Instead the profile page lists each unfilled layer and exactly what it would unlock, in plain words.

| Layer | When | Fields | Unlocks |
|---|---|---|---|
| 0 | No account, about 2 minutes | school, student_status, state, city, stage, sector, incorporated | Preview: match count, "up to" total, top 3 matches |
| 1 | Email (magic link) | email | Full plan, calendar, digest, saving |
| 2 | After account | incorporation_state, founded_on, university_ip, team_size, paying_customers, monthly_revenue_range, funding_needed, funding_deadline, equity_ok, us_citizen_or_pr | State and federal matches (including SBIR), next-unlock advisor |
| 3 | After account | materials locker, answer bank | Readiness checks, application drafts |
| 4 | Over time | outcome reports | "Founders like you" data, once enough exists |
| Optional | Any time | founder_groups | Programs targeted to specific founder groups |

Rules:
- **A missing answer is "not answered", never a failed rule or weaker match.**
- `us_citizen_or_pr` and `founder_groups` are optional and each shows a short note explaining exactly why we ask (for example: "SBIR requires majority US ownership. We use this only to check eligibility.").
- Founder-group fields are never shown publicly or to admins in identifiable form.

---

## 5. Opportunity data model

Each opportunity has:

- `slug`, `name`, `organizer`, `type`, `geography_level`, `regions` (list), `description`
- `amount_min`, `amount_max`, `amount_notes` (amounts may be null if undisclosed)
- `equity_required` (bool), `equity_notes`
- `deadline_type` (`fixed`, `rolling`, `recurring`), `opens_at`, `deadline_at`, `decision_at`, `cycle_notes`
- `application_url`, `source_url`
- `eligibility_rules` (structured, see section 6)
- `target_groups` (list of founder_groups, empty if open to all)
- `materials_required` (list of materials keys)
- `application_questions` (list of `{ text, word_limit, maps_to }` where `maps_to` is an answer_bank key or null)
- `past_results_text`, `past_results_count`, `past_results_year`, `past_results_source_url`
- `past_winners` (list of `{ name, sector, stage, award, year, source_url }`)
- `verification_status`, `last_verified_at`, `verified_by`, `research_notes` (admin only)
- `archived` (bool)

Federal programs are listed at the **program level** (for example "NSF SBIR Phase I"), linking to current topics, not one entry per topic.

---

## 6. Eligibility rules and the matching engine

### Rule format

Each rule: `{ field, op, value, kind }`

- `field`: a vocab key
- `op`: `eq`, `in`, `not_in`, `gte`, `lte`, `exists`, `is_true`, `is_false` (`gte`/`lte` on stage use the stage order)
- `kind`: `eligibility` (hard requirement, like school or state) or `readiness` (something the founder can change, like stage or having a prototype)

### Each rule evaluates to one of three results

- `pass`
- `fail`
- `unknown` (the founder hasn't answered that field yet)

### Each opportunity gets one status per founder

- **Eligible:** all rules pass.
- **Not ready yet:** all eligibility rules pass, at least one readiness rule fails. Show the gap.
- **Needs info:** no rule fails, at least one is unknown. Show which layer to fill in.
- **Not eligible:** any eligibility rule fails. Hidden from the plan, counted in a quiet line ("12 programs don't fit your profile").

**Targeted programs:** if `target_groups` is not empty and the founder hasn't answered founder_groups, show it in a separate section, "Programs for specific founder groups", with eligibility stated plainly. Never silently include or exclude.

### Grouping into the plan (planning horizon: 9 months)

- **Apply now:** Eligible, and the application window is open now or opens within 30 days, and the deadline hasn't passed.
- **Coming up:** Eligible, and the window opens 30 days to 9 months from now (including the next cycle of recurring programs).
- **Not ready yet:** as defined above, with the specific gaps.
- **Needs info:** as defined above.

Ranking within each group is deterministic: nearest deadline first, then larger `amount_max`, then name. Document tie-breaks in code comments.

### Hard rules

- The engine is pure TypeScript in `shared/matching/`, with no network calls.
- Every result includes the list of rules passed, rules failed (with plain-language gap text), and rules unknown, so the UI can explain itself.
- **No match percentage or composite score, anywhere, ever.** Fit is shown as reasons.

---

## 7. Features (all in version one)

### 7.1 Total available to you
Top of the plan page: "You're eligible for up to $X across N opportunities." Sums `amount_max` for Eligible opportunities in Apply now and Coming up where `equity_required` is false, split into "open now" and "opening later". Equity programs are listed separately and never added in. Opportunities with no disclosed amount are counted in a note ("3 more with undisclosed amounts"). Always "up to", with a one-line note that founders rarely win everything. Unverified opportunities never count toward the total.

### 7.2 Deadline calendar and weekly digest
- Calendar view of all matched deadlines.
- Per-opportunity "Add to Google Calendar" link and `.ics` download.
- A private calendar feed URL with a secret token the founder can subscribe to.
- Weekly digest email, sent only if something changed: new matches, a deadline within 14 days, or a deadline within 3 days. No email if nothing changed.
- Reminder emails at 14 and 3 days before a saved deadline.
- One-click unsubscribe in every email.

### 7.3 Milestone plan updates
Profile has milestone buttons (from vocab). Marking one re-runs matching and shows a "Newly unlocked" section listing what just became Eligible or moved out of Not ready yet.

### 7.4 Next-unlock advisor
For each milestone or Layer 2 answer the founder doesn't have yet, simulate it and count what it would unlock. Show the single best one: "Incorporating in North Carolina would make you eligible for 4 more programs worth up to $65,000." Uses only verified, non-equity amounts. Ties broken by count, then name. Pure function, tested.

### 7.5 Private metrics dashboard (admin only)
Tracks, with clear definitions shown on the page:
- Visitors who started intake, finished Layer 0, created accounts, finished Layer 2
- Plans generated
- Applications by status (planning, applied, won, not selected)
- Total dollars won (founder-reported)
- Outcome report rate
- Share links created and opened
- Breakdowns by school, sector and month
- CSV export

Backed by an `events` table written at each step. Never infer a metric; if it isn't recorded, it isn't shown.

### 7.6 Materials locker and readiness check
Founders upload or link each material once. Each opportunity card shows "3 of 4 materials ready" and names what's missing. Counts only, no percentage.

### 7.7 Answer bank with fitted drafts
- Founders save short, medium and long versions of each answer_bank key.
- For an opportunity, the draft view maps each application question to its `maps_to` key, picks the longest version that fits the `word_limit`, and shows a live word count.
- Questions with no `maps_to` or no saved answer are flagged, not filled.
- Founder can edit and copy. Templates only, no AI.

### 7.8 Past winners
Each card can show past winners from `past_winners`, plus a short summary computed from that list ("Last 2 years: 11 winners, 7 in health or biotech"). If the list is empty, show nothing, not a guess.

### 7.9 One-click outcome check-ins
- A few days after a saved deadline: "Did you apply to X?" with Yes and No buttons.
- After `decision_at`: "How did it go?" with Won, Not selected, Still waiting, plus an optional amount.
- Each button is a signed, single-use, expiring link handled by an Edge Function. Updates the record without logging in.

### 7.10 Organizer-claimed listings and submissions
- Every listing has "Run this program? Claim it." The claim goes to my admin queue. Once approved, that organizer can edit only that listing (enforced by RLS), and it shows a "Verified by organizer" badge.
- Public "Submit an opportunity" form, Turnstile-protected and rate-limited, goes to the admin queue. Nothing publishes without my approval.
- Listings not verified in 90 days show "May be outdated" to users and appear in an admin staleness queue.

### 7.11 Shareable plan
A founder can share a read-only view of their plan with either a password (hashed in an Edge Function, rate-limited to 5 attempts per 15 minutes) or invited emails (viewer signs in with a magic link). Links can be revoked and can expire. Shared views never show founder_groups or materials files.

### 7.12 Public funding map
A public page, no login, listing every **verified** opportunity, filterable by type, geography, sector, stage and deadline. Unverified entries never appear. Each entry shows source and last-verified date. No founder data appears on this page in any form.

---

## 8. Honesty rules for every number on screen

- Every opportunity shows its `source_url` and `last_verified_at`. Unverified entries are labeled in admin views and hidden from founders and the public map.
- **Past results** (public, from organizers) and **Founders like you** (Seedline's own outcome data) are shown as two separate lines. They are never combined, averaged or merged into one figure. If they disagree, both are shown.
- Every rate shows its count: "3 of 10 won", never "30%" alone.
- "Founders like you" means the same stage and the same sector at application time. Show it only when at least **10** such founders have reported an outcome for that opportunity. Otherwise show "Not enough data yet."
- An empty value displays as "Not disclosed" or "Not enough data yet". Never generated text, never zero.
- Footer and plan page: "Information only, not legal or investment advice. Always confirm details with the organizer."
- Never use language suggesting Seedline arranges investments or takes a share of funding.

---

## 9. Pages and routes

- `/` Landing: one plain sentence on what Seedline does, a "Find my funding" button, a link to the public map.
- `/start` Layer 0 intake (no account).
- `/preview` Match count, "up to" total, top 3, and "Enter your email to see your full plan."
- `/plan` Full plan: total, next-unlock advisor, Newly unlocked, Apply now, Coming up, Not ready yet, Needs info, targeted programs, not-eligible count.
- `/opportunity/:slug` Detail: fit reasons, gaps, materials, past results, past winners, founders like you, draft button, add to calendar.
- `/profile` Layers, what each unlocks, milestones, founder_groups (optional).
- `/materials` Materials locker.
- `/answers` Answer bank.
- `/draft/:slug` Application draft.
- `/applications` Status tracker.
- `/calendar` Calendar view and feed link.
- `/share/:token` Shared plan view.
- `/map` Public funding map.
- `/submit` Submit an opportunity.
- `/claim/:slug` Claim a listing.
- `/admin` (allowlisted emails only): opportunities list and edit form, CSV import, verification queue, staleness queue, submissions queue, claims queue, metrics dashboard.
- `/privacy`, `/terms` Drafts, clearly marked "Draft, not binding."
- 404 page.

---

## 10. Admin data entry

### CSV import
- Admin uploads a CSV. An Edge Function validates every row against `vocab.ts` and the schema.
- Every imported row is set to `unverified`, regardless of what the CSV says.
- Show a report: rows imported, rows rejected with the exact reason per row. Never partially import a malformed row.
- Importing a `slug` that already exists shows a diff and asks before overwriting.

### CSV columns (exact)
`slug, name, organizer, type, geography_level, regions, description, amount_min, amount_max, amount_notes, equity_required, equity_notes, deadline_type, opens_at, deadline_at, decision_at, cycle_notes, application_url, source_url, eligibility_rules, target_groups, materials_required, application_questions, past_results_text, past_results_count, past_results_year, past_results_source_url, past_winners, research_notes`

- List fields (`regions`, `target_groups`, `materials_required`) are semicolon-separated.
- `eligibility_rules`, `application_questions` and `past_winners` are JSON strings.
- Dates are ISO `YYYY-MM-DD`.

### Admin form
Full create and edit form for every field, with a "Mark verified" action that sets `verification_status`, `last_verified_at` and `verified_by`.

### Seed data
Create exactly 5 obviously fake examples, one per major type, with names starting "EXAMPLE:" and `example.com` URLs, so I can see the format. Include a matching `examples.csv`. Nothing else.

---

## 11. Design

Direction: bright and friendly, closer to Handshake than to a finance tool, built around Carolina blue. Follow the frontend-design approach: write a short design plan (palette, type, layout, principles) and check it against this brief before coding.

- **Colors:** white and very light cool gray backgrounds; Carolina blue `#4B9CD3` as primary; deep navy `#13294B` for text; one warm accent (choose it, around a sunny amber) used only for deadlines and wins. Colors must carry meaning, not decorate.
- **Branding:** Carolina blue as a color only. **No UNC name, logo or marks** in Seedline's identity.
- **Type:** pick one distinctive, friendly display face and one readable UI sans from Google Fonts. Do not use Inter, Roboto or system-ui. Sentence case everywhere. No all-caps labels.
- **Layout:** laptop first, fully responsive down to 375px. The plan page is the hero: the total and Apply now are the most prominent things on screen.
- **Cards:** rounded cards are fine, but vary hierarchy. Not every element gets the same radius and the same soft shadow. Prefer borders and surface color over heavy shadows.
- **Ordinal colors** (deadline urgency, materials readiness) come from one ramp function, never hand-picked hues:

```ts
const RAMP_STOPS = [[19, 41, 75], [75, 156, 211], [242, 165, 65]]; // navy, Carolina blue, amber
export function ramp(t: number, alpha?: number): string {
  const x = Math.max(0, Math.min(1, t)) * (RAMP_STOPS.length - 1);
  const i = Math.min(RAMP_STOPS.length - 2, Math.floor(x));
  const fr = x - i;
  const c = RAMP_STOPS[i].map((v, k) => Math.round(v + (RAMP_STOPS[i + 1][k] - v) * fr));
  return alpha === undefined ? `rgb(${c.join(',')})` : `rgba(${c.join(',')},${alpha})`;
}
```
Unit tests: `ramp(0)` returns `rgb(19,41,75)`, `ramp(0.5)` returns `rgb(75,156,211)`, `ramp(1)` returns `rgb(242,165,65)`. If you choose a different amber, update the stop and the test together.

- **Motion:** one considered moment, when the plan is first generated. Otherwise motion only in response to user actions. Respect `prefers-reduced-motion`.
- **Copy:** plain, active, specific. Buttons say what happens ("See my plan", "Save answer"). Empty states tell the founder what to do next. Errors say what went wrong and how to fix it.
- **Accessibility:** measure contrast (4.5:1 for text) with a script, not by eye. Visible focus on every interactive element. Real buttons, keyboard reachable in visual order. 44px minimum tap targets on mobile.

---

## 12. Security and privacy

- RLS on every table. Founders can read and write only their own profile, materials, answers, applications and share links. Organizers can edit only listings they've been approved for. Admins are defined in an `admins` table, checked by RLS.
- **Write automated tests for the RLS policies**: founder A cannot read founder B's data, anonymous users cannot read profiles, organizers cannot edit other listings, non-admins cannot reach admin data.
- Materials bucket is private. Signed URLs only, short expiry.
- Outcome stats are only ever computed and shown in aggregate.
- Rate limits on Edge Functions: share-link password checks, submissions, claims, check-in links.
- `.env` is gitignored from the first commit. Commit `.env.example`.
- Security headers via `_headers`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` disabling geolocation, microphone, camera, and a Content Security Policy built by grepping every built file for external origins. Report honestly if any `unsafe-` directive is needed and why.
- `robots.txt`: allow `/` and `/map`, disallow everything else.
- No analytics in version one beyond the internal `events` table.
- Draft privacy and terms pages describe only what the system actually does, name every third party that receives data (Supabase, Resend, Cloudflare, Google Fonts), and make no claims that haven't been verified.

---

## 13. Build order

Build in dependency order. After each step: run the build, run the tests, and confirm the feature in the running app. Don't move on with failing tests.

1. `shared/vocab.ts`, `assertKnownKeys`, and tests
2. Database schema, enums matching vocab, RLS policies, RLS tests
3. Matching engine (`shared/matching/`) with tests: three-valued rules, statuses, grouping, ranking, "up to" total, next-unlock advisor, founders-like-you threshold
4. `ramp()` and its tests
5. Admin: opportunity form, CSV import with validation report, verification queue, seed examples
6. Layer 0 intake and preview (no account)
7. Magic-link auth and full plan page
8. Profile layers, milestones, Newly unlocked
9. Opportunity detail page
10. Materials locker and answer bank
11. Draft view
12. Applications tracker
13. Calendar, `.ics`, private feed
14. Emails: digest, reminders, check-ins with signed links, unsubscribe
15. Share links with password or invited emails
16. Public map
17. Submissions, claims, staleness queue
18. Metrics dashboard and events
19. Privacy, terms, 404, robots, headers, CSP
20. Accessibility and mobile pass, measured

---

## 14. Required tests (minimum)

- Vocab: unknown key throws; DB enums match vocab; CSV importer rejects unknown columns and rule keys.
- Matching: pass, fail and unknown each produce the right status; readiness failure goes to Not ready yet; eligibility failure is hidden; unknown goes to Needs info; targeted programs go to their own section when founder_groups is unanswered; grouping by dates is correct at boundaries (today, 30 days, 9 months); ranking tie-breaks.
- Totals: equity programs excluded; unverified excluded; undisclosed amounts counted in the note, not the sum.
- Next-unlock: picks the largest verified non-equity addition; tie-breaks.
- Founders like you: hidden at 9 reports, shown at 10.
- Drafts: picks the longest version under the word limit; flags unmapped questions.
- RLS: all cases in section 12.
- Signed check-in links: valid once, rejected when reused or expired.
- Ramp: the three values in section 11.

---

## 15. QA checklist (report pass or fail per line, never just "done")

**Honesty**
- No percentage appears anywhere without its count.
- No match score or composite number exists in the UI or the database.
- Past results and founders-like-you are separate lines on every card.
- Every opportunity shows source and last-verified date.
- Unverified opportunities appear nowhere a founder or the public can see.
- Empty values show "Not disclosed" or "Not enough data yet".
- No real-looking data exists besides the 5 EXAMPLE entries.

**Flow**
- A new visitor can finish Layer 0 and see a preview without an account.
- Entering an email unlocks the full plan after the magic link.
- Marking a milestone shows Newly unlocked when something changes.
- A check-in link updates the application and can't be reused.
- A shared plan requires the password or an invited email.

**Copy and design**
- No em dashes in any user-facing text.
- No UNC name or logo in Seedline's branding.
- Sentence case throughout, no all-caps labels.
- All ordinal colors come from `ramp()`.

**Accessibility and mobile**
- All text passes 4.5:1 contrast, measured.
- Every interactive element has visible focus.
- No element wider than the viewport at 375px.
- No tap target under 44px at 375px.

**Security**
- RLS tests pass.
- `.env` is not committed.
- Headers present on the deployed site.
- Admin routes and data unreachable for non-admins.

---

## 16. Out of scope for version one

AI features of any kind, angel groups, payments, university dashboards, SBIR writing services, a browser autofill extension, mobile apps, and multi-founder team accounts. Do not build stubs for these.

---

## 17. Final report

When finished, give me:
1. An audit table: each feature, the files that implement it, how you verified it (command or UI check), and its status.
2. The QA checklist with pass or fail per line.
3. Three lists: Done and verified, Needs your decision, Genuinely blocked.
4. Anything stubbed or partially built, stated explicitly.
5. A README covering setup, environment variables, Supabase setup, the CSV format, deploying to Cloudflare Pages, and the free-tier pause note.
