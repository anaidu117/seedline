// Shared pieces for showing an opportunity to founders.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { valueLabel } from '../../shared/vocab.ts';
import { amountLine } from '../../shared/money.ts';
import { daysBetween, formatDate, relativeDays, type IsoDate } from '../../shared/dates.ts';
import { ramp, readinessT, urgencyT } from '../../shared/ramp.ts';
import { foundersLikeYouLine, readinessText, type Match, type Opportunity, type Readiness } from '../../shared/matching/index.ts';
import { NOT_DISCLOSED } from '../../shared/money.ts';
import { isStale } from '../lib/opportunities.ts';

/** Deadline chip. Its tint and dot come from ramp() (amber means close); the text stays navy for contrast. */
export function DeadlineChip({ match, today }: { match: Pick<Match, 'window' | 'opportunity'>; today: IsoDate }) {
  const w = match.window;
  if (!w.closes) {
    return <span className="chip bg-surface text-navy">{match.opportunity.deadline_type === 'rolling' ? 'Rolling deadline' : 'No deadline listed'}</span>;
  }
  const opensLater = w.opens && w.opens > today;
  const days = daysBetween(today, w.closes);
  const label = opensLater ? `Opens ${formatDate(w.opens!)}` : days === 0 ? 'Closes today' : `Closes ${relativeDays(today, w.closes)}`;
  // Urgency is ordinal, so both the tint and the dot come from ramp(). Text stays navy for contrast.
  const t = opensLater ? 0 : urgencyT(days);
  return (
    <span className="chip text-navy" style={{ background: ramp(t, 0.16) }}>
      <span aria-hidden="true" className="inline-block size-2.5 rounded-full" style={{ background: ramp(t) }} />
      {label}{w.expected ? ' (expected)' : ''}
    </span>
  );
}

export function ReadinessLine({ r }: { r: Readiness }) {
  if (r.required === 0) return null;
  return (
    <p className="flex items-start gap-2 text-[length:var(--text-meta)]">
      <span aria-hidden="true" className="mt-1.5 inline-flex gap-0.5">
        {Array.from({ length: r.required }, (_, i) => (
          <span key={i} className="inline-block h-2 w-3 rounded-sm" style={{ background: i < r.ready ? ramp(readinessT(r.ready, r.required)) : 'var(--color-line)' }} />
        ))}
      </span>
      <span>{readinessText(r)}</span>
    </p>
  );
}

/** Source and last-verified date, shown on every opportunity (spec section 8). */
export function SourceLine({ o }: { o: Pick<Opportunity, 'source_url' | 'last_verified_at' | 'verification_status'> }) {
  const verified = o.last_verified_at ? `Last verified ${new Date(o.last_verified_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}` : 'Verification date not recorded';
  return (
    <p className="text-[length:var(--text-meta)] text-muted">
      Source: <a href={o.source_url} target="_blank" rel="noreferrer noopener" className="break-all">{hostOf(o.source_url)}</a>
      {' · '}{verified}
      {o.verification_status === 'organizer_verified' && <span className="chip ml-2 bg-blue-tint text-navy">Verified by organizer</span>}
      {isStale(o) && <span className="chip ml-2 border border-line-strong bg-surface text-navy">May be outdated</span>}
    </p>
  );
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

export function MetaLine({ o }: { o: Opportunity }) {
  return (
    <p className="text-muted">
      {o.organizer} · {valueLabel(o.type)} · <span className="tabular">{amountLine(o.amount_min, o.amount_max)}</span>
      {o.equity_required && <span className="chip ml-2 bg-surface text-navy">Takes equity</span>}
    </p>
  );
}

/** Two separate lines, never combined or averaged (spec section 8). */
export function ResultsLines({ o, fly }: { o: Opportunity; fly: { reported: number; won: number } | null | undefined | 'signin' }) {
  const past = o.past_results_text || o.past_results_count != null
    ? [o.past_results_text, o.past_results_count != null ? `${o.past_results_count} awarded${o.past_results_year ? ` in ${o.past_results_year}` : ''}.` : ''].filter(Boolean).join(' ')
    : `${NOT_DISCLOSED}.`;
  return (
    <div className="text-[length:var(--text-meta)]">
      <p><span className="font-semibold">Past results, from the organizer: </span>{past}</p>
      {fly !== undefined && <p><span className="font-semibold">Founders like you, from Seedline: </span>{fly === 'signin' ? 'Sign in to see results from founders at your stage and in your sector.' : foundersLikeYouLine(fly).text}</p>}
    </div>
  );
}

/** The large Apply now card. */
export function OpportunityCard({ match, today, readiness, actions, delay, fly }: {
  match: Match; today: IsoDate; readiness?: Readiness; actions?: ReactNode; delay?: number;
  /** Founders-like-you counts for this listing (null below the threshold); omit where the viewer has no profile. */
  fly?: { reported: number; won: number } | null | 'signin';
}) {
  const o = match.opportunity;
  return (
    <article className={`rounded-xl border border-line border-l-4 border-l-carolina bg-bg p-4 md:p-5 ${delay !== undefined ? 'rise-in' : ''}`} style={delay !== undefined ? { animationDelay: `${delay}ms` } : undefined}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <h3 className="text-[length:var(--text-card)]"><Link to={`/opportunity/${o.slug}`} className="inline-flex min-h-11 items-center text-navy">{o.name}</Link></h3>
        <DeadlineChip match={match} today={today} />
      </div>
      <MetaLine o={o} />
      {match.passed.length > 0 && (
        <p className="mt-2"><span className="font-semibold">Why it fits: </span>{match.passed.map((r) => r.requirement).join('. ')}.</p>
      )}
      {readiness && <div className="mt-2"><ReadinessLine r={readiness} /></div>}
      <div className="mt-2"><ResultsLines o={o} fly={fly} /></div>
      <div className="mt-2"><SourceLine o={o} /></div>
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}

/** A compact row for Coming up, Not ready yet and Needs info. */
export function CompactRow({ match, today, detail, action }: { match: Match; today: IsoDate; detail?: ReactNode; action?: ReactNode }) {
  const o = match.opportunity;
  return (
    <li className="flex flex-col gap-1 py-3 md:flex-row md:items-start md:gap-4">
      <div className="min-w-0 flex-1">
        <Link to={`/opportunity/${o.slug}`} className="link-target font-semibold">{o.name}</Link>
        <p className="text-[length:var(--text-meta)] text-muted">{o.organizer} · <span className="tabular">{amountLine(o.amount_min, o.amount_max)}</span>{o.equity_required ? ' · Takes equity' : ''}</p>
        {detail && <div className="mt-1">{detail}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DeadlineChip match={match} today={today} />
        {action}
      </div>
    </li>
  );
}
