// Statuses, windows, grouping and ranking. Pure functions, no network.
import { valueLabel } from '../vocab.ts';
import { addDays, addMonths, addYears, type IsoDate } from '../dates.ts';
import { evaluateRule } from './evaluateRule.ts';
import type { FounderProfile, Match, MatchStatus, Opportunity, Plan, PlanGroup, RuleResult, Window } from './types.ts';

export const APPLY_NOW_DAYS = 30;
export const HORIZON_MONTHS = 9;

/** Unverified listings never reach a founder. Archived ones are gone. */
export function isVisible(o: Opportunity): boolean {
  return o.verification_status !== 'unverified' && !o.archived;
}

/**
 * Status rules (spec section 6):
 *  - any eligibility rule fails            -> not_eligible
 *  - else any readiness rule fails          -> not_ready (unknowns are listed too, PLAN.md Q5)
 *  - else any rule unknown                  -> needs_info
 *  - else                                   -> eligible
 */
export function statusFromResults(results: RuleResult[]): MatchStatus {
  if (results.some((r) => r.outcome === 'fail' && r.rule.kind === 'eligibility')) return 'not_eligible';
  if (results.some((r) => r.outcome === 'fail' && r.rule.kind === 'readiness')) return 'not_ready';
  if (results.some((r) => r.outcome === 'unknown')) return 'needs_info';
  return 'eligible';
}

/**
 * Target groups mean "any of" (PLAN.md Q8).
 * Unanswered founder groups -> the program goes in its own section, never silently included or excluded.
 * Answered and no overlap   -> not eligible.
 */
function targetGroupResult(o: Opportunity, profile: FounderProfile): { targeted: boolean; fail?: RuleResult } {
  if (o.target_groups.length === 0) return { targeted: false };
  if (!profile.founder_groups) return { targeted: true };
  if (o.target_groups.some((g) => profile.founder_groups!.includes(g))) return { targeted: false };
  const who = o.target_groups.map((g) => valueLabel(g).toLowerCase()).join(', ');
  return {
    targeted: false,
    fail: {
      rule: { field: 'school', op: 'exists', kind: 'eligibility' }, // placeholder rule, only text is shown
      outcome: 'fail',
      requirement: `Open to: ${who}`,
      gap: `This program is only open to: ${who}.`,
      fit: '',
    },
  };
}

/**
 * The application window. Recurring programs whose deadline has passed are projected forward by
 * whole years and marked expected (PLAN.md Q6).
 */
export function windowFor(o: Opportunity, today: IsoDate): Window {
  let opens = o.opens_at;
  let closes = o.deadline_at;
  let decision = o.decision_at;
  let expected = false;
  if (o.deadline_type === 'recurring' && closes && closes < today) {
    let years = 0;
    while (addYears(closes, years) < today) years++;
    opens = opens ? addYears(opens, years) : null;
    closes = addYears(closes, years);
    decision = decision ? addYears(decision, years) : null;
    expected = true;
  }
  return { opens, closes, decision, expected };
}

/**
 * Groups an eligible match by its window (spec section 6, planning horizon 9 months):
 *  - deadline passed                                   -> closed
 *  - opens on or before today + 30 days (or no date)   -> apply_now
 *  - opens on or before today + 9 calendar months      -> coming_up
 *  - later than that                                   -> later
 */
export function dateGroup(w: Window, today: IsoDate): 'apply_now' | 'coming_up' | 'later' | 'closed' {
  if (w.closes && w.closes < today) return 'closed';
  const opens = w.opens ?? today;
  if (opens <= addDays(today, APPLY_NOW_DAYS)) return 'apply_now';
  if (opens <= addMonths(today, HORIZON_MONTHS)) return 'coming_up';
  return 'later';
}

export function matchOpportunity(o: Opportunity, profile: FounderProfile, today: IsoDate): Match {
  const results = o.eligibility_rules.map((r) => evaluateRule(r, profile));
  const tg = targetGroupResult(o, profile);
  if (tg.fail) results.push(tg.fail);
  const status = statusFromResults(results);
  const window = windowFor(o, today);
  const dg = dateGroup(window, today);

  let group: PlanGroup;
  if (status === 'not_eligible') group = 'not_eligible';
  else if (dg === 'closed') group = 'closed';
  else if (tg.targeted) group = 'targeted';
  else if (status === 'not_ready') group = 'not_ready';
  else if (status === 'needs_info') group = 'needs_info';
  else group = dg;

  return {
    opportunity: o,
    status,
    group,
    passed: results.filter((r) => r.outcome === 'pass'),
    failed: results.filter((r) => r.outcome === 'fail'),
    unknown: results.filter((r) => r.outcome === 'unknown'),
    targeted: tg.targeted,
    window,
  };
}

/**
 * Deterministic ranking within a group:
 *  1. nearest deadline first (no deadline sorts after any dated one)
 *  2. larger amount_max first (undisclosed sorts after any disclosed amount)
 *  3. name, A to Z (case-insensitive, English collation)
 *  4. slug, as a final tie-break so equal names never depend on input order
 */
export function compareMatches(a: Match, b: Match): number {
  const da = a.window.closes;
  const db = b.window.closes;
  if (da !== db) {
    if (da === null) return 1;
    if (db === null) return -1;
    return da < db ? -1 : 1;
  }
  const ma = a.opportunity.amount_max;
  const mb = b.opportunity.amount_max;
  if (ma !== mb) {
    if (ma === null) return 1;
    if (mb === null) return -1;
    return mb - ma;
  }
  const byName = a.opportunity.name.localeCompare(b.opportunity.name, 'en', { sensitivity: 'base' });
  if (byName !== 0) return byName;
  return a.opportunity.slug < b.opportunity.slug ? -1 : a.opportunity.slug > b.opportunity.slug ? 1 : 0;
}

export function buildPlan(opportunities: Opportunity[], profile: FounderProfile, today: IsoDate): Plan {
  const plan: Plan = {
    today, apply_now: [], coming_up: [], not_ready: [], needs_info: [], targeted: [], later: [], closed: [], not_eligible: [],
  };
  for (const o of opportunities) {
    if (!isVisible(o)) continue;
    const m = matchOpportunity(o, profile, today);
    plan[m.group].push(m);
  }
  for (const key of Object.keys(plan) as (keyof Plan)[]) {
    if (key !== 'today') (plan[key] as Match[]).sort(compareMatches);
  }
  return plan;
}

/** slug -> status, stored as the plan snapshot for "Newly unlocked" and the digest. */
export function planStatuses(plan: Plan): Record<string, PlanGroup> {
  const out: Record<string, PlanGroup> = {};
  for (const key of Object.keys(plan) as (keyof Plan)[]) {
    if (key === 'today') continue;
    for (const m of plan[key] as Match[]) out[m.opportunity.slug] = m.group;
  }
  return out;
}
