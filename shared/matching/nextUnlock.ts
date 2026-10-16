// Next-unlock advisor (spec 7.4). Simulates each milestone or Layer 2 answer the founder does not
// have yet, and reports the single change that would add the most. Pure function.
import {
  LAYER2_FIELD_KEYS, MILESTONE_ACTIONS, MILESTONE_EFFECTS, MILESTONES, PROFILE_FIELDS, STAGES, valueLabel,
  type Milestone, type ProfileFieldKey,
} from '../vocab.ts';
import { formatUsd } from '../money.ts';
import type { IsoDate } from '../dates.ts';
import { buildPlan } from './buildPlan.ts';
import type { FounderProfile, Opportunity, Plan } from './types.ts';

/** Never suggested: these describe the person, not something to do (PLAN.md Q7). */
const NEVER_SUGGEST: ProfileFieldKey[] = ['us_citizen_or_pr', 'founder_groups'];

export interface Unlock {
  kind: 'milestone' | 'answer';
  key: string;
  /** Label used for the name tie-break and shown in the UI. */
  label: string;
  message: string;
  count: number;
  amount: number;
  slugs: string[];
}

/** Applies a milestone and its effects (PLAN.md Q3). Stage only moves up. */
export function applyMilestone(profile: FounderProfile, m: Milestone): FounderProfile {
  const next: FounderProfile = { ...profile, milestones: [...new Set([...(profile.milestones ?? []), m])] };
  const effect = MILESTONE_EFFECTS[m];
  if (effect?.incorporated) next.incorporated = true;
  if (effect?.stageAtLeast) {
    const cur = profile.stage ? STAGES.indexOf(profile.stage) : -1;
    if (STAGES.indexOf(effect.stageAtLeast) > cur) next.stage = effect.stageAtLeast;
  }
  return next;
}

function onPlan(plan: Plan): Set<string> {
  return new Set([...plan.apply_now, ...plan.coming_up].filter((m) => m.status === 'eligible').map((m) => m.opportunity.slug));
}

/** Values worth simulating for a field: only those some rule actually references. */
function candidateValues(field: string, opportunities: Opportunity[]): unknown[] {
  const vals = new Set<unknown>();
  for (const o of opportunities) {
    for (const r of o.eligibility_rules) {
      if (r.field !== field) continue;
      if (r.op === 'is_true') vals.add(true);
      else if (r.op === 'is_false') vals.add(false);
      else if (r.op === 'in' && Array.isArray(r.value)) r.value.forEach((v) => vals.add(v));
      else if (r.op === 'eq' || r.op === 'gte' || r.op === 'lte') vals.add(r.value);
    }
  }
  return [...vals];
}

function gain(before: Set<string>, after: Plan, byslug: Map<string, Opportunity>) {
  const slugs: string[] = [];
  let amount = 0;
  for (const slug of onPlan(after)) {
    if (before.has(slug)) continue;
    const o = byslug.get(slug)!;
    // Only verified, non-equity programs count toward the advisor (spec 7.4).
    if (o.equity_required || o.verification_status === 'unverified') continue;
    slugs.push(slug);
    amount += o.amount_max ?? 0;
  }
  return { slugs: slugs.sort(), count: slugs.length, amount };
}

function phrase(action: string, count: number, amount: number, answering: boolean): string {
  const programs = `${count} more program${count === 1 ? '' : 's'}`;
  const worth = amount > 0 ? ` worth up to ${formatUsd(amount)}` : '';
  return answering
    ? `${action} could show you ${programs} you're eligible for${worth}.`
    : `${action} would make you eligible for ${programs}${worth}.`;
}

/**
 * Best single unlock, or null when nothing would add a program.
 * Ranking: larger amount first, then larger count, then label A to Z.
 */
export function nextUnlock(opportunities: Opportunity[], profile: FounderProfile, today: IsoDate): Unlock | null {
  const byslug = new Map(opportunities.map((o) => [o.slug, o]));
  const base = onPlan(buildPlan(opportunities, profile, today));
  const options: Unlock[] = [];
  const have = new Set(profile.milestones ?? []);

  for (const m of MILESTONES) {
    if (have.has(m)) continue;
    if (m === 'incorporated' && profile.incorporated === true) continue;
    const g = gain(base, buildPlan(opportunities, applyMilestone(profile, m), today), byslug);
    if (g.count > 0) {
      const action = MILESTONE_ACTIONS[m];
      options.push({ kind: 'milestone', key: m, label: action, message: phrase(action, g.count, g.amount, false), ...g });
    }
  }

  for (const field of LAYER2_FIELD_KEYS) {
    if (NEVER_SUGGEST.includes(field)) continue;
    const current = (profile as Record<string, unknown>)[field];
    if (current !== undefined && current !== null) continue;
    for (const value of candidateValues(field, opportunities)) {
      let sim: FounderProfile = { ...profile, [field]: value };
      let action = `Answering "${PROFILE_FIELDS[field].label.toLowerCase()}"`;
      let answering = true;
      // Incorporating in a state is something the founder can do, so phrase it as an action.
      if (field === 'incorporation_state' && profile.incorporated !== true) {
        sim = { ...applyMilestone(profile, 'incorporated'), incorporation_state: value as FounderProfile['incorporation_state'] };
        action = value === 'outside_us' ? 'Incorporating outside the US' : `Incorporating in ${stateName(String(value))}`;
        answering = false;
      }
      const g = gain(base, buildPlan(opportunities, sim, today), byslug);
      if (g.count > 0) {
        options.push({ kind: 'answer', key: `${field}=${String(value)}`, label: action, message: phrase(action, g.count, g.amount, answering), ...g });
      }
    }
  }

  options.sort((a, b) => b.amount - a.amount || b.count - a.count || a.label.localeCompare(b.label, 'en'));
  return options[0] ?? null;
}

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'Washington, DC', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  PR: 'Puerto Rico', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

export function stateName(code: string): string {
  return STATE_NAMES[code] ?? valueLabel(code);
}
