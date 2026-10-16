// Opens a shared plan (spec 7.11). Password links: 5 attempts per 15 minutes per link.
// Invite links: the viewer must be signed in with an invited email.
// The shared view never includes founder groups, materials, or programs aimed at specific founder groups.
import { computeTotals, type Match } from '../../../shared/matching/index.ts';
import { callerUser, json, preflight, rateLimit, serviceClient, sha256Hex } from '../_shared/http.ts';
import { checkPassword } from '../_shared/password.ts';
import { planFor, visibleOpportunities } from '../_shared/founders.ts';

export const PASSWORD_ATTEMPTS = 5;
export const PASSWORD_WINDOW_SECONDS = 15 * 60;

function publicMatch(m: Match) {
  const o = m.opportunity;
  return {
    slug: o.slug, name: o.name, organizer: o.organizer, type: o.type, amount_min: o.amount_min, amount_max: o.amount_max,
    equity_required: o.equity_required, deadline_type: o.deadline_type, window: m.window, source_url: o.source_url,
    last_verified_at: o.last_verified_at, verification_status: o.verification_status,
    fits: m.passed.map((r) => r.requirement), gaps: [...m.failed, ...m.unknown].map((r) => r.gap),
  };
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'Use POST.' }, 405);
  let body: { token?: string; password?: string };
  try { body = await req.json(); } catch { return json(req, { error: 'Bad request.' }, 400); }
  if (!/^[a-f0-9]{48}$/.test(body.token ?? '')) return json(req, { error: 'This share link is not valid.' }, 404);

  const db = serviceClient();
  const { data: link } = await db.from('share_links').select('*').eq('token_hash', await sha256Hex(body.token!)).maybeSingle();
  if (!link || link.revoked_at) return json(req, { error: 'This share link has been turned off or does not exist.' }, 404);
  if (link.expires_at && new Date(link.expires_at) < new Date()) return json(req, { error: 'This share link has expired. Ask the founder for a new one.' }, 410);

  if (link.mode === 'password') {
    if (typeof body.password !== 'string' || body.password === '') return json(req, { needs: 'password' }, 401);
    if (!(await rateLimit('share-password', link.id, PASSWORD_ATTEMPTS, PASSWORD_WINDOW_SECONDS))) {
      return json(req, { error: 'Too many attempts. Wait 15 minutes and try again.' }, 429);
    }
    if (!(await checkPassword(body.password, link.password_hash))) return json(req, { needs: 'password', error: "That password isn't right." }, 401);
  } else {
    const viewer = await callerUser(req);
    if (!viewer?.email) return json(req, { needs: 'signin' }, 401);
    const { data: invite } = await db.from('share_invites').select('email').eq('share_id', link.id).eq('email', viewer.email.toLowerCase()).maybeSingle();
    if (!invite) return json(req, { needs: 'invite', error: `This plan wasn't shared with ${viewer.email}. Sign in with the email it was sent to.` }, 403);
  }

  // Founder groups are left out of the computation entirely, and targeted programs are removed,
  // so nothing in the response can reveal group membership (PLAN.md Q15).
  const opps = (await visibleOpportunities(db)).filter((o) => o.target_groups.length === 0);
  const r = await planFor(db, link.user_id, opps, { includeGroups: false });
  if (!r) return json(req, { error: 'This plan is not available.' }, 404);
  await db.from('share_links').update({ open_count: link.open_count + 1 }).eq('id', link.id);
  await db.from('events').insert({ name: 'share_opened', user_id: link.user_id });
  const nonEquity = { apply_now: r.plan.apply_now, coming_up: r.plan.coming_up };
  return json(req, {
    today: r.plan.today,
    totals: (({ total, openNow, openingLater, count, undisclosed, equity }) => ({ total, openNow, openingLater, count, undisclosed: undisclosed.length, equity: equity.length }))(computeTotals(nonEquity)),
    apply_now: r.plan.apply_now.map(publicMatch),
    coming_up: r.plan.coming_up.map(publicMatch),
    not_ready: r.plan.not_ready.map(publicMatch),
    needs_info: r.plan.needs_info.map(publicMatch),
  });
});
