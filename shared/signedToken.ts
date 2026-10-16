// Signed tokens for links in emails (check-ins and unsubscribe). HMAC-SHA256 over a JSON payload.
// Single use is enforced separately in the database (checkin_tokens.used_at); this only proves
// the link came from Seedline, was not altered, and has not expired.

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** `exp` is seconds since the epoch. Use 0 for links that never expire (unsubscribe). */
export async function signToken(payload: Record<string, unknown> & { exp: number }, secret: string): Promise<string> {
  if (!secret || secret.length < 32) throw new Error('Signing secret must be at least 32 characters.');
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${body}.${b64url(await hmac(secret, body))}`;
}

export type VerifyResult<T> = { ok: true; payload: T } | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' };

export async function verifyToken<T extends { exp: number }>(token: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): Promise<VerifyResult<T>> {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'malformed' };
  let sig: Uint8Array;
  try { sig = fromB64url(parts[1]); } catch { return { ok: false, reason: 'malformed' }; }
  if (!timingSafeEqual(sig, await hmac(secret, parts[0]))) return { ok: false, reason: 'bad_signature' };
  let payload: T;
  try { payload = JSON.parse(new TextDecoder().decode(fromB64url(parts[0]))) as T; } catch { return { ok: false, reason: 'malformed' }; }
  if (typeof payload.exp !== 'number') return { ok: false, reason: 'malformed' };
  if (payload.exp !== 0 && payload.exp < nowSeconds) return { ok: false, reason: 'expired' };
  return { ok: true, payload };
}

/** Check-in button actions and the application status each one sets. */
export const CHECKIN_ACTIONS = {
  applied_yes: 'applied',
  applied_no: 'skipped',
  won: 'won',
  not_selected: 'not_selected',
  waiting: 'waiting',
} as const;
export type CheckinAction = keyof typeof CHECKIN_ACTIONS | 'amount';

export interface CheckinPayload { jti: string; app: string; act: CheckinAction; exp: number }
export interface UnsubscribePayload { uid: string; kind: 'digest' | 'reminder' | 'checkin' | 'all'; purpose: 'unsubscribe'; exp: 0 }

export const CHECKIN_LINK_DAYS = 30;
