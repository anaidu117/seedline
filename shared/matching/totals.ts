// "You're eligible for up to $X across N opportunities" (spec 7.1).
import type { Match, Opportunity, Plan } from './types.ts';

export interface Totals {
  /** Sum of amount_max for disclosed, non-equity, verified, eligible programs in Apply now and Coming up. */
  total: number;
  openNow: number;
  openingLater: number;
  /** How many programs are in the sum (PLAN.md Q9). */
  count: number;
  /** Eligible, non-equity programs with no disclosed amount. Counted here, never added to the sum. */
  undisclosed: Opportunity[];
  /** Eligible programs that take equity. Listed separately, never added in. */
  equity: Opportunity[];
}

function counts(o: Opportunity): boolean {
  return o.verification_status !== 'unverified' && !o.archived;
}

export function computeTotals(plan: Pick<Plan, 'apply_now' | 'coming_up'>): Totals {
  const t: Totals = { total: 0, openNow: 0, openingLater: 0, count: 0, undisclosed: [], equity: [] };
  const add = (m: Match, bucket: 'openNow' | 'openingLater') => {
    const o = m.opportunity;
    if (m.status !== 'eligible' || !counts(o)) return;
    if (o.equity_required) { t.equity.push(o); return; }
    if (o.amount_max == null) { t.undisclosed.push(o); return; }
    t[bucket] += o.amount_max;
    t.count += 1;
  };
  plan.apply_now.forEach((m) => add(m, 'openNow'));
  plan.coming_up.forEach((m) => add(m, 'openingLater'));
  t.total = t.openNow + t.openingLater;
  return t;
}
