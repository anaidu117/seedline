import { describe, expect, it } from 'vitest';
import { DB_ENUMS } from '../../shared/vocab.ts';
import { withDb } from '../helpers/local.ts';

describe('database enums match shared/vocab.ts', () => {
  it('has exactly the vocab enums, with the same values in the same order', async () => {
    const rows = await withDb(async (db) => (await db.query<{ typname: string; labels: string[] }>(`
      select t.typname, array_agg(e.enumlabel::text order by e.enumsortorder) as labels
      from pg_type t join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
      group by t.typname`)).rows);
    const inDb = Object.fromEntries(rows.map((r) => [r.typname, r.labels]));
    const inVocab = Object.fromEntries(Object.entries(DB_ENUMS).map(([k, v]) => [k, [...v]]));
    expect(inDb).toEqual(inVocab);
  });

  it('has a column for every profile field in vocab', async () => {
    const { PROFILE_FIELD_KEYS } = await import('../../shared/vocab.ts');
    const cols = await withDb(async (db) => (await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'profiles'`,
    )).rows.map((r) => r.column_name));
    for (const key of PROFILE_FIELD_KEYS) {
      if (key === 'founder_groups') continue; // lives in profile_founder_groups
      expect(cols, key).toContain(key);
    }
  });

  it('has a column for every opportunity field in vocab', async () => {
    const { OPPORTUNITY_FIELDS } = await import('../../shared/vocab.ts');
    const cols = await withDb(async (db) => (await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'opportunities'`,
    )).rows.map((r) => r.column_name));
    for (const key of OPPORTUNITY_FIELDS) expect(cols, key).toContain(key);
  });
});
