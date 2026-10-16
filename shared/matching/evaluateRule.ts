// Three-valued rule evaluation: pass, fail, or unknown (the founder has not answered yet).
// A missing answer is never a failed rule.
import {
  isMilestone, orderOf, PROFILE_FIELDS, valueLabel, type FieldDef, type RuleFieldKey,
} from '../vocab.ts';
import { formatDate, isIsoDate } from '../dates.ts';
import type { FounderProfile, Rule, RuleOutcome, RuleResult } from './types.ts';

const FIELDS = PROFILE_FIELDS as Record<string, FieldDef>;

/** The founder's value for a rule field, or undefined when not answered. */
export function profileValue(profile: FounderProfile, field: RuleFieldKey): unknown {
  // `incorporated` is both a profile field and a milestone; the profile field wins (PLAN.md Q3).
  if (field in FIELDS) {
    const v = (profile as Record<string, unknown>)[field];
    return v === null || v === '' ? undefined : v;
  }
  if (isMilestone(field)) {
    // Before an account exists there is no milestone list, so milestone rules are unknown.
    if (!profile.milestones) return undefined;
    return profile.milestones.includes(field);
  }
  return undefined;
}

function compare(field: string, a: unknown, b: unknown): number {
  const order = orderOf(field);
  if (order) {
    const ia = order.indexOf(String(a));
    const ib = order.indexOf(String(b));
    if (ia < 0 || ib < 0) throw new Error(`Value not in the order for ${field}: ${String(ia < 0 ? a : b)}`);
    return ia - ib;
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  throw new Error(`Cannot compare values for ${field}`);
}

export function outcomeOf(rule: Rule, profile: FounderProfile): RuleOutcome {
  const v = profileValue(profile, rule.field);
  if (v === undefined) return 'unknown';
  switch (rule.op) {
    case 'eq': return v === rule.value ? 'pass' : 'fail';
    case 'in': return (rule.value as unknown[]).includes(v) ? 'pass' : 'fail';
    case 'not_in': return (rule.value as unknown[]).includes(v) ? 'fail' : 'pass';
    case 'gte': return compare(rule.field, v, rule.value) >= 0 ? 'pass' : 'fail';
    case 'lte': return compare(rule.field, v, rule.value) <= 0 ? 'pass' : 'fail';
    case 'exists': return Array.isArray(v) && v.length === 0 ? 'fail' : 'pass';
    case 'is_true': return v === true ? 'pass' : 'fail';
    case 'is_false': return v === false ? 'pass' : 'fail';
    default: {
      const never: never = rule.op;
      throw new Error(`Unknown rule op: ${String(never)}`);
    }
  }
}

function fieldLabel(field: RuleFieldKey): string {
  if (field in FIELDS) return FIELDS[field].label;
  return valueLabel(field);
}

function showValue(field: RuleFieldKey, v: unknown): string {
  if (isIsoDate(v)) return formatDate(v);
  if (typeof v === 'string') return valueLabel(v, field);
  return String(v);
}

function joinOr(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

/** The rule as a plain sentence fragment: "Stage is Prototype or later". */
export function describeRequirement(rule: Rule): string {
  const label = fieldLabel(rule.field);
  const isDate = isIsoDate(rule.value);
  const higher = rule.field === 'stage' ? 'or later' : isDate ? '' : 'or more';
  const lower = rule.field === 'stage' ? 'or earlier' : isDate ? '' : 'or less';
  switch (rule.op) {
    case 'eq': return `${label} is ${showValue(rule.field, rule.value)}`;
    case 'in': return `${label} is ${joinOr((rule.value as unknown[]).map((x) => showValue(rule.field, x)))}`;
    case 'not_in': return `${label} is not ${joinOr((rule.value as unknown[]).map((x) => showValue(rule.field, x)))}`;
    case 'gte': return isDate ? `${label} on or after ${showValue(rule.field, rule.value)}` : `${label} is ${showValue(rule.field, rule.value)} ${higher}`;
    case 'lte': return isDate ? `${label} on or before ${showValue(rule.field, rule.value)}` : `${label} is ${showValue(rule.field, rule.value)} ${lower}`;
    case 'exists': return `${label} is filled in`;
    case 'is_true': return isMilestone(rule.field) && !(rule.field in FIELDS) ? label : `${label}: yes`;
    case 'is_false': return isMilestone(rule.field) && !(rule.field in FIELDS) ? `Not yet: ${label.toLowerCase()}` : `${label}: no`;
  }
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function evaluateRule(rule: Rule, profile: FounderProfile): RuleResult {
  const outcome = outcomeOf(rule, profile);
  const requirement = describeRequirement(rule);
  let gap = '';
  let fit = '';
  if (outcome === 'pass') fit = fitText(rule, profile, requirement);
  if (outcome === 'fail') {
    if (rule.note) {
      gap = rule.note;
    } else {
      const v = profileValue(profile, rule.field);
      const have = typeof v === 'boolean' ? '' : ` You have: ${showValue(rule.field, v)}.`;
      gap = `Needs ${lowerFirst(requirement)}.${have}`;
    }
  } else if (outcome === 'unknown') {
    if (rule.field in FIELDS) {
      gap = `Answer "${FIELDS[rule.field].question}" in your profile.`;
    } else {
      gap = `Mark your milestones in your profile.`;
    }
  }
  return { rule, outcome, requirement, gap, fit };
}

/** A passed rule described with the founder's answer: "Stage is Prototype (needs Idea or later)". */
function fitText(rule: Rule, profile: FounderProfile, requirement: string): string {
  const v = profileValue(profile, rule.field);
  const label = fieldLabel(rule.field);
  switch (rule.op) {
    case 'in': case 'not_in':
      return `${label} is ${showValue(rule.field, v)}`;
    case 'gte': case 'lte': {
      const need = requirement.slice(requirement.indexOf(' is ') >= 0 ? requirement.indexOf(' is ') + 4 : label.length + 1);
      return `${label} is ${showValue(rule.field, v)} (needs ${lowerFirst(need)})`;
    }
    default:
      return requirement;
  }
}

/** Which profile layer to fill in to resolve an unknown rule. */
export function layerFor(rule: Rule): number | 'optional' | 'milestones' {
  if (rule.field in FIELDS) return FIELDS[rule.field].layer as number | 'optional';
  return 'milestones';
}
