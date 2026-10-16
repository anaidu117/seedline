// Private calendar feed (spec 7.2). The URL carries a secret token; only its SHA-256 hash is stored.
// No login: calendar apps fetch it directly. Returns the founder's eligible deadlines and saved ones.
import { buildIcs, type DeadlineEvent } from '../../../shared/ics.ts';
import { cors, rateLimit, serviceClient, sha256Hex, callerIp } from '../_shared/http.ts';
import { planFor, SITE_URL, visibleOpportunities } from '../_shared/founders.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!/^[a-f0-9]{48}$/.test(token)) return new Response('Not found', { status: 404 });
  if (!(await rateLimit('calendar-feed', callerIp(req), 120, 3600))) return new Response('Too many requests', { status: 429 });

  const db = serviceClient();
  const { data: profile } = await db.from('profiles').select('user_id').eq('calendar_token_hash', await sha256Hex(token)).maybeSingle();
  if (!profile) return new Response('Not found', { status: 404 });

  const opps = await visibleOpportunities(db);
  const result = await planFor(db, profile.user_id, opps);
  const { data: apps } = await db.from('applications').select('opportunity_id, status').eq('user_id', profile.user_id);
  const saved = new Set((apps ?? []).filter((a) => a.status !== 'skipped').map((a) => a.opportunity_id));

  const events = new Map<string, DeadlineEvent>();
  const all = result ? [...result.plan.apply_now, ...result.plan.coming_up, ...result.plan.not_ready, ...result.plan.needs_info, ...result.plan.targeted] : [];
  for (const m of all) {
    const o = m.opportunity as typeof m.opportunity & { id: string };
    const eligible = m.status === 'eligible' && (m.group === 'apply_now' || m.group === 'coming_up');
    if (!m.window.closes || !(eligible || saved.has(o.id))) continue;
    events.set(o.slug, {
      uid: `${o.slug}-${m.window.closes}`,
      title: `Deadline: ${o.name}${m.window.expected ? ' (expected)' : ''}`,
      date: m.window.closes,
      description: `${o.organizer}. Confirm the deadline with the organizer.`,
      url: `${SITE_URL}/opportunity/${o.slug}`,
    });
  }
  return new Response(buildIcs([...events.values()], { name: 'Seedline deadlines' }), {
    headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'private, max-age=900' },
  });
});
