# Progress

Plan approved 2026-10-15 with every suggested default in PLAN.md section 5. Admin email: arjnaidu@unc.edu (Q18).

## Done and verified
- **Step 1: vocabulary and scaffold.** `shared/vocab.ts` with every enum, profile field (label, question, layer, why we ask), CSV columns and `assertKnownKeys`. `npm test`: 13 of 13 passing. `npm run build` passes. Dev server renders the landing page; Bricolage Grotesque and Figtree load, and Figtree tabular figures measured equal width in the browser.

## Next
- Step 2: database schema, enums matching vocab, RLS policies, RLS tests.

## Open questions
- None.

## Stubbed or partial
- Nav links point to routes that are not built yet (they show the 404 page until their step).
