import { describe, expect, it } from 'vitest';
import { signToken, verifyToken } from './signedToken.ts';

const SECRET = 'x'.repeat(64);
const now = 1_800_000_000;

describe('signed tokens', () => {
  it('round-trips a valid token', async () => {
    const t = await signToken({ jti: 'a', app: 'b', act: 'won', exp: now + 60 }, SECRET);
    const r = await verifyToken(t, SECRET, now);
    expect(r).toEqual({ ok: true, payload: { jti: 'a', app: 'b', act: 'won', exp: now + 60 } });
  });

  it('rejects an expired token', async () => {
    const t = await signToken({ jti: 'a', exp: now - 1 }, SECRET);
    expect(await verifyToken(t, SECRET, now)).toEqual({ ok: false, reason: 'expired' });
  });

  it('accepts exp 0 as never expiring', async () => {
    const t = await signToken({ uid: 'u', exp: 0 }, SECRET);
    expect((await verifyToken(t, SECRET, now * 2)).ok).toBe(true);
  });

  it('rejects a tampered payload', async () => {
    const t = await signToken({ jti: 'a', act: 'applied_no', exp: now + 60 }, SECRET);
    const [, sig] = t.split('.');
    const forged = btoa(JSON.stringify({ jti: 'a', act: 'won', exp: now + 60 })).replace(/=+$/, '');
    expect(await verifyToken(`${forged}.${sig}`, SECRET, now)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a token signed with another secret', async () => {
    const t = await signToken({ exp: now + 60 }, 'y'.repeat(64));
    expect((await verifyToken(t, SECRET, now)).ok).toBe(false);
  });

  it('rejects malformed tokens', async () => {
    expect(await verifyToken('nope', SECRET, now)).toEqual({ ok: false, reason: 'malformed' });
    expect(await verifyToken('a.b.c', SECRET, now)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('refuses short secrets', async () => {
    await expect(signToken({ exp: 0 }, 'short')).rejects.toThrow(/at least 32/);
  });
});
