import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { SITE_URL, supabase } from '../lib/supabase.ts';
import { Alert, Page, PageTitle } from '../components/ui.tsx';

/** Only allow redirects to paths on this site. */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/plan';
}

export function MagicLinkForm({ next, cta = 'Email me a sign-in link', intro }: { next: string; cta?: string; intro?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('sending');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true },
    });
    if (err) {
      setError(err.message.includes('rate') ? 'Too many sign-in emails were sent. Wait a minute and try again.' : `We couldn't send the email: ${err.message}`);
      setState('error');
      return;
    }
    setState('sent');
  }

  if (state === 'sent') {
    return (
      <Alert tone="success">
        <p className="font-semibold">Check your email.</p>
        <p className="mt-1">We sent a sign-in link to {email}. Open it on this device to continue. It expires in one hour.</p>
      </Alert>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {intro && <p className="text-muted">{intro}</p>}
      <div>
        <label htmlFor="email" className="field-label">Email address</label>
        <input id="email" type="email" required autoComplete="email" className="input max-w-md" value={email} onChange={(e) => setEmail(e.target.value)} />
        <span className="field-hint">No password. We email you a link each time you sign in.</span>
      </div>
      {state === 'error' && <Alert tone="error">{error}</Alert>}
      <div><button className="btn btn-primary" disabled={state === 'sending'}>{state === 'sending' ? 'Sending...' : cta}</button></div>
    </form>
  );
}

export default function SignIn() {
  const [params] = useSearchParams();
  return (
    <Page narrow>
      <PageTitle lead="Enter your email and we'll send you a link to sign in.">Sign in to Seedline</PageTitle>
      <MagicLinkForm next={safeNext(params.get('next'))} />
    </Page>
  );
}
