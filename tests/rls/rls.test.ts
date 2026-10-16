// RLS tests from spec section 12, run against the local Supabase stack with real signed-in clients.
import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient, anonClient, insertOpportunity, signedInUser, withDb } from '../helpers/local.ts';

type User = { client: SupabaseClient; id: string; email: string };

let a: User;
let b: User;
let oppVerified: { id: string; slug: string };
let oppUnverified: { id: string; slug: string };
let oppOther: { id: string; slug: string };

beforeAll(async () => {
  a = await signedInUser('founder-a');
  b = await signedInUser('founder-b');
  oppVerified = await insertOpportunity();
  oppUnverified = await insertOpportunity({ verification_status: 'unverified' });
  oppOther = await insertOpportunity();

  // Founder B's private data, written by B through the API.
  const bc = b.client;
  expect((await bc.from('profiles').insert({ user_id: b.id, school: 'duke', stage: 'idea', sector: 'software' })).error).toBeNull();
  expect((await bc.from('profile_founder_groups').insert({ user_id: b.id, groups: ['veteran'] })).error).toBeNull();
  expect((await bc.from('answers').insert({ user_id: b.id, answer_key: 'problem', length: 'short', body: 'B private answer' })).error).toBeNull();
  expect((await bc.from('materials').insert({ user_id: b.id, material_key: 'pitch_deck', kind: 'link', url: 'https://example.com/deck' })).error).toBeNull();
  expect((await bc.from('applications').insert({ user_id: b.id, opportunity_id: oppVerified.id, status: 'planning' })).error).toBeNull();
  expect((await bc.from('drafts').insert({ user_id: b.id, opportunity_id: oppVerified.id, question_index: 0, body: 'B draft' })).error).toBeNull();
  expect((await bc.from('plan_snapshots').insert({ user_id: b.id, statuses: { x: 'eligible' } })).error).toBeNull();
  expect((await bc.storage.from('materials').upload(`${b.id}/pitch_deck/deck.txt`, new Blob(['secret deck']), { contentType: 'text/plain' })).error).toBeNull();
  await withDb((db) => db.query(
    `insert into public.share_links (user_id, token_hash, mode) values ($1, $2, 'invite')`, [b.id, `hash-${b.id}`],
  ));
});

describe('founder A cannot read or change founder B data', () => {
  const tables = ['profiles', 'profile_founder_groups', 'answers', 'materials', 'applications', 'drafts', 'plan_snapshots', 'share_links'];
  for (const table of tables) {
    it(`cannot read B's ${table}`, async () => {
      const { data, error } = await a.client.from(table).select('*').eq('user_id', b.id);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  }

  it('B can read their own rows (so the empty results above are RLS, not missing data)', async () => {
    for (const table of tables) {
      const { data } = await b.client.from(table).select('*').eq('user_id', b.id);
      expect(data?.length, table).toBeGreaterThan(0);
    }
  });

  it("cannot update B's profile", async () => {
    await a.client.from('profiles').update({ school: 'unc' }).eq('user_id', b.id);
    const { data } = await b.client.from('profiles').select('school').eq('user_id', b.id).single();
    expect(data?.school).toBe('duke');
  });

  it('cannot insert rows owned by B', async () => {
    const { error } = await a.client.from('answers').insert({ user_id: b.id, answer_key: 'team', length: 'short', body: 'x' });
    expect(error).not.toBeNull();
  });

  it("cannot download B's material file", async () => {
    const { data, error } = await a.client.storage.from('materials').download(`${b.id}/pitch_deck/deck.txt`);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("cannot upload into B's folder", async () => {
    const { error } = await a.client.storage.from('materials').upload(`${b.id}/budget/x.txt`, new Blob(['x']));
    expect(error).not.toBeNull();
  });

  it('cannot write the outcome snapshot columns directly', async () => {
    const { error } = await b.client.from('applications').update({ stage_at_application: 'revenue' }).eq('user_id', b.id);
    expect(error).not.toBeNull();
  });
});

describe('anonymous users', () => {
  const anon = anonClient();
  for (const table of ['profiles', 'profile_founder_groups', 'answers', 'materials', 'applications', 'drafts', 'share_links', 'share_invites']) {
    it(`cannot read ${table}`, async () => {
      const { data } = await anon.from(table).select('*');
      expect(data ?? []).toEqual([]);
    });
  }

  it('can read verified opportunities but never unverified ones', async () => {
    const { data } = await anon.from('opportunities').select('id').in('id', [oppVerified.id, oppUnverified.id]);
    expect(data?.map((r) => r.id)).toEqual([oppVerified.id]);
  });

  it('cannot create opportunities', async () => {
    const { error } = await anon.from('opportunities').insert({ slug: 'anon-x', name: 'x', organizer: 'x', type: 'fellowship', geography_level: 'national', deadline_type: 'rolling', source_url: 'https://example.com' });
    expect(error).not.toBeNull();
  });

  it('can record an anonymous event but not one claiming a user', async () => {
    expect((await anon.from('events').insert({ name: 'intake_started', anon_id: 'abcdef123456' })).error).toBeNull();
    expect((await anon.from('events').insert({ name: 'intake_started', user_id: b.id })).error).not.toBeNull();
  });

  it('cannot read events', async () => {
    const { data } = await anon.from('events').select('*');
    expect(data ?? []).toEqual([]);
  });
});

describe('non-admins cannot reach admin data', () => {
  it('is_admin() is false for a founder', async () => {
    const { data } = await a.client.rpc('is_admin');
    expect(data).toBe(false);
  });

  for (const table of ['admins', 'opportunity_research_notes', 'submissions', 'events', 'checkin_tokens', 'email_log', 'rate_limits']) {
    it(`founder cannot read ${table}`, async () => {
      await withDb((db) => db.query(`insert into public.submissions (submitter_email, payload) values ('s@example.com', '{}')`));
      await withDb((db) => db.query(`insert into public.opportunity_research_notes (opportunity_id, notes) values ($1, 'private') on conflict do nothing`, [oppVerified.id]));
      const { data } = await a.client.from(table).select('*');
      expect(data ?? []).toEqual([]);
    });
  }

  it('founder cannot see unverified opportunities', async () => {
    const { data } = await a.client.from('opportunities').select('id').eq('id', oppUnverified.id);
    expect(data).toEqual([]);
  });

  it('founder cannot edit or verify an opportunity', async () => {
    await a.client.from('opportunities').update({ name: 'Hacked' }).eq('id', oppVerified.id);
    await a.client.from('opportunities').update({ verification_status: 'verified' }).eq('id', oppUnverified.id);
    const { data } = await adminClient().from('opportunities').select('id, name, verification_status').in('id', [oppVerified.id, oppUnverified.id]);
    const byId = Object.fromEntries((data ?? []).map((r) => [r.id, r]));
    expect(byId[oppVerified.id].name).not.toBe('Hacked');
    expect(byId[oppUnverified.id].verification_status).toBe('unverified');
  });

  it('an admin can read unverified opportunities, research notes and events', async () => {
    const admin = await signedInUser('admin');
    await withDb((db) => db.query('insert into public.admins (email) values ($1)', [admin.email]));
    expect((await admin.client.rpc('is_admin')).data).toBe(true);
    expect((await admin.client.from('opportunities').select('id').eq('id', oppUnverified.id)).data).toHaveLength(1);
    expect((await admin.client.from('opportunity_research_notes').select('notes').eq('opportunity_id', oppVerified.id)).data).toHaveLength(1);
    expect((await admin.client.from('events').select('id').limit(1)).data?.length).toBe(1);
  });

  it('an admin still cannot read founder profiles or founder groups', async () => {
    const admin = await signedInUser('admin2');
    await withDb((db) => db.query('insert into public.admins (email) values ($1)', [admin.email]));
    expect((await admin.client.from('profiles').select('*').eq('user_id', b.id)).data).toEqual([]);
    expect((await admin.client.from('profile_founder_groups').select('*').eq('user_id', b.id)).data).toEqual([]);
  });
});

describe('organizers edit only listings they were approved for', () => {
  let org: User;

  beforeAll(async () => {
    org = await signedInUser('organizer');
    await withDb((db) => db.query(
      `insert into public.opportunity_claims (opportunity_id, user_id, claimant_email, organization, role_title, status)
       values ($1, $2, $3, 'Org', 'Director', 'approved')`, [oppVerified.id, org.id, org.email],
    ));
  });

  it('can edit their own listing, which becomes organizer verified and flagged for review', async () => {
    const { error } = await org.client.from('opportunities').update({ description: 'Updated by organizer' }).eq('id', oppVerified.id);
    expect(error).toBeNull();
    const { data } = await adminClient().from('opportunities').select('description, verification_status, organizer_edited_at').eq('id', oppVerified.id).single();
    expect(data?.description).toBe('Updated by organizer');
    expect(data?.verification_status).toBe('organizer_verified');
    expect(data?.organizer_edited_at).not.toBeNull();
  });

  it('cannot edit another listing', async () => {
    await org.client.from('opportunities').update({ description: 'Not mine' }).eq('id', oppOther.id);
    const { data } = await adminClient().from('opportunities').select('description').eq('id', oppOther.id).single();
    expect(data?.description).not.toBe('Not mine');
  });

  it('cannot change verification fields or the slug of their own listing', async () => {
    const r1 = await org.client.from('opportunities').update({ verification_status: 'verified' }).eq('id', oppVerified.id);
    const r2 = await org.client.from('opportunities').update({ slug: 'new-slug' }).eq('id', oppVerified.id);
    expect(r1.error).not.toBeNull();
    expect(r2.error).not.toBeNull();
  });

  it('a pending claim gives no edit rights', async () => {
    const pending = await signedInUser('pending-organizer');
    await withDb((db) => db.query(
      `insert into public.opportunity_claims (opportunity_id, user_id, claimant_email, organization, role_title)
       values ($1, $2, $3, 'Org', 'Director')`, [oppOther.id, pending.id, pending.email],
    ));
    await pending.client.from('opportunities').update({ description: 'Pending edit' }).eq('id', oppOther.id);
    const { data } = await adminClient().from('opportunities').select('description').eq('id', oppOther.id).single();
    expect(data?.description).not.toBe('Pending edit');
  });
});

describe('founders like you threshold in the database', () => {
  it('returns nothing at 9 reports and the counts at 10', async () => {
    const opp = await insertOpportunity();
    const ids: string[] = [];
    await withDb(async (db) => {
      for (let i = 0; i < 10; i++) {
        const u = await db.query<{ id: string }>(
          `insert into auth.users (id, email, aud, role) values (gen_random_uuid(), $1, 'authenticated', 'authenticated') returning id`,
          [`fly-${Date.now()}-${i}@test.seedline.local`],
        );
        ids.push(u.rows[0].id);
        await db.query(`insert into public.profiles (user_id, stage, sector) values ($1, 'prototype', 'software')`, [u.rows[0].id]);
      }
      for (let i = 0; i < 9; i++) {
        await db.query(`insert into public.applications (user_id, opportunity_id, status) values ($1, $2, $3)`, [ids[i], opp.id, i < 3 ? 'won' : 'not_selected']);
      }
    });
    const nine = await a.client.rpc('founders_like_you', { opp: opp.id, p_stage: 'prototype', p_sector: 'software' });
    expect(nine.error).toBeNull();
    expect(nine.data).toEqual([]);
    await withDb((db) => db.query(`insert into public.applications (user_id, opportunity_id, status) values ($1, $2, 'won')`, [ids[9], opp.id]));
    const ten = await a.client.rpc('founders_like_you', { opp: opp.id, p_stage: 'prototype', p_sector: 'software' });
    expect(ten.data).toEqual([{ reported: 10, won: 4 }]);
    const many = await a.client.rpc('founders_like_you_many', { opps: [opp.id, oppVerified.id], p_stage: 'prototype', p_sector: 'software' });
    expect(many.data).toEqual([{ opportunity_id: opp.id, reported: 10, won: 4 }]);
  });

  it('batched version returns nothing at 9 reports', async () => {
    const opp = await insertOpportunity();
    await withDb(async (db) => {
      for (let i = 0; i < 9; i++) {
        const u = await db.query<{ id: string }>(`insert into auth.users (id, email, aud, role) values (gen_random_uuid(), $1, 'authenticated', 'authenticated') returning id`, [`flym-${Date.now()}-${i}@test.seedline.local`]);
        await db.query(`insert into public.profiles (user_id, stage, sector) values ($1, 'idea', 'fintech')`, [u.rows[0].id]);
        await db.query(`insert into public.applications (user_id, opportunity_id, status) values ($1, $2, 'won')`, [u.rows[0].id, opp.id]);
      }
    });
    const r = await a.client.rpc('founders_like_you_many', { opps: [opp.id], p_stage: 'idea', p_sector: 'fintech' });
    expect(r.error).toBeNull();
    expect(r.data).toEqual([]);
    expect((await anonClient().rpc('founders_like_you_many', { opps: [opp.id], p_stage: 'idea', p_sector: 'fintech' })).error).not.toBeNull();
  });

  it('is not callable anonymously', async () => {
    const { error } = await anonClient().rpc('founders_like_you', { opp: oppVerified.id, p_stage: 'idea', p_sector: 'software' });
    expect(error).not.toBeNull();
  });
});
