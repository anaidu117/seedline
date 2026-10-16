# Progress

Plan approved 2026-10-15 with every suggested default in PLAN.md section 5. Admin email: arjnaidu@unc.edu (Q18).

## Done and verified
- **Step 1: vocabulary and scaffold.** `shared/vocab.ts` with every enum, profile field (label, question, layer, why we ask), CSV columns and `assertKnownKeys`. `npm test`: 13 of 13 passing. `npm run build` passes. Dev server renders the landing page; Bricolage Grotesque and Figtree load, and Figtree tabular figures measured equal width in the browser.

- **Step 2: database.** Migrations in `supabase/migrations/`: enums generated from vocab (`scripts/gen-enum-sql.ts`), 18 tables all with RLS, private `materials` bucket with owner-folder policies, guard trigger for organizer edits, outcome snapshot trigger, `founders_like_you` with the 10-report threshold enforced in SQL, `rotate_calendar_token`. `npx supabase db reset` applies cleanly. `npm run test:db`: 47 of 47 passing (enum match, columns match vocab, founder A vs B on 8 tables plus storage, anonymous access, non-admin access, admin cannot read profiles or founder groups, organizer scope, threshold at 9 and 10). Found and fixed during testing: Supabase grants `anon` execute on new functions by default; revoked.
- **Risk R1 (Edge Functions importing `shared/`):** works under `npx supabase functions serve` (the `health` function returns values read from `shared/vocab.ts`). Deploy bundling can only be confirmed at the deploy step.

- **Step 3: matching engine** (`shared/matching/`). Three-valued rule evaluation, statuses, targeted-program section, date windows with recurring projection, grouping, deterministic ranking (tie-breaks in `compareMatches` comments), "up to" totals, next-unlock advisor, newly unlocked, founders-like-you line, past winners summary, materials readiness, rule/question/winner validation. 58 matching tests, including every boundary in spec section 14 (today, 30 and 31 days, exactly 9 months and 9 months plus a day).
- **Step 4: `ramp()`** with the three spec values tested, plus `urgencyT` and `readinessT` mappings. `npm run contrast` measures 19 token pairs read from the CSS: all pass.
- Unit tests: 75 of 75. DB tests: 47 of 47. Build passes.

## Next
- Step 5: admin opportunity form, CSV import with validation report, verification queue, seed examples.

## Open questions
- None.

## Stubbed or partial
- Nav links point to routes that are not built yet (they show the 404 page until their step).
