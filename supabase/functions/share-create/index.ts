// Creates a read-only share link for the caller's plan (spec 7.11), protected by a password
// (hashed here) or by a list of invited emails. Returns the link once; only its hash is stored.
import { callerUser, json, preflight, rateLimit, serviceClient, sha256Hex } from '../_shared/http.ts';
import { hashPassword } from '../_shared/password.ts';
import { SITE_URL } from '../_shared/founders.ts';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'Use POST.' }, 405);
  const user = await callerUser(req);
  if (!user) return json(req, { error: 'Sign in first.' }, 401);
  if (!(await rateLimit('share-create', user.id, 20, 3600))) return json(req, { error: 'Too many links created. Try again in an hour.' }, 429);

  let body: { mode?: string; password?: string; emails?: string[]; expiresInDays?: number | null; label?: string };
  try { body = await req.json(); } catch { return json(req, { error: 'Bad request.' }, 400); }
  if (body.mode !== 'password' && body.mode !== 'invite') return json(req, { error: 'Choose a password or invited emails.' }, 400);
  let passwordHash: string | null = null;
  let emails: string[] = [];
  if (body.mode === 'password') {
    if (typeof body.password !== 'string' || body.password.length < 8) return json(req, { error: 'Use a password of at least 8 characters.' }, 400);
    passwordHash = await hashPassword(body.password);
  } else {
    emails = [...new Set((body.emails ?? []).map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
    if (emails.length === 0) return json(req, { error: 'Add at least one email address.' }, 400);
    if (emails.length > 20) return json(req, { error: 'Invite up to 20 people per link.' }, 400);
    const bad = emails.filter((e) => !EMAIL.test(e));
    if (bad.length) return json(req, { error: `These don't look like email addresses: ${bad.join(', ')}` }, 400);
  }
  const days = body.expiresInDays;
  if (days != null && !(Number.isInteger(days) && days >= 1 && days <= 365)) return json(req, { error: 'Expiry must be 1 to 365 days, or never.' }, 400);

  const token = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const db = serviceClient();
  const { data: link, error } = await db.from('share_links').insert({
    user_id: user.id, token_hash: await sha256Hex(token), mode: body.mode, password_hash: passwordHash,
    label: (body.label ?? '').slice(0, 80) || null,
    expires_at: days ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
  }).select('id').single();
  if (error) return json(req, { error: error.message }, 500);
  if (emails.length) {
    const { error: invErr } = await db.from('share_invites').insert(emails.map((email) => ({ share_id: link.id, email })));
    if (invErr) { await db.from('share_links').delete().eq('id', link.id); return json(req, { error: invErr.message }, 500); }
  }
  await db.from('events').insert({ name: 'share_created', user_id: user.id });
  return json(req, { id: link.id, url: `${SITE_URL}/share/${token}` });
});
