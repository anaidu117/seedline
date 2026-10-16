// Reminders 14 and 3 days before a saved deadline (spec 7.2). Runs daily; each reminder is sent once.
import { daysBetween, formatDate, todayEastern } from '../../../shared/dates.ts';
import { windowFor } from '../../../shared/matching/index.ts';
import { json, serviceClient } from '../_shared/http.ts';
import { claimSend, emailOf, isCron, releaseSend, SITE_URL, toOpportunity, unsubscribeUrl } from '../_shared/founders.ts';
import { render } from '../_shared/templates.ts';
import { sendEmail } from '../_shared/email.ts';

Deno.serve(async (req) => {
  if (!isCron(req)) return json(req, { error: 'Not allowed.' }, 403);
  const db = serviceClient();
  const today = todayEastern();
  const { data: apps, error } = await db.from('applications')
    .select('id, user_id, status, opportunity:opportunities(*)')
    .eq('status', 'planning');
  if (error) return json(req, { error: error.message }, 500);
  const { data: optedIn, error: pErr } = await db.from('profiles').select('user_id').eq('email_reminders', true);
  if (pErr) return json(req, { error: pErr.message }, 500);
  const allowed = new Set((optedIn ?? []).map((p) => p.user_id as string));
  const report = { checked: 0, sent: 0, failed: 0 };

  for (const a of apps ?? []) {
    if (!allowed.has(a.user_id)) continue;
    report.checked++;
    const row = a.opportunity as unknown as Record<string, unknown> | null;
    if (!row || row.verification_status === 'unverified' || row.archived) continue;
    const o = toOpportunity(row);
    const w = windowFor(o, today);
    if (!w.closes) continue;
    const days = daysBetween(today, w.closes);
    if (days < 0 || days > 14) continue;
    const which = days <= 3 ? 3 : 14;
    const ref = `reminder-${which}:${a.id}:${w.closes}`;
    if (!(await claimSend(db, a.user_id, 'reminder', ref))) continue;
    const to = await emailOf(db, a.user_id);
    if (!to) continue;
    const unsub = await unsubscribeUrl(a.user_id, 'reminder');
    const when = days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`;
    const { html, text } = render({
      preheader: `${o.name} closes ${when}.`,
      title: `${o.name} closes ${when}`,
      blocks: [
        { lines: [{ text: `The deadline is ${formatDate(w.closes)}${w.expected ? ', expected from the last cycle' : ''}. Confirm it with the organizer.` }] },
        { buttons: [{ label: 'Open my draft', href: `${SITE_URL}/draft/${o.slug}` }, { label: 'See the program', href: `${SITE_URL}/opportunity/${o.slug}` }] },
      ],
      unsubscribeUrl: unsub, unsubscribeLabel: 'Unsubscribe from deadline reminders',
    });
    try {
      await sendEmail({ to, subject: `Reminder: ${o.name} closes ${when}`, html, text, unsubscribeUrl: unsub });
      report.sent++;
    } catch (e) {
      await releaseSend(db, a.user_id, 'reminder', ref);
      console.error('reminder send failed', a.id, (e as Error).message);
      report.failed++;
    }
  }
  return json(req, report);
});
