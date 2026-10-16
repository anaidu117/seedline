// Public submissions (Turnstile + rate limit) and organizer claims.
import { describe, expect, it } from 'vitest';
import { adminClient, callFunction, insertOpportunity, signedInUser, tokenOf } from '../helpers/local.ts';

// Cloudflare's always-pass test secret (in supabase/functions/.env) accepts this dummy token.
const TEST_TURNSTILE = 'XXXX.DUMMY.TOKEN.XXXX';
const good = () => ({ name: `EXAMPLE: Submitted ${Date.now()}`, organizer: 'EXAMPLE org', url: 'https://example.com/p', email: 'sub@example.com', turnstileToken: TEST_TURNSTILE });

describe('submit-opportunity', () => {
  it('rejects a submission without a passing bot check', async () => {
    const res = await callFunction('submit-opportunity', { body: { ...good(), turnstileToken: '' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/bot check/);
  });

  it('accepts a valid submission into the admin queue only, never the listings', async () => {
    const body = good();
    const res = await callFunction('submit-opportunity', { body });
    expect(res.status, await res.clone().text()).toBe(200);
    const db = adminClient();
    const { data } = await db.from('submissions').select('status, payload').eq('payload->>name', body.name).single();
    expect(data?.status).toBe('pending');
    const { data: opp } = await db.from('opportunities').select('id').eq('name', body.name);
    expect(opp).toEqual([]);
  });

  it('rejects missing fields with plain reasons', async () => {
    const res = await callFunction('submit-opportunity', { body: { turnstileToken: TEST_TURNSTILE, url: 'nope' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/program name/);
  });

  it('rate-limits to 5 per hour from one address', async () => {
    // Earlier tests in this file already used some of the budget for this address.
    let last = 200;
    for (let i = 0; i < 6 && last !== 429; i++) last = (await callFunction('submit-opportunity', { body: good() })).status;
    expect(last).toBe(429);
  });
});

describe('claim-listing', () => {
  it('requires sign-in', async () => {
    expect((await callFunction('claim-listing', { body: { slug: 'x', organization: 'o', role_title: 'r' } })).status).toBe(401);
  });

  it('queues a claim, refuses a duplicate, and approval grants edit rights to that listing only', async () => {
    const opp = await insertOpportunity({ name: 'EXAMPLE: Claim me' });
    const org = await signedInUser('claimer');
    const token = await tokenOf(org.client);
    const body = { slug: opp.slug, organization: 'EXAMPLE org', role_title: 'Director' };
    expect((await callFunction('claim-listing', { token, body })).status).toBe(200);
    expect((await callFunction('claim-listing', { token, body })).status).toBe(409);

    await org.client.from('opportunities').update({ description: 'Before approval' }).eq('id', opp.id);
    const db = adminClient();
    expect((await db.from('opportunities').select('description').eq('id', opp.id).single()).data?.description).not.toBe('Before approval');

    await db.from('opportunity_claims').update({ status: 'approved' }).eq('opportunity_id', opp.id).eq('user_id', org.id);
    expect((await db.from('opportunities').select('verification_status').eq('id', opp.id).single()).data?.verification_status).toBe('organizer_verified');
    const { error } = await org.client.from('opportunities').update({ description: 'After approval' }).eq('id', opp.id);
    expect(error).toBeNull();
    expect((await db.from('opportunities').select('description').eq('id', opp.id).single()).data?.description).toBe('After approval');
  });

  it('refuses claims on unverified listings', async () => {
    const opp = await insertOpportunity({ verification_status: 'unverified' });
    const u = await signedInUser('claimer2');
    expect((await callFunction('claim-listing', { token: await tokenOf(u.client), body: { slug: opp.slug, organization: 'o', role_title: 'r' } })).status).toBe(404);
  });
});
