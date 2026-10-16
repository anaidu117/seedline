// Magic links only (spec section 2): password accounts never get a session, and unconfirmed
// addresses are never trusted as admins.
import { describe, expect, it } from 'vitest';
import { adminClient, anonClient, signedInUser, uniqueEmail, withDb } from '../helpers/local.ts';

describe('magic links only', () => {
  it('a password sign-up through the Auth API gets no session', async () => {
    const email = uniqueEmail('pw-signup');
    const { data } = await anonClient().auth.signUp({ email, password: 'a-long-test-password-1' });
    expect(data.session).toBeNull();
  });

  it('a password sign-in is refused even for a confirmed account with a password', async () => {
    const email = uniqueEmail('pw-signin');
    await adminClient().auth.admin.createUser({ email, password: 'a-long-test-password-2', email_confirm: true });
    const { data, error } = await anonClient().auth.signInWithPassword({ email, password: 'a-long-test-password-2' });
    expect(data.session).toBeNull();
    expect(error?.message).toMatch(/email sign-in links only/);
  });

  it('a magic link (email OTP) still signs in', async () => {
    const u = await signedInUser('otp-ok');
    const { data } = await u.client.auth.getSession();
    expect(data.session?.access_token).toBeTruthy();
  });

  it('an unconfirmed address on the admin list is not an admin', async () => {
    const email = uniqueEmail('unconfirmed-admin');
    const created = await adminClient().auth.admin.createUser({ email, email_confirm: false });
    await withDb((db) => db.query('insert into public.admins (email) values ($1)', [email]));
    const isAdmin = await withDb(async (db) => {
      await db.query('begin');
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: created.data.user!.id, email, role: 'authenticated' })]);
      await db.query('set local role authenticated');
      const r = await db.query<{ is_admin: boolean }>('select public.is_admin()');
      await db.query('rollback');
      return r.rows[0].is_admin;
    });
    expect(isAdmin).toBe(false);
  });
});
