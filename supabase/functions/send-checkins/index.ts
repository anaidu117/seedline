// One-click outcome check-ins (spec 7.9).
//  - 3 days after a saved deadline, still "planning": "Did you apply to X?" Yes / No.
//  - After decision_at, "applied" or "waiting": "How did it go?" Won / Not selected / Still waiting.
// Every button is a signed, single-use, expiring link. All buttons in one email share one token row,
// so the first click wins and the rest are rejected.
import { addDays, todayEastern } from '../../../shared/dates.ts';
import { CHECKIN_LINK_DAYS, signToken, type CheckinAction } from '../../../shared/signedToken.ts';
import { json, serviceClient } from '../_shared/http.ts';
import { claimSend, emailOf, isCron, releaseSend, SITE_URL, toOpportunity, unsubscribeUrl } from '../_shared/founders.ts';
import { render } from '../_shared/templates.ts';
import { sendEmail } from '../_shared/email.ts';

export const DAYS_AFTER_DEADLINE = 3;

Deno.serve(async (req) => {
  if (!isCron(req)) return json(req, { error: 'Not allowed.' }, 403);
  const db = serviceClient();
  const today = todayEastern();
  const secret = Deno.env.get('CHECKIN_SIGNING_SECRET')!;
  const { data: apps, error } = await db.from('applications')
    .select('id, user_id, status, opportunity:opportunities(*)')
    .in('status', ['planning', 'applied', 'waiting']);
  if (error) return json(req, { error: error.message }, 500);
  const { data: optedIn, error: pErr } = await db.from('profiles').select('user_id').eq('email_checkins', true);
  if (pErr) return json(req, { error: pErr.message }, 500);
  const allowed = new Set((optedIn ?? []).map((p) => p.user_id as string));
  const report = { checked: 0, sent: 0, failed: 0 };

  for (const a of apps ?? []) {
    if (!allowed.has(a.user_id)) continue;
    report.checked++;
    const row = a.opportunity as unknown as Record<string, unknown> | null;
    // Never name a listing founders can no longer see (unverified again, or archived).
    if (!row || row.verification_status === 'unverified' || row.archived) continue;
    const o = toOpportunity(row);
    // Use the stored dates (not a projected next cycle): the founder saved this cycle.
    const w = { closes: o.deadline_at, decision: o.decision_at };
    let kind: 'applied' | 'outcome' | null = null;
    let ref = '';
    if (a.status === 'planning' && w.closes && addDays(w.closes, DAYS_AFTER_DEADLINE) <= today) {
      kind = 'applied'; ref = `checkin-applied:${a.id}:${w.closes}`;
    } else if ((a.status === 'applied' || a.status === 'waiting') && w.decision && w.decision <= today) {
      kind = 'outcome'; ref = `checkin-outcome:${a.id}:${w.decision}`;
    }
    if (!kind) continue;
    if (!(await claimSend(db, a.user_id, 'checkin', ref))) continue;
    const to = await emailOf(db, a.user_id);
    if (!to) continue;

    const exp = Math.floor(Date.now() / 1000) + CHECKIN_LINK_DAYS * 86400;
    const { data: tok, error: tErr } = await db.from('checkin_tokens')
      .insert({ application_id: a.id, expires_at: new Date(exp * 1000).toISOString() }).select('jti').single();
    if (tErr) { await releaseSend(db, a.user_id, 'checkin', ref); report.failed++; continue; }
    const link = async (act: CheckinAction) =>
      `${SITE_URL}/checkin?t=${encodeURIComponent(await signToken({ jti: tok.jti, app: a.id, act, exp }, secret))}`;
    const buttons = kind === 'applied'
      ? [{ label: 'Yes, I applied', href: await link('applied_yes') }, { label: 'No, I skipped it', href: await link('applied_no') }]
      : [{ label: 'Won', href: await link('won') }, { label: 'Not selected', href: await link('not_selected') }, { label: 'Still waiting', href: await link('waiting') }];
    const unsub = await unsubscribeUrl(a.user_id, 'checkin');
    const title = kind === 'applied' ? `Did you apply to ${o.name}?` : `How did ${o.name} go?`;
    const { html, text } = render({
      preheader: 'One click, no sign-in needed.',
      title,
      blocks: [
        { lines: [{ text: 'One click updates your applications. No sign-in needed. Outcomes are only ever shown to other founders as totals.' }] },
        { buttons },
        { lines: [{ text: `These links work once and expire in ${CHECKIN_LINK_DAYS} days.` }] },
      ],
      unsubscribeUrl: unsub, unsubscribeLabel: 'Unsubscribe from check-ins',
    });
    try {
      await sendEmail({ to, subject: title, html, text, unsubscribeUrl: unsub });
      report.sent++;
    } catch (e) {
      await releaseSend(db, a.user_id, 'checkin', ref);
      console.error('checkin send failed', a.id, (e as Error).message);
      report.failed++;
    }
  }
  return json(req, report);
});
