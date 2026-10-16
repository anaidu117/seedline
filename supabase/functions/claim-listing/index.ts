// "Run this program? Claim it." (spec 7.10). The claimant must be signed in so an approved claim
// can be tied to their account by RLS. Rate-limited. Goes to the admin claims queue.
import { callerUser, json, preflight, rateLimit, serviceClient } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'Use POST.' }, 405);
  const user = await callerUser(req);
  if (!user?.email) return json(req, { error: 'Sign in first.' }, 401);
  if (!(await rateLimit('claim', user.id, 5, 86400))) return json(req, { error: 'Too many claims today. Try again tomorrow.' }, 429);
  let body: { slug?: string; organization?: string; role_title?: string; message?: string };
  try { body = await req.json(); } catch { return json(req, { error: 'Bad request.' }, 400); }
  const organization = String(body.organization ?? '').trim().slice(0, 200);
  const role = String(body.role_title ?? '').trim().slice(0, 120);
  const message = String(body.message ?? '').trim().slice(0, 2000);
  if (!organization || !role) return json(req, { error: 'Add your organization and your role.' }, 400);

  const db = serviceClient();
  const { data: opp } = await db.from('opportunities').select('id').eq('slug', body.slug ?? '').neq('verification_status', 'unverified').eq('archived', false).maybeSingle();
  if (!opp) return json(req, { error: 'That listing was not found.' }, 404);
  const { data: existing } = await db.from('opportunity_claims').select('status').eq('opportunity_id', opp.id).eq('user_id', user.id).in('status', ['pending', 'approved']).maybeSingle();
  if (existing) return json(req, { error: existing.status === 'approved' ? 'You already manage this listing.' : 'Your claim is already waiting for review.' }, 409);
  const { error } = await db.from('opportunity_claims').insert({ opportunity_id: opp.id, user_id: user.id, claimant_email: user.email, organization, role_title: role, message: message || null });
  if (error) return json(req, { error: error.message }, 500);
  return json(req, { ok: true });
});
