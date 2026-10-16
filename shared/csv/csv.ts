// CSV parsing and per-row validation for the admin import (spec section 10).
// Runs in the browser, Node and the csv-import Edge Function (Deno).
import {
  CSV_BOOL_COLUMNS, CSV_COLUMNS, CSV_DATE_COLUMNS, CSV_INT_COLUMNS, CSV_REQUIRED_COLUMNS, DEADLINE_TYPES, FOUNDER_GROUPS,
  GEOGRAPHY_LEVELS, isOneOf, MATERIALS, OPPORTUNITY_TYPES, type CsvColumn,
} from '../vocab.ts';
import { isIsoDate } from '../dates.ts';
import { validatePastWinners, validateQuestions, validateRules } from '../matching/validateRules.ts';

/** RFC 4180 parser: quoted fields, doubled quotes, commas and newlines inside quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  while (i < src.length) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"' && field === '') { quoted = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' && src[i + 1] === '\n') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (quoted) throw new Error('The file ends inside a quoted field. Check for a missing closing quote.');
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  const cell = (v: string | number | boolean | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\n') + '\n';
}

export interface HeaderCheck { ok: boolean; errors: string[] }

/** The header must be exactly the spec's columns: no unknown columns, none missing. */
export function checkHeader(header: string[]): HeaderCheck {
  const cols = header.map((h) => h.trim());
  const unknown = cols.filter((c) => !isOneOf(CSV_COLUMNS, c));
  const missing = CSV_COLUMNS.filter((c) => !cols.includes(c));
  const dupes = cols.filter((c, i) => cols.indexOf(c) !== i);
  const errors: string[] = [];
  if (unknown.length) errors.push(`Unknown column(s): ${unknown.join(', ')}. Only the columns listed in the README are allowed.`);
  if (missing.length) errors.push(`Missing column(s): ${missing.join(', ')}.`);
  if (dupes.length) errors.push(`Duplicate column(s): ${[...new Set(dupes)].join(', ')}.`);
  return { ok: errors.length === 0, errors };
}

/** A validated row, ready to write. verification_status is always unverified on import. */
export interface ImportRow {
  opportunity: Record<string, unknown>;
  research_notes: string;
}

export type RowResult = { line: number; slug: string; ok: true; row: ImportRow } | { line: number; slug: string; ok: false; errors: string[] };

const URL_COLUMNS: CsvColumn[] = ['application_url', 'source_url', 'past_results_source_url'];

function list(s: string): string[] {
  return s.split(';').map((x) => x.trim()).filter(Boolean);
}

export function validateRow(record: Record<string, string>, line: number): RowResult {
  const errors: string[] = [];
  const get = (c: CsvColumn) => (record[c] ?? '').trim();
  const out: Record<string, unknown> = {};
  const slug = get('slug');

  for (const c of CSV_REQUIRED_COLUMNS) if (!get(c)) errors.push(`${c} is required.`);
  if (slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errors.push('slug must be lowercase letters, numbers and single hyphens.');

  const enumCheck = (c: CsvColumn, values: readonly string[]) => {
    const v = get(c);
    if (v && !isOneOf(values, v)) errors.push(`${c} "${v}" is not one of: ${values.join(', ')}.`);
  };
  enumCheck('type', OPPORTUNITY_TYPES);
  enumCheck('geography_level', GEOGRAPHY_LEVELS);
  enumCheck('deadline_type', DEADLINE_TYPES);

  for (const c of ['slug', 'name', 'organizer', 'type', 'geography_level', 'deadline_type', 'source_url'] as const) out[c] = get(c);
  for (const c of ['description', 'amount_notes', 'equity_notes', 'cycle_notes', 'application_url', 'past_results_text', 'past_results_source_url'] as const) {
    out[c] = get(c) || null;
  }

  for (const c of URL_COLUMNS) {
    const v = get(c);
    if (v && !/^https?:\/\/[^\s]+$/.test(v)) errors.push(`${c} must be a full URL starting with http:// or https://.`);
  }

  for (const c of CSV_INT_COLUMNS) {
    const v = get(c);
    if (!v) { out[c] = null; continue; }
    if (!/^\d+$/.test(v)) { errors.push(`${c} "${v}" must be a whole number with digits only (no $ or commas).`); continue; }
    out[c] = Number(v);
  }
  for (const c of CSV_BOOL_COLUMNS) {
    const v = get(c).toLowerCase();
    if (!v || v === 'false' || v === 'no') out[c] = false;
    else if (v === 'true' || v === 'yes') out[c] = true;
    else errors.push(`${c} must be true or false.`);
  }
  for (const c of CSV_DATE_COLUMNS) {
    const v = get(c);
    if (!v) { out[c] = null; continue; }
    if (!isIsoDate(v)) { errors.push(`${c} "${v}" must be a real date in YYYY-MM-DD format.`); continue; }
    out[c] = v;
  }

  out.regions = list(get('regions'));
  const groups = list(get('target_groups'));
  for (const g of groups) if (!isOneOf(FOUNDER_GROUPS, g)) errors.push(`target_groups: unknown founder group "${g}".`);
  out.target_groups = groups;
  const mats = list(get('materials_required'));
  for (const m of mats) if (!isOneOf(MATERIALS, m)) errors.push(`materials_required: unknown material "${m}".`);
  out.materials_required = mats;

  const json = (c: 'eligibility_rules' | 'application_questions' | 'past_winners', validate: (x: unknown) => string[]) => {
    const v = get(c);
    if (!v) { out[c] = []; return; }
    let parsed: unknown;
    try { parsed = JSON.parse(v); } catch { errors.push(`${c} is not valid JSON.`); return; }
    const problems = validate(parsed);
    if (problems.length) errors.push(...problems.map((p) => `${c}: ${p}`));
    else out[c] = parsed;
  };
  json('eligibility_rules', validateRules);
  json('application_questions', validateQuestions);
  json('past_winners', validatePastWinners);

  if (typeof out.amount_min === 'number' && typeof out.amount_max === 'number' && out.amount_min > out.amount_max) {
    errors.push('amount_min is larger than amount_max.');
  }
  if (typeof out.opens_at === 'string' && typeof out.deadline_at === 'string' && out.opens_at > out.deadline_at) {
    errors.push('opens_at is after deadline_at.');
  }
  if (get('deadline_type') === 'fixed' && !get('deadline_at')) errors.push('A fixed deadline needs deadline_at.');
  if (get('past_results_count') && !get('past_results_source_url')) errors.push('past_results_count needs past_results_source_url.');

  // Every imported row is unverified, whatever the file says (spec section 10).
  out.verification_status = 'unverified';
  out.last_verified_at = null;
  out.verified_by = null;

  if (errors.length) return { line, slug, ok: false, errors };
  return { line, slug, ok: true, row: { opportunity: out, research_notes: get('research_notes') } };
}

export interface ParsedImport { headerErrors: string[]; rows: RowResult[] }

/** Parses and validates a whole file. Line numbers count the header as line 1. */
export function validateCsv(text: string): ParsedImport {
  let table: string[][];
  try { table = parseCsv(text); } catch (e) { return { headerErrors: [(e as Error).message], rows: [] }; }
  if (table.length === 0) return { headerErrors: ['The file is empty.'], rows: [] };
  const header = table[0].map((h) => h.trim());
  const hc = checkHeader(header);
  if (!hc.ok) return { headerErrors: hc.errors, rows: [] };
  const seen = new Map<string, number>();
  const rows = table.slice(1).map((cells, idx): RowResult => {
    const line = idx + 2;
    if (cells.length !== header.length) {
      return { line, slug: cells[0] ?? '', ok: false, errors: [`Has ${cells.length} values but the header has ${header.length} columns.`] };
    }
    const record = Object.fromEntries(header.map((h, i) => [h, cells[i]]));
    const r = validateRow(record, line);
    if (r.slug) {
      if (seen.has(r.slug)) {
        return { line, slug: r.slug, ok: false, errors: [`Duplicate slug "${r.slug}", already on line ${seen.get(r.slug)}.`] };
      }
      seen.set(r.slug, line);
    }
    return r;
  });
  return { headerErrors: [], rows };
}

/** JSON with object keys sorted, so jsonb key order from Postgres does not count as a change. */
function canonical(v: unknown): string {
  return JSON.stringify(v, (_k, x) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, (x as Record<string, unknown>)[k]]))
      : x);
}

/** Field-by-field differences between a stored listing and an incoming row, for the overwrite prompt. */
export function diffRow(existing: Record<string, unknown>, incoming: Record<string, unknown>): { field: string; from: unknown; to: unknown }[] {
  const out: { field: string; from: unknown; to: unknown }[] = [];
  for (const c of CSV_COLUMNS) {
    if (c === 'research_notes') continue;
    const a = existing[c] ?? null;
    const b = incoming[c] ?? null;
    if (canonical(a) !== canonical(b)) out.push({ field: c, from: a, to: b });
  }
  return out;
}
