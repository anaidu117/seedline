import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CSV_COLUMNS } from '../vocab.ts';
import { diffRow, parseCsv, toCsv, validateCsv } from './csv.ts';
import { buildFiles } from '../../scripts/examples.ts';

function csvWith(overrides: Record<string, string>[]): string {
  const base: Record<string, string> = {
    slug: 'example-x', name: 'EXAMPLE: X', organizer: 'EXAMPLE org', type: 'fellowship', geography_level: 'national',
    deadline_type: 'rolling', source_url: 'https://example.com/x',
  };
  return toCsv([[...CSV_COLUMNS], ...overrides.map((o) => CSV_COLUMNS.map((c) => ({ ...base, ...o })[c] ?? ''))]);
}

describe('parseCsv', () => {
  it('handles quotes, doubled quotes, commas and newlines inside fields, and CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","he said ""hi""\nthen left"\r\n')).toEqual([['a', 'b'], ['x, y', 'he said "hi"\nthen left']]);
  });
  it('throws on an unclosed quote', () => {
    expect(() => parseCsv('a\n"oops')).toThrow(/quoted field/);
  });
});

describe('validateCsv', () => {
  it('rejects unknown columns', () => {
    const r = validateCsv(`${CSV_COLUMNS.join(',')},match_score\n`);
    expect(r.headerErrors[0]).toMatch(/Unknown column\(s\): match_score/);
    expect(r.rows).toEqual([]);
  });

  it('rejects missing columns', () => {
    const r = validateCsv(`${CSV_COLUMNS.filter((c) => c !== 'source_url').join(',')}\n`);
    expect(r.headerErrors[0]).toMatch(/Missing column\(s\): source_url/);
  });

  it('rejects unknown rule keys and rule fields, with the reason', () => {
    const r = validateCsv(csvWith([
      { slug: 'bad-key', eligibility_rules: '[{"field":"stage","op":"eq","value":"idea","kind":"eligibility","weight":2}]' },
      { slug: 'bad-field', eligibility_rules: '[{"field":"revenue","op":"eq","value":"x","kind":"eligibility"}]' },
    ]));
    expect(r.rows[0]).toMatchObject({ ok: false, slug: 'bad-key' });
    expect((r.rows[0] as { errors: string[] }).errors[0]).toMatch(/unknown vocabulary key.*weight/);
    expect((r.rows[1] as { errors: string[] }).errors[0]).toMatch(/unknown field "revenue"/);
  });

  it('sets every imported row to unverified, whatever the file says', () => {
    const r = validateCsv(csvWith([{}]));
    expect(r.rows[0].ok).toBe(true);
    if (r.rows[0].ok) expect(r.rows[0].row.opportunity.verification_status).toBe('unverified');
  });

  it('reports every problem in a row, and rejects the whole row', () => {
    const r = validateCsv(csvWith([{
      slug: 'Bad Slug', type: 'grant', amount_max: '$10,000', opens_at: '2026-13-01', target_groups: 'veteran;aliens',
      application_url: 'example.com',
    }]));
    expect(r.rows[0].ok).toBe(false);
    const errors = (r.rows[0] as { errors: string[] }).errors.join(' | ');
    expect(errors).toMatch(/slug must be/);
    expect(errors).toMatch(/type "grant"/);
    expect(errors).toMatch(/amount_max "\$10,000" must be a whole number/);
    expect(errors).toMatch(/opens_at "2026-13-01"/);
    expect(errors).toMatch(/unknown founder group "aliens"/);
    expect(errors).toMatch(/application_url must be a full URL/);
  });

  it('rejects duplicate slugs within one file', () => {
    const r = validateCsv(csvWith([{ slug: 'same' }, { slug: 'same' }]));
    expect(r.rows[0].ok).toBe(true);
    expect((r.rows[1] as { errors: string[] }).errors[0]).toMatch(/Duplicate slug "same", already on line 2/);
  });

  it('rejects a row with the wrong number of values', () => {
    const r = validateCsv(`${CSV_COLUMNS.join(',')}\na,b,c\n`);
    expect((r.rows[0] as { errors: string[] }).errors[0]).toMatch(/Has 3 values but the header has 29/);
  });

  it('parses list and JSON columns', () => {
    const r = validateCsv(csvWith([{ regions: 'Durham; Raleigh', materials_required: 'pitch_deck;budget', application_questions: '[{"text":"Why?","word_limit":50,"maps_to":"problem"}]' }]));
    if (!r.rows[0].ok) throw new Error(JSON.stringify(r.rows[0]));
    expect(r.rows[0].row.opportunity.regions).toEqual(['Durham', 'Raleigh']);
    expect(r.rows[0].row.opportunity.materials_required).toEqual(['pitch_deck', 'budget']);
  });
});

describe('diffRow', () => {
  it('lists changed fields and ignores JSON key order', () => {
    const existing = { name: 'A', eligibility_rules: [{ kind: 'eligibility', op: 'eq', field: 'stage', value: 'idea' }] };
    const incoming = { name: 'B', eligibility_rules: [{ field: 'stage', op: 'eq', value: 'idea', kind: 'eligibility' }] };
    expect(diffRow(existing, incoming).map((d) => d.field)).toEqual(['name']);
  });
});

describe('the 5 EXAMPLE rows', () => {
  it('data/examples.csv and supabase/seed.sql match scripts/examples.ts', () => {
    const { csv, seed } = buildFiles();
    expect(readFileSync('data/examples.csv', 'utf8')).toBe(csv);
    expect(readFileSync('supabase/seed.sql', 'utf8')).toBe(seed);
  });
  it('all validate, are all named EXAMPLE and use example.com URLs only', () => {
    const r = validateCsv(readFileSync('data/examples.csv', 'utf8'));
    expect(r.rows).toHaveLength(5);
    for (const row of r.rows) {
      expect(row.ok).toBe(true);
      if (!row.ok) continue;
      expect(String(row.row.opportunity.name)).toMatch(/^EXAMPLE: /);
      const urls = JSON.stringify(row.row.opportunity).match(/https?:\/\/[^"\s]+/g) ?? [];
      for (const u of urls) expect(new URL(u).hostname).toBe('example.com');
    }
  });
});
