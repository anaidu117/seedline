import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { valueLabel } from '../../shared/vocab.ts';
import { formatUsd } from '../../shared/money.ts';
import { layerFor, materialsReadiness, type Match } from '../../shared/matching/index.ts';
import { useAuth } from '../lib/auth.tsx';
import { saveToApplications, useFounder, type FounderData } from '../lib/founder.ts';
import { Alert, Loading, Page, SectionTitle } from '../components/ui.tsx';
import { CompactRow, OpportunityCard } from '../components/opportunity.tsx';
import { Disclaimer } from '../components/Disclaimer.tsx';
import { RequireAuth } from '../components/RequireAuth.tsx';

export default function PlanPage() {
  return <RequireAuth><PlanInner /></RequireAuth>;
}

function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/** The one considered motion moment: the total counts up when the plan is first generated. */
function useCountUp(target: number, animate: boolean): number {
  const [n, setN] = useState(animate && !prefersReducedMotion() ? 0 : target);
  useEffect(() => {
    if (!animate || prefersReducedMotion()) { setN(target); return; }
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 700);
      setN(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, animate]);
  return n;
}

function PlanInner() {
  const { user } = useAuth();
  const { data, error, reload } = useFounder(user?.id);
  if (error) return <Page><Alert tone="error">We couldn't load your plan: {error}. Refresh to try again.</Alert></Page>;
  if (!data) return <Page><Loading label="Building your plan" /></Page>;
  return <PlanView data={data} reload={reload} userId={user!.id} />;
}

function PlanView({ data, reload, userId }: { data: FounderData; reload: () => Promise<void>; userId: string }) {
  const { plan, totals, unlock, unlocked, today, materials, applications, firstPlan } = data;
  const shown = useCountUp(totals.total, firstPlan);
  const [busy, setBusy] = useState('');
  const bySlug = new Map(data.opportunities.map((o) => [o.slug, o]));

  // Equity programs are listed on their own and never added to the total (spec 7.1).
  const applyNow = plan.apply_now.filter((m) => !m.opportunity.equity_required);
  const comingUp = plan.coming_up.filter((m) => !m.opportunity.equity_required);
  const equity = [...plan.apply_now, ...plan.coming_up].filter((m) => m.opportunity.equity_required);

  async function save(m: Match) {
    setBusy(m.opportunity.slug);
    try { await saveToApplications(userId, m.opportunity.id!); await reload(); } finally { setBusy(''); }
  }

  const actions = (m: Match) => {
    const saved = applications.has(m.opportunity.id!);
    return (
      <>
        <Link className="btn btn-primary" to={`/draft/${m.opportunity.slug}`}>Start draft</Link>
        {saved
          ? <Link className="btn btn-secondary" to="/applications">Saved to applications</Link>
          : <button className="btn btn-secondary" disabled={busy === m.opportunity.slug} onClick={() => save(m)}>Save to my applications</button>}
      </>
    );
  };

  return (
    <div className="pb-8">
      <section className="bg-blue-tint">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
          <h1 className="sr-only">Your funding plan</h1>
          {totals.count > 0 ? (
            <>
              <p className="text-[length:var(--text-card)]">You're eligible for up to</p>
              <p className="tabular font-display text-[length:var(--text-hero-sm)] font-bold leading-none md:text-[length:var(--text-hero)]" aria-live="off">
                {formatUsd(shown)}
              </p>
              <p className="mt-2 text-[length:var(--text-card)]">across <span className="tabular font-semibold">{totals.count}</span> opportunit{totals.count === 1 ? 'y' : 'ies'}.</p>
              <p className="tabular mt-3">{formatUsd(totals.openNow)} open now · {formatUsd(totals.openingLater)} opening later</p>
            </>
          ) : (
            <p className="font-display text-[length:var(--text-page)] font-bold">No disclosed amounts on your plan yet.</p>
          )}
          <div className="mt-3 flex flex-col gap-1 text-muted">
            {totals.undisclosed.length > 0 && <p>{totals.undisclosed.length} more with undisclosed amounts.</p>}
            {totals.equity.length > 0 && <p>{totals.equity.length} program{totals.equity.length === 1 ? '' : 's'} that take equity, listed separately below and not added in.</p>}
            <p>Founders rarely win everything. This is the most you could apply for.</p>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-8 md:px-6">
        {unlock && (
          <section aria-labelledby="next-step" className="rounded-xl border border-line bg-surface p-4 md:p-5">
            <h2 id="next-step" className="text-[length:var(--text-card)]">Your best next step</h2>
            <p className="mt-1">{unlock.message}</p>
            <Link to="/profile" className="btn btn-secondary mt-3">Update my profile</Link>
          </section>
        )}

        {unlocked.length > 0 && (
          <section aria-labelledby="newly-unlocked" className="rounded-xl border-2 border-carolina p-4 md:p-5">
            <SectionTitle id="newly-unlocked" count={unlocked.length}>Newly unlocked</SectionTitle>
            <ul className="mt-2 list-disc pl-5">
              {unlocked.map((u) => <li key={u.slug}><Link to={`/opportunity/${u.slug}`}>{bySlug.get(u.slug)?.name ?? u.slug}</Link></li>)}
            </ul>
          </section>
        )}

        <section aria-labelledby="apply-now" className="flex flex-col gap-4">
          <SectionTitle id="apply-now" count={applyNow.length}>Apply now</SectionTitle>
          {applyNow.length === 0 ? (
            <p className="text-muted">Nothing is open for you right now. Check Coming up below, and fill in your profile to unlock more.</p>
          ) : applyNow.map((m, i) => (
            <OpportunityCard key={m.opportunity.slug} match={m} today={today} delay={firstPlan ? i * 70 : undefined}
              readiness={materialsReadiness(m.opportunity.materials_required, materials)} actions={actions(m)} />
          ))}
        </section>

        <section aria-labelledby="coming-up">
          <SectionTitle id="coming-up" count={comingUp.length}>Coming up</SectionTitle>
          {comingUp.length === 0
            ? <p className="mt-2 text-muted">Nothing opening in the next 9 months matches yet.</p>
            : <ul className="mt-2 divide-y divide-line border-y border-line">{comingUp.map((m) => <CompactRow key={m.opportunity.slug} match={m} today={today} />)}</ul>}
        </section>

        {equity.length > 0 && (
          <section aria-labelledby="equity">
            <SectionTitle id="equity" count={equity.length}>Programs that take equity</SectionTitle>
            <p className="mt-1 text-muted">These take a share of your company. They are not added to your total.</p>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {equity.map((m) => <CompactRow key={m.opportunity.slug} match={m} today={today} detail={m.opportunity.equity_notes ? <p className="text-[length:var(--text-meta)]">{m.opportunity.equity_notes}</p> : undefined} />)}
            </ul>
          </section>
        )}

        <section aria-labelledby="not-ready">
          <SectionTitle id="not-ready" count={plan.not_ready.length}>Not ready yet</SectionTitle>
          {plan.not_ready.length === 0
            ? <p className="mt-2 text-muted">Nothing here. You meet the readiness bar for everything you're eligible for.</p>
            : <ul className="mt-2 divide-y divide-line border-y border-line">{plan.not_ready.map((m) => (
                <CompactRow key={m.opportunity.slug} match={m} today={today} detail={<GapList match={m} />} />
              ))}</ul>}
        </section>

        <section aria-labelledby="needs-info">
          <SectionTitle id="needs-info" count={plan.needs_info.length}>Needs info</SectionTitle>
          {plan.needs_info.length === 0
            ? <p className="mt-2 text-muted">Nothing here. We have what we need to check every program.</p>
            : <ul className="mt-2 divide-y divide-line border-y border-line">{plan.needs_info.map((m) => (
                <CompactRow key={m.opportunity.slug} match={m} today={today} detail={<GapList match={m} />}
                  action={<Link className="btn btn-quiet" to="/profile">Answer in profile</Link>} />
              ))}</ul>}
        </section>

        {plan.targeted.length > 0 && (
          <section aria-labelledby="targeted">
            <SectionTitle id="targeted" count={plan.targeted.length}>Programs for specific founder groups</SectionTitle>
            <p className="mt-1 max-w-2xl text-muted">These programs are only open to certain groups of founders. You haven't told us whether any apply to you, so we show them here rather than guess. Answering is optional.</p>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {plan.targeted.map((m) => (
                <CompactRow key={m.opportunity.slug} match={m} today={today}
                  detail={<p className="text-[length:var(--text-meta)]">Open to: {m.opportunity.target_groups.map((g) => valueLabel(g).toLowerCase()).join(', ')}.{m.failed.length + m.unknown.length > 0 ? ' Other requirements still apply.' : ' You meet the other requirements.'}</p>} />
              ))}
            </ul>
            <Link to="/profile#founder-groups" className="btn btn-secondary mt-3">Answer founder groups</Link>
          </section>
        )}

        <div className="flex flex-col gap-1 text-muted">
          {plan.not_eligible.length > 0 && <p>{plan.not_eligible.length} program{plan.not_eligible.length === 1 ? " doesn't" : "s don't"} fit your profile.</p>}
          {plan.later.length > 0 && <p>{plan.later.length} more open later than 9 months from now.</p>}
        </div>
        <Disclaimer />
      </div>
    </div>
  );
}

function GapList({ match }: { match: Match }) {
  const items = [
    ...match.failed.map((r) => ({ key: `f${r.requirement}`, text: r.gap })),
    ...match.unknown.map((r) => ({ key: `u${r.requirement}`, text: r.gap, layer: layerFor(r.rule) })),
  ];
  return (
    <ul className="text-[length:var(--text-meta)]">
      {items.map((i) => <li key={i.key}>{i.text}</li>)}
    </ul>
  );
}
