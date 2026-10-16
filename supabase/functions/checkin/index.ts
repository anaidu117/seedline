// Handles a check-in button (spec 7.9). The email links to the app's /checkin page, which POSTs the
// token here, so link scanners that only fetch URLs cannot use up a founder's one click.
// Valid once: the token's row is marked used in the same statement that checks it.
import { CHECKIN_ACTIONS, signToken, verifyToken, type CheckinPayload } from '../../../shared/signedToken.ts';
import { callerIp, json, preflight, rateLimit, serviceClient } from '../_shared/http.ts';

const AMOUNT_LINK_SECONDS = 3600;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'Use POST.' }, 405);
  if (!(await rateLimit('checkin', callerIp(req), 30, 3600))) return json(req, { error: 'Too many attempts. Try again in an hour.' }, 429);

  let body: { token?: string; amount?: number | null };
  try { body = await req.json(); } catch { return json(req, { error: 'Bad request.' }, 400); }
  const secret = Deno.env.get('CHECKIN_SIGNING_SECRET')!;
  const v = await verifyToken<CheckinPayload>(body.token ?? '', secret);
  if (!v.ok) {
    return json(req, { error: v.reason === 'expired' ? 'This link has expired. Update the application from your Applications page.' : 'This link is not valid.' }, 400);
  }
  const { jti, app, act } = v.payload;
  const db = serviceClient();
  const { data: consumed, error } = await db.rpc('consume_checkin_token', { p_jti: jti, p_application_id: app });
  if (error) return json(req, { error: error.message }, 500);
  if (!consumed) return json(req, { error: 'This link has already been used. You can change the status any time from your Applications page.' }, 409);

  const { data: application } = await db.from('applications').select('id, user_id, opportunity:opportunities(name)').eq('id', app).single();
  const name = (application?.opportunity as { name?: string } | null)?.name ?? 'this program';

  if (act === 'amount') {
    const amount = body.amount;
    if (amount !== null && amount !== undefined && !(Number.isInteger(amount) && amount >= 0 && amount <= 100_000_000)) {
      return json(req, { error: 'Enter the amount in whole dollars.' }, 400);
    }
    await db.from('applications').update({ amount_won: amount ?? null }).eq('id', app).eq('status', 'won');
    return json(req, { ok: true, message: 'Thanks. Amount saved.' });
  }

  const status = CHECKIN_ACTIONS[act];
  if (!status) return json(req, { error: 'This link is not valid.' }, 400);
  const { error: upErr } = await db.from('applications').update({ status }).eq('id', app);
  if (upErr) return json(req, { error: upErr.message }, 500);
  await db.from('events').insert({ name: 'application_status_changed', user_id: application?.user_id ?? null });
  if (status === 'won' || status === 'not_selected') await db.from('events').insert({ name: 'outcome_reported', user_id: application?.user_id ?? null });

  // A won check-in offers an optional amount, with its own single-use, one-hour token.
  let amountToken: string | undefined;
  if (status === 'won') {
    const exp = Math.floor(Date.now() / 1000) + AMOUNT_LINK_SECONDS;
    const { data: t } = await db.from('checkin_tokens').insert({ application_id: app, expires_at: new Date(exp * 1000).toISOString() }).select('jti').single();
    if (t) amountToken = await signToken({ jti: t.jti, app, act: 'amount', exp }, secret);
  }
  const messages: Record<string, string> = {
    applied: `Thanks. ${name} is marked as applied. We'll check in after the decision date.`,
    skipped: `Thanks. ${name} is marked as skipped.`,
    won: `Congratulations. ${name} is marked as won.`,
    not_selected: `Thanks for telling us. ${name} is marked as not selected.`,
    waiting: `Thanks. ${name} is marked as still waiting.`,
  };
  return json(req, { ok: true, status, message: messages[status], amountToken });
});
