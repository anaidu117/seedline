// The metrics function returns aggregates that match direct counts, and only to admins.
import { describe, expect, it } from 'vitest';
import { anonClient, signedInAdmin, signedInUser, withDb } from '../helpers/local.ts';

describe('admin_metrics', () => {
  it('refuses non-admins and anonymous callers', async () => {
    const u = await signedInUser('metrics-founder');
    expect((await u.client.rpc('admin_metrics', { p_from: '2000-01-01', p_to: '2100-01-01' })).error).not.toBeNull();
    expect((await anonClient().rpc('admin_metrics', { p_from: '2000-01-01', p_to: '2100-01-01' })).error).not.toBeNull();
  });

  it('matches direct SQL counts over the same range', async () => {
    const admin = await signedInAdmin('metrics-admin');
    const range = { p_from: '2000-01-01', p_to: '2100-01-01' };
    const { data: m, error } = await admin.client.rpc('admin_metrics', range);
    expect(error).toBeNull();
    const direct = await withDb(async (db) => {
      const one = async (sql: string) => Number((await db.query(sql)).rows[0].n);
      return {
        intake: await one(`select count(distinct anon_id) n from events where name = 'intake_started' and anon_id is not null`),
        accounts: await one(`select count(distinct user_id) n from events where name = 'account_created'`),
        plans: await one(`select count(*) n from events where name = 'plan_generated'`),
        won: await one(`select count(*) n from applications where status = 'won'`),
        dollars: await one(`select coalesce(sum(amount_won), 0) n from applications where status = 'won'`),
        shares: await one(`select count(*) n from events where name = 'share_created'`),
        reported: await one(`select count(*) n from applications where status in ('won','not_selected')`),
      };
    });
    expect(m.funnel.intake_started_visitors).toBe(direct.intake);
    expect(m.funnel.accounts_created).toBe(direct.accounts);
    expect(m.funnel.plans_generated).toBe(direct.plans);
    expect(m.won_total).toBe(direct.won);
    expect(Number(m.dollars_won)).toBe(direct.dollars);
    expect(m.shares.created).toBe(direct.shares);
    expect(m.outcomes_reported).toBe(direct.reported);
  });

  it('never includes founder groups or individual rows', async () => {
    const admin = await signedInAdmin('metrics-admin2');
    const { data } = await admin.client.rpc('admin_metrics', { p_from: '2000-01-01', p_to: '2100-01-01' });
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/veteran|woman_founder|founder_group|@|user_id/);
  });
});
