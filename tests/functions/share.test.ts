// Share links (spec 7.11): password or invited email, rate limit, revoke, expiry, and nothing private leaks.
import { beforeAll, describe, expect, it } from 'vitest';
import { adminClient, callFunction, insertOpportunity, signedInUser, tokenOf, withDb } from '../helpers/local.ts';

let owner: Awaited<ReturnType<typeof signedInUser>>;
let ownerToken: string;

async function createWithId(body: Record<string, unknown>): Promise<{ token: string; id: string }> {
  const res = await callFunction('share-create', { token: ownerToken, body });
  const json = await res.json();
  expect(res.status, JSON.stringify(json)).toBe(200);
  return { token: (json.url as string).split('/share/')[1], id: json.id };
}
const create = async (body: Record<string, unknown>) => (await createWithId(body)).token;
const open = (token: string, password?: string, as?: string) => callFunction('share-open', { token: as, body: { token, password } });

beforeAll(async () => {
  owner = await signedInUser('share-owner');
  ownerToken = await tokenOf(owner.client);
  await adminClient().from('profiles').insert({ user_id: owner.id, school: 'unc', student_status: 'grad', state: 'NC', stage: 'prototype', sector: 'software', incorporated: false });
  await owner.client.from('profile_founder_groups').insert({ user_id: owner.id, groups: ['veteran'] });
  await insertOpportunity({ name: 'EXAMPLE: Share visible', opens_at: '2026-01-01', deadline_at: '2099-01-01', amount_max: 1000 });
  await insertOpportunity({ name: 'EXAMPLE: Veterans only', opens_at: '2026-01-01', deadline_at: '2099-01-01', amount_max: 5000, target_groups: ['veteran'] });
});

describe('password share links', () => {
  let token: string;
  beforeAll(async () => { token = await create({ mode: 'password', password: 'correct horse', expiresInDays: 30 }); });

  it('ask for the password first', async () => {
    const res = await open(token);
    expect(res.status).toBe(401);
    expect((await res.json()).needs).toBe('password');
  });

  it('reject a wrong password', async () => {
    const res = await open(token, 'wrong password');
    expect(res.status).toBe(401);
  });

  it('open with the right password, without founder groups or targeted programs', async () => {
    const res = await open(token, 'correct horse');
    expect(res.status).toBe(200);
    const body = await res.json();
    const text = JSON.stringify(body);
    expect(text).toContain('EXAMPLE: Share visible');
    expect(text).not.toContain('Veterans only');
    expect(text).not.toMatch(/veteran|founder_groups|target_groups|materials|storage_path|research_notes/i);
    // Each shared listing carries its past results fields and a founders-like-you value (null below 10 reports).
    for (const m of [...body.apply_now, ...body.coming_up, ...body.not_ready, ...body.needs_info]) {
      expect(m).toHaveProperty('past_results_text');
      expect(m).toHaveProperty('fly', null);
      expect(m.source_url).toBeTruthy();
    }
  });

  it('allow 5 attempts per 15 minutes, then block', async () => {
    const t = await create({ mode: 'password', password: 'another secret', expiresInDays: 7 });
    for (let i = 0; i < 5; i++) expect((await open(t, `guess ${i}`)).status).toBe(401);
    const sixth = await open(t, 'another secret');
    expect(sixth.status).toBe(429);
  });

  it('stop working when the founder turns them off', async () => {
    const { token: t, id } = await createWithId({ mode: 'password', password: 'revoke me please' });
    expect((await open(t, 'revoke me please')).status).toBe(200);
    // The same update the "Turn off" button makes, as the founder.
    const { error } = await owner.client.from('share_links').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    expect(error).toBeNull();
    expect((await open(t, 'revoke me please')).status).toBe(404);
  });

  it('stop working after they expire', async () => {
    const { token: t, id } = await createWithId({ mode: 'password', password: 'expire me please', expiresInDays: 1 });
    await withDb((db) => db.query(`update public.share_links set expires_at = now() - interval '1 minute' where id = $1`, [id]));
    expect((await open(t, 'expire me please')).status).toBe(410);
  });
});

describe('invite share links', () => {
  let token: string;
  let invited: Awaited<ReturnType<typeof signedInUser>>;
  beforeAll(async () => {
    invited = await signedInUser('share-invited');
    token = await create({ mode: 'invite', emails: [invited.email] });
  });

  it('ask anonymous viewers to sign in', async () => {
    const res = await open(token);
    expect(res.status).toBe(401);
    expect((await res.json()).needs).toBe('signin');
  });

  it('refuse a signed-in viewer who was not invited', async () => {
    const stranger = await signedInUser('share-stranger');
    expect((await open(token, undefined, await tokenOf(stranger.client))).status).toBe(403);
  });

  it('open for an invited viewer', async () => {
    const res = await open(token, undefined, await tokenOf(invited.client));
    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).toContain('EXAMPLE: Share visible');
  });
});

describe('share link storage', () => {
  it('stores only hashes, and founders cannot write the password hash directly', async () => {
    const { data } = await adminClient().from('share_links').select('token_hash, password_hash').eq('user_id', owner.id).eq('mode', 'password').limit(1).single();
    expect(data!.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(data!.password_hash).toMatch(/^pbkdf2\$/);
    const { error } = await owner.client.from('share_links').update({ password_hash: 'x' }).eq('user_id', owner.id);
    expect(error).not.toBeNull();
  });

  it('rejects short passwords and bad emails', async () => {
    expect((await callFunction('share-create', { token: ownerToken, body: { mode: 'password', password: 'short' } })).status).toBe(400);
    expect((await callFunction('share-create', { token: ownerToken, body: { mode: 'invite', emails: ['not-an-email'] } })).status).toBe(400);
  });
});
