# CLAUDE.md

This project is Seedline. The full spec is in `SEEDLINE_SPEC.md`. It is the source of truth. If anything here or in a prompt conflicts with the spec, stop and ask.

## Standing rules

- Never claim something works unless you ran it. Every number you report comes from a command you ran.
- Report status in three lists: Done and verified, Needs your decision, Genuinely blocked.
- Do not invent opportunities, amounts, deadlines, winners or statistics. The only seed data is the 5 EXAMPLE entries the spec defines.
- All field names come from `shared/vocab.ts`. Never hardcode a field string anywhere else.
- No match percentages or composite scores, anywhere.
- No em dashes in user-facing copy.
- No AI features, no paid services, no third-party scripts besides Cloudflare Turnstile.
- If a spec requirement seems wrong or impossible, stop and ask. Do not quietly work around it.

## How to work

- Follow the build order in section 13 of the spec.
- After each build step: run the build, run the tests, check the feature in the running app, then commit with a message naming the step (for example `step 3: matching engine`).
- Keep `PROGRESS.md` updated after every step: what's done and verified, what's next, open questions, and anything stubbed. If a session ends early, the next session starts by reading `PROGRESS.md`.
- Never move to the next step with failing tests.
- Never commit `.env`. Secrets live in `.env` locally and in Supabase function secrets in production.

## Commands

- Install: `npm install`
- Dev server: `npm run dev` (http://localhost:5173)
- Tests: `npm test` (unit), `npm run test:db` (RLS, database and Edge Function tests; needs local Supabase running), `npm run test:e2e` (Playwright browser flows; needs local Supabase and functions running)
- Build: `npm run build` (typecheck, Vite build, then writes `dist/_headers` with the CSP)
- Local Supabase start and reset: `npx supabase start`, `npx supabase db reset` (re-applies migrations and `supabase/seed.sql`). Local email inbox: http://127.0.0.1:54324. Studio: http://127.0.0.1:54323
- Local Edge Functions: `npx supabase functions serve` (reads secrets from `supabase/functions/.env`)
- Deploy: see README "Deploying". Not done yet.
