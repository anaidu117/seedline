// Public "Submit an opportunity" (spec 7.10). Turnstile-protected and rate-limited.
// Goes to the admin queue only. Nothing publishes without admin approval.
import { isIsoDate } from '../../../shared/dates.ts';
import { callerIp, json, preflight, rateLimit, serviceClient } from '../_shared/http.ts';
import { verifyTurnstile } from '../_shared/turnstile.ts';

const FIELDS = ['name', 'organizer', 'url', 'deadline', 'amount_notes', 'description'] as const;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'Use POST.' }, 405);
  const ip = callerIp(req);
  if (!(await rateLimit('submit', ip, 5, 3600))) return json(req, { error: 'Too many submissions from here. Try again in an hour.' }, 429);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(req, { error: 'Bad request.' }, 400); }
  if (!(await verifyTurnstile(String(body.turnstileToken ?? ''), ip))) return json(req, { error: 'The bot check did not pass. Reload the page and try again.' }, 400);

  const errors: string[] = [];
  const s = (k: string, max: number) => String(body[k] ?? '').trim().slice(0, max);
  const payload = { name: s('name', 200), organizer: s('organizer', 200), url: s('url', 500), deadline: s('deadline', 10), amount_notes: s('amount_notes', 300), description: s('description', 2000) };
  const email = s('email', 254).toLowerCase();
  if (!payload.name) errors.push('Add the program name.');
  if (!payload.organizer) errors.push('Add who runs it.');
  if (!/^https?:\/\/\S+$/.test(payload.url)) errors.push('Add a link to the program page, starting with https://');
  if (payload.deadline && !isIsoDate(payload.deadline)) errors.push('The deadline must be a real date.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Add your email so we can ask questions about it.');
  if (errors.length) return json(req, { error: errors.join(' ') }, 400);

  const { error } = await serviceClient().from('submissions').insert({ submitter_email: email, payload: Object.fromEntries(FIELDS.map((f) => [f, payload[f]])) });
  if (error) return json(req, { error: error.message }, 500);
  return json(req, { ok: true });
});
