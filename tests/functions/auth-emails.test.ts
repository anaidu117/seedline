// The sign-in emails Supabase sends use Seedline's own templates (supabase/templates/).
import { describe, expect, it } from 'vitest';
import { anonClient, uniqueEmail } from '../helpers/local.ts';

const MAILPIT = 'http://127.0.0.1:54324';

async function waitForMail(to: string): Promise<{ Subject: string; HTML: string; Text: string }> {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const msgs = (await res.json()).messages ?? [];
    if (msgs.length) return (await fetch(`${MAILPIT}/api/v1/message/${msgs[0].ID}`)).json();
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`no email for ${to}`);
}

describe('sign-in emails', () => {
  it('a new founder gets the Seedline confirmation email', async () => {
    const email = uniqueEmail('new-signin');
    await anonClient().auth.signInWithOtp({ email, options: { emailRedirectTo: 'http://localhost:5173/auth/callback' } });
    const m = await waitForMail(email);
    expect(m.Subject).toBe('Confirm your email to see your Seedline plan');
    expect(m.HTML).toContain('Sign in to Seedline');
    expect(m.HTML).not.toContain('—');
  });

  it('a returning founder gets the Seedline sign-in link email', async () => {
    const email = uniqueEmail('returning-signin');
    await anonClient().auth.signInWithOtp({ email, options: { emailRedirectTo: 'http://localhost:5173/auth/callback' } });
    await waitForMail(email);
    await fetch(`${MAILPIT}/api/v1/messages`, { method: 'DELETE' });
    // Confirm the first email so the account exists, then ask again.
    const { adminClient } = await import('../helpers/local.ts');
    const { data } = await adminClient().auth.admin.listUsers();
    const user = data.users.find((u) => u.email === email)!;
    await adminClient().auth.admin.updateUserById(user.id, { email_confirm: true });
    await new Promise((r) => setTimeout(r, 1100)); // the local stack allows one email per second per address
    await anonClient().auth.signInWithOtp({ email, options: { emailRedirectTo: 'http://localhost:5173/auth/callback' } });
    const m = await waitForMail(email);
    expect(m.Subject).toBe('Your Seedline sign-in link');
    expect(m.Text).toContain('Seedline');
  });
});
