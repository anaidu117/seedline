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

## Next
- Step 9: opportunity detail page.

## Open questions
- None.

## Stubbed or partial
- Nav links point to routes that are not built yet (they show the 404 page until their step).
