import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { valueLabel } from '../../shared/vocab.ts';
import { amountLine, NOT_DISCLOSED } from '../../shared/money.ts';
import { formatDate } from '../../shared/dates.ts';
import {
  foundersLikeYouLine, materialsReadiness, matchOpportunity, pastWinnersSummary, type Match,
} from '../../shared/matching/index.ts';
import { useAuth } from '../lib/auth.tsx';
import { supabase } from '../lib/supabase.ts';
import { fetchOpportunity, type OpportunityRow } from '../lib/opportunities.ts';
import { saveToApplications, useFounder } from '../lib/founder.ts';
import { Alert, Loading, Page } from '../components/ui.tsx';
import { DeadlineChip, MetaLine, ReadinessLine, SourceLine } from '../components/opportunity.tsx';
import { CalendarButtons } from '../components/CalendarButtons.tsx';
import { Disclaimer } from '../components/Disclaimer.tsx';
import NotFound from './NotFound.tsx';

export default function OpportunityPage() {
  const { slug } = useParams();
  const [o, setO] = useState<OpportunityRow | null | undefined>(undefined);
  const [error, setError] = useState('');
  useEffect(() => {
    fetchOpportunity(slug!).then(setO).catch((e) => setError(e.message));
  }, [slug]);
  if (error) return <Page><Alert tone="error">We couldn't load this program: {error}</Alert></Page>;
  if (o === undefined) return <Page><Loading /></Page>;
  // RLS returns nothing for unverified or archived listings, so they look like missing pages.
  if (o === null) return <NotFound />;
  return <Detail o={o} />;
}

function Detail({ o }: { o: OpportunityRow }) {
  const { user } = useAuth();
  const founder = useFounder(user?.id, { updateSnapshot: false });
  const data = founder.data;
  const match: Match | null = data ? matchOpportunity(o, data.profile, data.today) : null;
  const today = data?.today ?? new Date().toISOString().slice(0, 10);
  const [fly, setFly] = useState<{ reported: number; won: number } | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data?.profile.stage || !data.profile.sector) { setFly(null); return; }
    // Aggregate only; the database returns nothing below 10 reports.
    supabase.rpc('founders_like_you', { opp: o.id, p_stage: data.profile.stage, p_sector: data.profile.sector })
      .then(({ data: rows }) => setFly(Array.isArray(rows) && rows[0] ? rows[0] : null));
  }, [o.id, data?.profile.stage, data?.profile.sector]);

  const winnersLine = pastWinnersSummary(o.past_winners, new Date().getFullYear());
  const saved = data?.applications.has(o.id);
  const window = match?.window ?? { opens: o.opens_at, closes: o.deadline_at, decision: o.decision_at, expected: false };

  return (
    <Page narrow>
      <p className="mb-2"><Link className="link-target" to={user ? '/plan' : '/map'}>{user ? 'Back to my plan' : 'Back to the funding map'}</Link></p>
      <header className="flex flex-col gap-2">
        <h1 className="text-[length:var(--text-page)]">{o.name}</h1>
        <MetaLine o={o} />
        <div><DeadlineChip match={{ window, opportunity: o }} today={today} /></div>
        <SourceLine o={o} />
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {o.application_url && <a className="btn btn-primary" href={o.application_url} target="_blank" rel="noreferrer noopener">Open the application</a>}
        {user && <Link className="btn btn-secondary" to={`/draft/${o.slug}`}>Start a draft</Link>}
        {user && (saved
          ? <Link className="btn btn-secondary" to="/applications">Saved to applications</Link>
          : <button className="btn btn-secondary" disabled={saving} onClick={async () => { setSaving(true); await saveToApplications(user.id, o.id); await founder.reload(); setSaving(false); }}>Save to my applications</button>)}
      </div>
      <div className="mt-2"><CalendarButtons o={o} window={window} /></div>

      {o.description && <p className="mt-8 max-w-2xl">{o.description}</p>}

      <section className="mt-8" aria-labelledby="fit">
        <h2 id="fit" className="text-[length:var(--text-section)]">How you fit</h2>
        {!user ? (
          <div className="mt-2"><p className="text-muted">Answer a few questions to see whether you qualify and what's missing.</p><Link className="btn btn-primary mt-3" to="/start">Find my funding</Link></div>
        ) : !match ? <Loading /> : (
          <div className="mt-2 flex flex-col gap-3">
            <p className="font-semibold">{statusText(match)}</p>
            {match.passed.length > 0 && <List title="You meet" items={match.passed.map((r) => r.fit)} />}
            {match.failed.length > 0 && <List title="What's missing" items={match.failed.map((r) => r.gap)} tone="gap" />}
            {match.unknown.length > 0 && <List title="We need to know" items={match.unknown.map((r) => r.gap)} />}
            {match.unknown.length > 0 && <Link className="btn btn-secondary self-start" to="/profile">Answer in my profile</Link>}
            {o.target_groups.length > 0 && <p>Open to: {o.target_groups.map((g) => valueLabel(g).toLowerCase()).join(', ')}.</p>}
          </div>
        )}
      </section>

      <section className="mt-8" aria-labelledby="materials">
        <h2 id="materials" className="text-[length:var(--text-section)]">Materials</h2>
        {o.materials_required.length === 0 ? <p className="mt-2 text-muted">No materials listed.</p> : data ? (
          <div className="mt-2"><ReadinessLine r={materialsReadiness(o.materials_required, data.materials)} /><Link className="mt-2 inline-block" to="/materials">Open my materials</Link></div>
        ) : <p className="mt-2">{o.materials_required.map((m) => valueLabel(m)).join(', ')}.</p>}
      </section>

      <section className="mt-8" aria-labelledby="dates">
        <h2 id="dates" className="text-[length:var(--text-section)]">Dates</h2>
        <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1">
          <dt className="font-semibold">Opens</dt><dd className="tabular">{window.opens ? formatDate(window.opens) : 'Open now'}</dd>
          <dt className="font-semibold">Deadline</dt><dd className="tabular">{window.closes ? formatDate(window.closes) : o.deadline_type === 'rolling' ? 'Rolling' : NOT_DISCLOSED}</dd>
          <dt className="font-semibold">Decision</dt><dd className="tabular">{window.decision ? formatDate(window.decision) : NOT_DISCLOSED}</dd>
        </dl>
        {window.expected && <p className="mt-2 text-muted">These dates are expected, based on the last cycle. Confirm with the organizer.</p>}
        {o.cycle_notes && <p className="mt-2">{o.cycle_notes}</p>}
      </section>

      <section className="mt-8" aria-labelledby="money">
        <h2 id="money" className="text-[length:var(--text-section)]">Money</h2>
        <p className="mt-2 tabular">{amountLine(o.amount_min, o.amount_max)}</p>
        {o.amount_notes && <p className="text-muted">{o.amount_notes}</p>}
        {o.equity_required && <p className="mt-2"><span className="font-semibold">Takes equity.</span> {o.equity_notes ?? ''}</p>}
      </section>

      <section className="mt-8" aria-labelledby="results">
        <h2 id="results" className="text-[length:var(--text-section)]">Results</h2>
        {/* Two separate lines, never combined (spec section 8). */}
        <div className="mt-2 flex flex-col gap-3">
          <div>
            <p className="font-semibold">Past results, from the organizer</p>
            {o.past_results_text || o.past_results_count != null ? (
              <p>
                {o.past_results_text}
                {o.past_results_count != null && <span className="tabular"> {o.past_results_count} awarded{o.past_results_year ? ` in ${o.past_results_year}` : ''}.</span>}
                {o.past_results_source_url && <> <a href={o.past_results_source_url} target="_blank" rel="noreferrer noopener">Source</a></>}
              </p>
            ) : <p className="text-muted">{NOT_DISCLOSED}.</p>}
          </div>
          <div>
            <p className="font-semibold">Founders like you, from Seedline</p>
            <p className={fly ? '' : 'text-muted'}>{user ? (fly === undefined ? 'Loading...' : foundersLikeYouLine(fly).text) : 'Sign in to see results from founders at your stage and in your sector.'}</p>
          </div>
        </div>
      </section>

      {o.past_winners.length > 0 && (
        <section className="mt-8" aria-labelledby="winners">
          <h2 id="winners" className="text-[length:var(--text-section)]">Past winners</h2>
          {winnersLine && <p className="mt-2">{winnersLine}</p>}
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {o.past_winners.map((w, i) => (
              <li key={i} className="py-2">
                <span className="font-semibold">{w.name}</span>
                <span className="text-muted">{[w.sector && valueLabel(w.sector), w.stage && valueLabel(w.stage), w.award, w.year].filter(Boolean).map((x) => ` · ${x}`).join('')}</span>
                {w.source_url && <> <a href={w.source_url} target="_blank" rel="noreferrer noopener">Source</a></>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 rounded-xl bg-surface p-4">
        <p>Run this program? <Link to={`/claim/${o.slug}`}>Claim it</Link> to keep the details up to date.</p>
      </section>
      <Disclaimer className="mt-6" />
    </Page>
  );
}

function statusText(m: Match): string {
  if (m.targeted) return 'This program is for specific founder groups. You haven\'t told us whether any apply to you.';
  switch (m.status) {
    case 'eligible': return 'You\'re eligible.';
    case 'not_ready': return 'You\'re not ready yet. Here\'s what\'s missing.';
    case 'needs_info': return 'We need a little more information to check.';
    case 'not_eligible': return 'This program doesn\'t fit your profile.';
  }
}

function List({ title, items, tone }: { title: string; items: string[]; tone?: 'gap' }) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <ul className={`mt-1 list-disc pl-5 ${tone === 'gap' ? 'marker:text-navy' : ''}`}>{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}
