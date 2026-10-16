// One-click unsubscribe (spec 7.2). Accepts the app's POST {token} and RFC 8058 one-click POSTs
// from mail clients (token in the query string). Idempotent: unsubscribing twice is fine.
import { verifyToken, type UnsubscribePayload } from '../../../shared/signedToken.ts';
import { callerIp, json, preflight, rateLimit, serviceClient } from '../_shared/http.ts';

const COLUMNS = { digest: ['email_digest'], reminder: ['email_reminders'], checkin: ['email_checkins'], all: ['email_digest', 'email_reminders', 'email_checkins'] } as const;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'Use POST.' }, 405);
  if (!(await rateLimit('unsubscribe', callerIp(req), 60, 3600))) return json(req, { error: 'Too many attempts.' }, 429);
  let token = new URL(req.url).searchParams.get('t') ?? '';
  if (!token && req.headers.get('content-type')?.includes('application/json')) {
    try { token = (await req.json()).token ?? ''; } catch { /* fall through */ }
  }
  const v = await verifyToken<UnsubscribePayload>(token, Deno.env.get('CHECKIN_SIGNING_SECRET')!);
  if (!v.ok || v.payload.purpose !== 'unsubscribe' || !(v.payload.kind in COLUMNS)) return json(req, { error: 'This unsubscribe link is not valid.' }, 400);
  const update = Object.fromEntries(COLUMNS[v.payload.kind].map((c) => [c, false]));
  const { error } = await serviceClient().from('profiles').update(update).eq('user_id', v.payload.uid);
  if (error) return json(req, { error: error.message }, 500);
  return json(req, { ok: true, kind: v.payload.kind });
});
