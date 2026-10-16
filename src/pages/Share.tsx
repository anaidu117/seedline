import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { valueLabel } from '../../shared/vocab.ts';
import { amountLine, formatUsd } from '../../shared/money.ts';
import type { Window } from '../../shared/matching/index.ts';
import { supabase } from '../lib/supabase.ts';
import { useAuth } from '../lib/auth.tsx';
import { Alert, Loading, Page, SectionTitle } from '../components/ui.tsx';
import { DeadlineChip, ResultsLines, SourceLine } from '../components/opportunity.tsx';
import { Disclaimer } from '../components/Disclaimer.tsx';
import { MagicLinkForm } from './SignIn.tsx';

interface SharedMatch {
  slug: string; name: string; organizer: string; type: string; amount_min: number | null; amount_max: number | null;
  equity_required: boolean; deadline_type: string; window: Window; source_url: string; last_verified_at: string | null;
  verification_status: 'verified' | 'organizer_verified'; fits: string[]; gaps: string[];
  past_results_text: string | null; past_results_count: number | null; past_results_year: number | null;
  fly: { reported: number; won: number } | null;
}
interface Shared {
  today: string;
  totals: { total: number; openNow: number; openingLater: number; count: number; undisclosed: number; equity: number };
  apply_now: SharedMatch[]; coming_up: SharedMatch[]; not_ready: SharedMatch[]; needs_info: SharedMatch[];
}
type State = { kind: 'loading' } | { kind: 'password'; error?: string } | { kind: 'signin' } | { kind: 'error'; error: string } | { kind: 'ok'; data: Shared };

async function openShare(token: string, password?: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const { data: s } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-open`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${s.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ token, password }),
  });
  return { status: res.status, body: await res.json() };
}

export default function SharePage() {
  const { token = '' } = useParams();
  const { user, loading } = useAuth();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [password, setPassword] = useState('');

  const load = async (pw?: string) => {
    const { status, body } = await openShare(token, pw);
    if (status === 200) setState({ kind: 'ok', data: body as unknown as Shared });
    else if (body.needs === 'password') setState({ kind: 'password', error: body.error as string | undefined });
    else if (body.needs === 'signin') setState({ kind: 'signin' });
    else setState({ kind: 'error', error: (body.error as string) ?? 'This share link is not available.' });
  };
  useEffect(() => { if (!loading) void load(); }, [token, loading, user?.id]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState({ kind: 'loading' });
    await load(password);
  }

  if (state.kind === 'loading') return <Page narrow><Loading label="Opening the shared plan" /></Page>;
  if (state.kind === 'error') return <Page narrow><Alert tone="error">{state.error}</Alert></Page>;
  if (state.kind === 'password') {
    return (
      <Page narrow>
        <h1 className="text-[length:var(--text-page)]">A founder shared their funding plan with you</h1>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <label htmlFor="pw" className="field-label">Enter the password they gave you</label>
          <input id="pw" type="password" autoComplete="off" className="input max-w-sm" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <div><button className="btn btn-primary">Open the plan</button></div>
        </form>
      </Page>
    );
  }
  if (state.kind === 'signin') {
    return (
      <Page narrow>
        <h1 className="text-[length:var(--text-page)]">A founder shared their funding plan with you</h1>
        <p className="mt-2 text-muted">Sign in with the email address it was shared with. We'll send you a one-time link.</p>
        <div className="mt-6"><MagicLinkForm next={`/share/${token}`} cta="Email me a link to view it" /></div>
      </Page>
    );
  }
  const d = state.data;
  return (
    <Page>
      <p className="chip bg-surface text-navy">Read-only shared plan</p>
      <section className="mt-4 rounded-2xl bg-blue-tint p-6 md:p-8">
        {d.totals.count > 0 ? (
          <>
            <p className="text-[length:var(--text-card)]">Eligible for up to</p>
            <p className="tabular font-display text-[length:var(--text-hero-sm)] font-bold leading-none md:text-[length:var(--text-hero)]">{formatUsd(d.totals.total)}</p>
            <p className="mt-2">across <span className="tabular font-semibold">{d.totals.count}</span> opportunit{d.totals.count === 1 ? 'y' : 'ies'}. <span className="tabular">{formatUsd(d.totals.openNow)} open now · {formatUsd(d.totals.openingLater)} opening later.</span></p>
          </>
        ) : <p className="font-display text-[length:var(--text-page)] font-bold">No disclosed amounts on this plan yet.</p>}
        {d.totals.undisclosed > 0 && <p className="mt-2 text-muted">{d.totals.undisclosed} more with undisclosed amounts.</p>}
        {d.totals.equity > 0 && <p className="text-muted">{d.totals.equity} that take equity, not added in.</p>}
        <p className="mt-2 text-muted">Founders rarely win everything. This is the most they could apply for.</p>
      </section>
      {(['apply_now', 'coming_up', 'not_ready', 'needs_info'] as const).map((g) => (
        <section key={g} className="mt-10">
          <SectionTitle count={d[g].length}>{{ apply_now: 'Apply now', coming_up: 'Coming up', not_ready: 'Not ready yet', needs_info: 'Needs info' }[g]}</SectionTitle>
          {d[g].length === 0 ? <p className="mt-2 text-muted">Nothing here.</p> : (
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {d[g].map((m) => (
                <li key={m.slug} className="flex flex-col gap-1 py-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <Link to={`/opportunity/${m.slug}`} className="link-target font-semibold">{m.name}</Link>
                    <DeadlineChip match={{ window: m.window, opportunity: { deadline_type: m.deadline_type } as never }} today={d.today} />
                  </div>
                  <p className="text-[length:var(--text-meta)] text-muted">{m.organizer} · {valueLabel(m.type)} · <span className="tabular">{amountLine(m.amount_min, m.amount_max)}</span>{m.equity_required ? ' · Takes equity' : ''}</p>
                  {m.fits.length > 0 && <p className="text-[length:var(--text-meta)]">Fits: {m.fits.join('. ')}.</p>}
                  {m.gaps.length > 0 && <ul className="text-[length:var(--text-meta)]">{m.gaps.map((x) => <li key={x}>{x}</li>)}</ul>}
                  <ResultsLines o={m as never} fly={m.fly} />
                  <SourceLine o={m} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <Disclaimer className="mt-8" />
    </Page>
  );
}
