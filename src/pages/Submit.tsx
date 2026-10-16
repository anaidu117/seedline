import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { callFunction } from '../lib/supabase.ts';
import { Alert, Page, PageTitle } from '../components/ui.tsx';
import { Turnstile } from '../components/Turnstile.tsx';

const FIELDS = [
  { k: 'name', label: 'Program name', required: true },
  { k: 'organizer', label: 'Who runs it', required: true },
  { k: 'url', label: 'Link to the program page', required: true, type: 'url', hint: 'Where we can confirm the details.' },
  { k: 'deadline', label: 'Next deadline', type: 'date', hint: 'Leave empty if rolling or unknown.' },
  { k: 'amount_notes', label: 'Award amount', hint: 'For example "up to $10,000" or "not disclosed".' },
] as const;

export default function Submit() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [token, setToken] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token) { setError('Wait for the bot check to finish, then try again.'); return; }
    setState('sending'); setError('');
    try {
      await callFunction('submit-opportunity', { ...form, turnstileToken: token });
      setState('done');
    } catch (err) { setError((err as Error).message); setState('idle'); }
  }

  if (state === 'done') {
    return (
      <Page narrow>
        <Alert tone="success"><p className="font-semibold">Thanks. We got it.</p><p className="mt-1">We check every submission against its source before it appears on Seedline. We may email you with questions.</p></Alert>
        <Link className="btn btn-secondary mt-4" to="/map">Back to the funding map</Link>
      </Page>
    );
  }
  return (
    <Page narrow>
      <PageTitle lead="Know a grant, competition or program founders should see? Tell us. We verify every submission before it's published.">Submit an opportunity</PageTitle>
      <form onSubmit={submit} className="flex flex-col gap-5">
        {FIELDS.map((f) => (
          <div key={f.k}>
            <label htmlFor={`s-${f.k}`} className="field-label">{f.label}{!('required' in f) && <span className="font-normal text-muted"> (optional)</span>}</label>
            <input id={`s-${f.k}`} type={'type' in f ? f.type : 'text'} required={'required' in f} className="input max-w-lg" value={form[f.k] ?? ''} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
            {'hint' in f && <span className="field-hint">{f.hint}</span>}
          </div>
        ))}
        <div>
          <label htmlFor="s-description" className="field-label">Anything else we should know <span className="font-normal text-muted">(optional)</span></label>
          <textarea id="s-description" className="input max-w-lg" maxLength={2000} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label htmlFor="s-email" className="field-label">Your email</label>
          <input id="s-email" type="email" required autoComplete="email" className="input max-w-md" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <span className="field-hint">Only used to ask about this submission.</span>
        </div>
        <Turnstile onToken={setToken} onError={setError} />
        {error && <Alert tone="error">{error}</Alert>}
        <div><button className="btn btn-primary" disabled={state === 'sending'}>{state === 'sending' ? 'Sending...' : 'Send for review'}</button></div>
      </form>
    </Page>
  );
}
