import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { CSV_COLUMNS } from '../../shared/vocab.ts';
import { toCsv } from '../../shared/csv/csv.ts';
import { adminClient, callFunction, signedInAdmin, signedInUser, tokenOf } from '../helpers/local.ts';

let adminToken: string;
const tag = Date.now().toString(36);

function row(o: Record<string, string>): string[] {
  const base: Record<string, string> = {
    name: 'EXAMPLE: Import test', organizer: 'EXAMPLE org', type: 'fellowship', geography_level: 'national',
    deadline_type: 'rolling', source_url: 'https://example.com/x', research_notes: 'private note',
  };
  return CSV_COLUMNS.map((c) => ({ ...base, ...o })[c] ?? '');
}

beforeAll(async () => {
  adminToken = (await signedInAdmin()).token;
});

describe('csv-import Edge Function', () => {
  it('refuses non-admins', async () => {
    const founder = await signedInUser('not-admin');
    const res = await callFunction('csv-import', { token: await tokenOf(founder.client), body: { csv: 'x', mode: 'preview' } });
    expect(res.status).toBe(403);
  });

  it('previews the examples file: 5 valid rows that already exist', async () => {
    const res = await callFunction('csv-import', { token: adminToken, body: { csv: readFileSync('data/examples.csv', 'utf8'), mode: 'preview' } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.rows).toHaveLength(5);
    // Diffs depend on local edits, so only validity and existence are checked here.
    for (const r of body.rows) expect(r).toMatchObject({ ok: true, exists: true });
  });

  it('rejects an unknown column for the whole file', async () => {
    const res = await callFunction('csv-import', { token: adminToken, body: { csv: `${CSV_COLUMNS.join(',')},score\n`, mode: 'commit' } });
    expect((await res.json()).headerErrors[0]).toMatch(/Unknown column/);
  });

  it('imports good rows as unverified, rejects bad rows with reasons, writes nothing for bad rows', async () => {
    const good = `import-${tag}-good`;
    const bad = `import-${tag}-bad`;
    const csv = toCsv([[...CSV_COLUMNS], row({ slug: good }), row({ slug: bad, eligibility_rules: '[{"field":"nope","op":"eq","value":1,"kind":"eligibility"}]' })]);
    const res = await callFunction('csv-import', { token: adminToken, body: { csv, mode: 'commit' } });
    const report = await res.json();
    expect(report.imported).toEqual([good]);
    expect(report.rejected).toHaveLength(1);
    expect(report.rejected[0].errors[0]).toMatch(/unknown field "nope"/);
    const db = adminClient();
    const { data } = await db.from('opportunities').select('slug, verification_status').in('slug', [good, bad]);
    expect(data).toEqual([{ slug: good, verification_status: 'unverified' }]);
    const notes = await db.from('opportunity_research_notes').select('notes, opportunities!inner(slug)').eq('opportunities.slug', good);
    expect(notes.data?.[0].notes).toBe('private note');
  });

  it('shows a diff for an existing slug and only overwrites when asked, resetting verification', async () => {
    const slug = `import-${tag}-diff`;
    const first = toCsv([[...CSV_COLUMNS], row({ slug, name: 'EXAMPLE: Before' })]);
    await callFunction('csv-import', { token: adminToken, body: { csv: first, mode: 'commit' } });
    const db = adminClient();
    await db.from('opportunities').update({ verification_status: 'verified', last_verified_at: new Date().toISOString() }).eq('slug', slug);

    const second = toCsv([[...CSV_COLUMNS], row({ slug, name: 'EXAMPLE: After' })]);
    const preview = await (await callFunction('csv-import', { token: adminToken, body: { csv: second, mode: 'preview' } })).json();
    expect(preview.rows[0].exists).toBe(true);
    expect(preview.rows[0].diff).toEqual([{ field: 'name', from: 'EXAMPLE: Before', to: 'EXAMPLE: After' }]);

    const skipped = await (await callFunction('csv-import', { token: adminToken, body: { csv: second, mode: 'commit' } })).json();
    expect(skipped.skipped).toEqual([slug]);
    expect((await db.from('opportunities').select('name').eq('slug', slug).single()).data?.name).toBe('EXAMPLE: Before');

    const updated = await (await callFunction('csv-import', { token: adminToken, body: { csv: second, mode: 'commit', overwrite: [slug] } })).json();
    expect(updated.updated).toEqual([slug]);
    const after = (await db.from('opportunities').select('name, verification_status, last_verified_at').eq('slug', slug).single()).data;
    expect(after).toEqual({ name: 'EXAMPLE: After', verification_status: 'unverified', last_verified_at: null });
  });
});
