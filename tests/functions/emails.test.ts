// Emails, check-ins, unsubscribe and the calendar feed, against local functions and the Mailpit inbox.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, todayEastern } from '../../shared/dates.ts';
import { signToken } from '../../shared/signedToken.ts';
import { adminClient, callFunction, insertOpportunity, localEnv, signedInUser } from '../helpers/local.ts';

const fnEnv = Object.fromEntries(readFileSync('supabase/functions/.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const MAILPIT = 'http://127.0.0.1:54324';
const today = todayEastern();

async function cron(name: string) {
  const res = await fetch(`${localEnv().API_URL}/functions/v1/${name}`, { method: 'POST', headers: { 'x-cron-secret': fnEnv.CRON_SECRET, 'content-type': 'application/json' }, body: '{}' });
  expect(res.status, await res.clone().text()).toBe(200);
  return res.json();
}

async function inbox(to: string): Promise<{ ID: string; Subject: string }[]> {
  const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
  return (await res.json()).messages ?? [];
}

async function message(id: string): Promise<{ HTML: string; Text: string; headers: Record<string, string[]> }> {
  const m = await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json();
  const headers = await (await fetch(`${MAILPIT}/api/v1/message/${id}/headers`)).json();
  return { ...m, headers };
}

function links(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
}

function tokenFrom(url: string): string {
  return new URL(url).searchParams.get('t')!;
}

let founder: Awaited<ReturnType<typeof signedInUser>>;

beforeAll(async () => {
  founder = await signedInUser('emails');
  const db = adminClient();
  await db.from('profiles').insert({ user_id: founder.id, school: 'unc', student_status: 'grad', state: 'NC', stage: 'prototype', sector: 'health_biotech', incorporated: false });
});

describe('scheduled email functions', () => {
  it('refuse calls without the cron secret', async () => {
    for (const name of ['send-digest', 'send-reminders', 'send-checkins']) {
      const res = await fetch(`${localEnv().API_URL}/functions/v1/${name}`, { method: 'POST', body: '{}' });
      expect(res.status).toBe(403);
    }
  });
});

describe('check-in links', () => {
  let opp: { id: string; slug: string };
  let appId: string;
  let yes: string;
  let no: string;

  beforeAll(async () => {
    opp = await insertOpportunity({ name: 'EXAMPLE: Check-in test', opens_at: addDays(today, -40), deadline_at: addDays(today, -5), decision_at: addDays(today, -1) });
    const { data } = await founder.client.from('applications').insert({ user_id: founder.id, opportunity_id: opp.id, status: 'planning' }).select('id').single();
    appId = data!.id;
    await cron('send-checkins');
    const msgs = (await inbox(founder.email)).filter((m) => m.Subject === 'Did you apply to EXAMPLE: Check-in test?');
    expect(msgs).toHaveLength(1);
    const m = await message(msgs[0].ID);
    const checkins = links(m.HTML).filter((l) => l.includes('/checkin?t='));
    expect(checkins).toHaveLength(2);
    [yes, no] = checkins.map(tokenFrom);
    expect(m.headers['List-Unsubscribe']?.[0]).toMatch(/\/unsubscribe\?t=/);
    expect(m.HTML).not.toContain('—');
  });

  it('are not sent twice for the same deadline', async () => {
    await cron('send-checkins');
    expect((await inbox(founder.email)).filter((m) => m.Subject === 'Did you apply to EXAMPLE: Check-in test?')).toHaveLength(1);
  });

  it('update the application once, without signing in', async () => {
    const res = await callFunction('checkin', { body: { token: yes } });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('applied');
    const { data } = await adminClient().from('applications').select('status').eq('id', appId).single();
    expect(data?.status).toBe('applied');
  });

  it('reject the same link when reused', async () => {
    const res = await callFunction('checkin', { body: { token: yes } });
    expect(res.status).toBe(409);
  });

  it('reject the other button from the same email after one was used', async () => {
    const res = await callFunction('checkin', { body: { token: no } });
    expect(res.status).toBe(409);
    const { data } = await adminClient().from('applications').select('status').eq('id', appId).single();
    expect(data?.status).toBe('applied');
  });

  it('reject an expired link', async () => {
    const { data: t } = await adminClient().from('checkin_tokens').insert({ application_id: appId, expires_at: new Date(Date.now() + 3600_000).toISOString() }).select('jti').single();
    const expired = await signToken({ jti: t!.jti, app: appId, act: 'won', exp: Math.floor(Date.now() / 1000) - 10 }, fnEnv.CHECKIN_SIGNING_SECRET);
    const res = await callFunction('checkin', { body: { token: expired } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/expired/);
  });

  it('reject a link whose database row has expired even if the signature is still valid', async () => {
    const { data: t } = await adminClient().from('checkin_tokens').insert({ application_id: appId, expires_at: new Date(Date.now() - 1000).toISOString() }).select('jti').single();
    const tok = await signToken({ jti: t!.jti, app: appId, act: 'won', exp: Math.floor(Date.now() / 1000) + 3600 }, fnEnv.CHECKIN_SIGNING_SECRET);
    expect((await callFunction('checkin', { body: { token: tok } })).status).toBe(409);
  });

  it('reject a forged link', async () => {
    const forged = await signToken({ jti: crypto.randomUUID(), app: appId, act: 'won', exp: Math.floor(Date.now() / 1000) + 3600 }, 'z'.repeat(64));
    expect((await callFunction('checkin', { body: { token: forged } })).status).toBe(400);
  });

  it('ask "How did it go?" after the decision date, and a win offers an optional amount', async () => {
    await cron('send-checkins');
    const msgs = (await inbox(founder.email)).filter((m) => m.Subject === 'How did EXAMPLE: Check-in test go?');
    expect(msgs).toHaveLength(1);
    const won = links((await message(msgs[0].ID)).HTML).find((l) => l.includes('/checkin?t='))!;
    const body = await (await callFunction('checkin', { body: { token: tokenFrom(won) } })).json();
    expect(body.status).toBe('won');
    expect(body.amountToken).toBeTruthy();
    const amount = await callFunction('checkin', { body: { token: body.amountToken, amount: 2500 } });
    expect(amount.status).toBe(200);
    const { data } = await adminClient().from('applications').select('status, amount_won').eq('id', appId).single();
    expect(data).toEqual({ status: 'won', amount_won: 2500 });
    expect((await callFunction('checkin', { body: { token: body.amountToken, amount: 9999 } })).status).toBe(409);
  });
});

describe('reminders', () => {
  it('send once at 14 days and once at 3 days before a saved deadline', async () => {
    const opp = await insertOpportunity({ name: 'EXAMPLE: Reminder test', opens_at: addDays(today, -10), deadline_at: addDays(today, 10) });
    await founder.client.from('applications').insert({ user_id: founder.id, opportunity_id: opp.id, status: 'planning' });
    await cron('send-reminders');
    await cron('send-reminders');
    const msgs = (await inbox(founder.email)).filter((m) => m.Subject === 'Reminder: EXAMPLE: Reminder test closes in 10 days');
    expect(msgs).toHaveLength(1);
    // Move the deadline inside 3 days: one more reminder, then nothing.
    await adminClient().from('opportunities').update({ deadline_at: addDays(today, 2) }).eq('id', opp.id);
    await cron('send-reminders');
    await cron('send-reminders');
    expect((await inbox(founder.email)).filter((m) => m.Subject === 'Reminder: EXAMPLE: Reminder test closes in 2 days')).toHaveLength(1);
  });
});

describe('weekly digest', () => {
  const digests = async () => (await inbox(founder.email)).filter((m) => m.Subject === 'Your Seedline plan: what changed this week');

  it('sends only when something changed, and nothing when nothing did', async () => {
    const db = adminClient();
    // Clear earlier digest state for a clean baseline.
    await db.from('digest_snapshots').delete().eq('user_id', founder.id);
    await db.from('email_log').delete().eq('user_id', founder.id).eq('kind', 'digest');
    const before = (await digests()).length;

    await cron('send-digest');
    const afterFirst = (await digests()).length;
    // First run: the 2-day reminder test deadline is eligible and within 3 days, so that counts as a change.
    expect(afterFirst).toBe(before + 1);

    await db.from('email_log').delete().eq('user_id', founder.id).eq('kind', 'digest').like('ref', 'week:%');
    await cron('send-digest');
    expect((await digests()).length).toBe(afterFirst);

    await insertOpportunity({ name: 'EXAMPLE: New digest match', opens_at: addDays(today, -1), deadline_at: addDays(today, 60), amount_max: 3000 });
    await db.from('email_log').delete().eq('user_id', founder.id).eq('kind', 'digest').like('ref', 'week:%');
    await cron('send-digest');
    const all = await digests();
    expect(all.length).toBe(afterFirst + 1);
    const latest = await message(all[0].ID);
    expect(latest.Text).toContain('New matches');
    expect(latest.Text).toContain('EXAMPLE: New digest match');
  });
});

describe('unsubscribe', () => {
  it('turns off that email type with one click and the digest stops', async () => {
    const msgs = (await inbox(founder.email)).filter((m) => m.Subject === 'Your Seedline plan: what changed this week');
    const m = await message(msgs[0].ID);
    const url = m.headers['List-Unsubscribe'][0].replace(/^<|>$/g, '');
    // RFC 8058 one-click: the mail client POSTs to the function with the token.
    const res = await fetch(`${localEnv().API_URL}/functions/v1/unsubscribe?t=${encodeURIComponent(tokenFrom(url))}`, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click',
    });
    expect(res.status).toBe(200);
    const { data } = await adminClient().from('profiles').select('email_digest, email_reminders').eq('user_id', founder.id).single();
    expect(data).toEqual({ email_digest: false, email_reminders: true });
  });

  it('rejects a forged unsubscribe link', async () => {
    const forged = await signToken({ uid: founder.id, kind: 'all', purpose: 'unsubscribe', exp: 0 }, 'q'.repeat(64));
    expect((await callFunction('unsubscribe', { body: { token: forged } })).status).toBe(400);
  });
});

describe('private calendar feed', () => {
  it('serves the founder deadlines for the right token only', async () => {
    const { data: token } = await founder.client.rpc('rotate_calendar_token');
    const res = await fetch(`${localEnv().API_URL}/functions/v1/calendar-feed?token=${token}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/calendar');
    const ics = await res.text();
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Deadline: EXAMPLE: New digest match');
    expect((await fetch(`${localEnv().API_URL}/functions/v1/calendar-feed?token=${'0'.repeat(48)}`)).status).toBe(404);
    // Rotating the token turns the old link off.
    await founder.client.rpc('rotate_calendar_token');
    expect((await fetch(`${localEnv().API_URL}/functions/v1/calendar-feed?token=${token}`)).status).toBe(404);
  });
});
