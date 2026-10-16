// Structural validation for eligibility rules, application questions and past winners.
// Used by the CSV importer and the admin form, so bad data is rejected before it is saved.
import {
  ANSWER_KEYS, assertKnownKeys, isMilestone, isOneOf, orderOf, PAST_WINNER_KEYS, PROFILE_FIELDS, QUESTION_KEYS,
  RULE_FIELD_KEYS, RULE_KEYS, RULE_KINDS, RULE_OPS, SECTORS, STAGES, type FieldDef,
} from '../vocab.ts';
import { isIsoDate } from '../dates.ts';
import type { ApplicationQuestion, PastWinner, Rule } from './types.ts';

const FIELDS = PROFILE_FIELDS as Record<string, FieldDef>;

function fieldType(field: string): FieldDef['type'] | 'milestone' {
  if (field in FIELDS) return FIELDS[field].type;
  return 'milestone';
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Returns a list of plain-language problems. Empty means valid. */
export function validateRules(input: unknown): string[] {
  if (!Array.isArray(input)) return ['eligibility_rules must be a JSON array.'];
  const errors: string[] = [];
  input.forEach((r, i) => {
    const at = `Rule ${i + 1}`;
    if (!isObject(r)) { errors.push(`${at} must be an object.`); return; }
    try { assertKnownKeys(Object.keys(r), at, RULE_KEYS); } catch (e) { errors.push((e as Error).message); return; }
    if (!isOneOf(RULE_FIELD_KEYS, r.field)) { errors.push(`${at}: unknown field "${String(r.field)}".`); return; }
    if (!isOneOf(RULE_OPS, r.op)) { errors.push(`${at}: unknown op "${String(r.op)}".`); return; }
    if (!isOneOf(RULE_KINDS, r.kind)) { errors.push(`${at}: kind must be eligibility or readiness.`); return; }
    if (r.note !== undefined && typeof r.note !== 'string') errors.push(`${at}: note must be text.`);
    const type = fieldType(r.field);
    const values = FIELDS[r.field]?.values;
    const validValue = (v: unknown): boolean => {
      if (type === 'enum') return isOneOf(values!, v);
      if (type === 'date' || type === 'month') return isIsoDate(v);
      if (type === 'text') return typeof v === 'string';
      if (type === 'boolean' || type === 'milestone') return typeof v === 'boolean';
      return false;
    };
    switch (r.op) {
      case 'eq':
        if (!validValue(r.value)) errors.push(`${at}: "${String(r.value)}" is not a valid value for ${r.field}.`);
        break;
      case 'in': case 'not_in':
        if (!Array.isArray(r.value) || r.value.length === 0) errors.push(`${at}: ${r.op} needs a non-empty list of values.`);
        else for (const v of r.value) if (!validValue(v)) errors.push(`${at}: "${String(v)}" is not a valid value for ${r.field}.`);
        break;
      case 'gte': case 'lte':
        if (!orderOf(r.field) && type !== 'date' && type !== 'month') errors.push(`${at}: ${r.op} only works on ordered fields or dates, not ${r.field}.`);
        else if (!validValue(r.value)) errors.push(`${at}: "${String(r.value)}" is not a valid value for ${r.field}.`);
        break;
      case 'exists':
        if (r.value !== undefined) errors.push(`${at}: exists takes no value.`);
        break;
      case 'is_true': case 'is_false':
        if (type !== 'boolean' && !isMilestone(r.field)) errors.push(`${at}: ${r.op} only works on yes or no fields and milestones.`);
        if (r.value !== undefined) errors.push(`${at}: ${r.op} takes no value.`);
        break;
    }
  });
  return errors;
}

export function validateQuestions(input: unknown): string[] {
  if (!Array.isArray(input)) return ['application_questions must be a JSON array.'];
  const errors: string[] = [];
  input.forEach((q, i) => {
    const at = `Question ${i + 1}`;
    if (!isObject(q)) { errors.push(`${at} must be an object.`); return; }
    try { assertKnownKeys(Object.keys(q), at, QUESTION_KEYS); } catch (e) { errors.push((e as Error).message); return; }
    if (typeof q.text !== 'string' || !q.text.trim()) errors.push(`${at}: text is required.`);
    if (q.word_limit !== null && q.word_limit !== undefined && !(Number.isInteger(q.word_limit) && (q.word_limit as number) > 0)) {
      errors.push(`${at}: word_limit must be a whole number above 0, or null.`);
    }
    if (q.maps_to !== null && q.maps_to !== undefined && !isOneOf(ANSWER_KEYS, q.maps_to)) {
      errors.push(`${at}: maps_to "${String(q.maps_to)}" is not an answer bank key.`);
    }
  });
  return errors;
}

export function validatePastWinners(input: unknown): string[] {
  if (!Array.isArray(input)) return ['past_winners must be a JSON array.'];
  const errors: string[] = [];
  input.forEach((w, i) => {
    const at = `Past winner ${i + 1}`;
    if (!isObject(w)) { errors.push(`${at} must be an object.`); return; }
    try { assertKnownKeys(Object.keys(w), at, PAST_WINNER_KEYS); } catch (e) { errors.push((e as Error).message); return; }
    if (typeof w.name !== 'string' || !w.name.trim()) errors.push(`${at}: name is required.`);
    if (w.sector != null && !isOneOf(SECTORS, w.sector)) errors.push(`${at}: unknown sector "${String(w.sector)}".`);
    if (w.stage != null && !isOneOf(STAGES, w.stage)) errors.push(`${at}: unknown stage "${String(w.stage)}".`);
    if (w.year != null && !(Number.isInteger(w.year) && (w.year as number) >= 1900 && (w.year as number) <= 2200)) errors.push(`${at}: year must be a four-digit year.`);
    if (w.source_url != null && !/^https?:\/\//.test(String(w.source_url))) errors.push(`${at}: source_url must start with http.`);
  });
  return errors;
}

/** Normalizes stored JSON into typed values, after validation has passed. */
export function asRules(x: unknown): Rule[] { return (x ?? []) as Rule[]; }
export function asQuestions(x: unknown): ApplicationQuestion[] {
  return ((x ?? []) as ApplicationQuestion[]).map((q) => ({ text: q.text, word_limit: q.word_limit ?? null, maps_to: q.maps_to ?? null }));
}
export function asPastWinners(x: unknown): PastWinner[] { return (x ?? []) as PastWinner[]; }
