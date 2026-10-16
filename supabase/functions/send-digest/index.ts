// Weekly digest (spec 7.2). Sends only when something changed since the last digest:
// new matches, a deadline newly within 14 days, or a deadline newly within 3 days. Otherwise nothing.
import { daysBetween, formatDate, todayEastern } from '../../../shared/dates.ts';
import { amountLine } from '../../../shared/money.ts';
import { json, serviceClient } from '../_shared/http.ts';
import { claimSend, emailOf, isCron, planFor, releaseSend, SITE_URL, unsubscribeUrl, visibleOpportunities } from '../_shared/founders.ts';
import { render } from '../_shared/templates.ts';
import { sendEmail } from '../_shared/email.ts';

Deno.serve(async (req) => {
  if (!isCron(req)) return json(req, { error: 'Not allowed.' }, 403);
  const db = serviceClient();
  const today = todayEastern();
  const opps = await visibleOpportunities(db);
  const { data: profiles, error } = await db.from('profiles').select('user_id').eq('email_digest', true);
  if (error) return json(req, { error: error.message }, 500);
  const report = { checked: 0, sent: 0, skipped_no_change: 0, failed: 0 };

  for (const { user_id } of profiles ?? []) {
    report.checked++;
    const r = await planFor(db, user_id, opps);
    if (!r) continue;
    const eligible = [...r.plan.apply_now, ...r.plan.coming_up].filter((m) => m.status === 'eligible');
    const slugs = eligible.map((m) => m.opportunity.slug).sort();
    const { data: prev } = await db.from('digest_snapshots').select('eligible_slugs').eq('user_id', user_id).maybeSingle();
    // The first digest only records a baseline of matches; it never calls everything "new".
    const newMatches = prev ? eligible.filter((m) => !prev.eligible_slugs.includes(m.opportunity.slug)) : [];
    const soon: { m: (typeof eligible)[number]; days: number; window: 3 | 14 }[] = [];
    for (const m of r.plan.apply_now.filter((x) => x.status === 'eligible' && x.window.closes)) {
      const days = daysBetween(today, m.window.closes!);
      if (days < 0 || days > 14) continue;
      const w = days <= 3 ? 3 : 14;
      // Each deadline is mentioned once per window, so the same deadline never makes two digests "changed".
      const { data: seen } = await db.from('email_log').select('id').eq('user_id', user_id).eq('kind', 'digest').eq('ref', `deadline-${w}:${m.opportunity.slug}:${m.window.closes}`).maybeSingle();
      if (!seen) soon.push({ m, days, window: w });
    }
    await db.from('digest_snapshots').upsert({ user_id, eligible_slugs: slugs, computed_at: new Date().toISOString() });
    if (newMatches.length === 0 && soon.length === 0) { report.skipped_no_change++; continue; }

    const weekRef = `week:${today}`;
    if (!(await claimSend(db, user_id, 'digest', weekRef))) continue;
    const to = await emailOf(db, user_id);
    if (!to) continue;
    const unsub = await unsubscribeUrl(user_id, 'digest');
    const { html, text } = render({
      preheader: 'What changed on your Seedline plan this week.',
      title: 'What changed on your plan this week',
      blocks: [
        ...(soon.length ? [{ heading: 'Deadlines coming up', lines: soon.map(({ m, days }) => ({ text: `${m.opportunity.name}: closes ${formatDate(m.window.closes!)} (${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`})`, href: `${SITE_URL}/opportunity/${m.opportunity.slug}` })) }] : []),
        ...(newMatches.length ? [{ heading: 'New matches', lines: newMatches.map((m) => ({ text: `${m.opportunity.name}: ${amountLine(m.opportunity.amount_min, m.opportunity.amount_max)}`, href: `${SITE_URL}/opportunity/${m.opportunity.slug}` })) }] : []),
        { buttons: [{ label: 'See my plan', href: `${SITE_URL}/plan` }] },
      ],
      unsubscribeUrl: unsub, unsubscribeLabel: 'Unsubscribe from the weekly digest',
    });
    try {
      await sendEmail({ to, subject: 'Your Seedline plan: what changed this week', html, text, unsubscribeUrl: unsub });
      for (const s of soon) await claimSend(db, user_id, 'digest', `deadline-${s.window}:${s.m.opportunity.slug}:${s.m.window.closes}`);
      report.sent++;
    } catch (e) {
      await releaseSend(db, user_id, 'digest', weekRef);
      console.error('digest send failed', user_id, (e as Error).message);
      report.failed++;
    }
  }
  return json(req, report);
});
