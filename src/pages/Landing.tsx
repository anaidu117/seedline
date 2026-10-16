import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { buildPlan, computeTotals, type Plan } from '../../shared/matching/index.ts';
import { todayEastern } from '../../shared/dates.ts';
import { formatUsd } from '../../shared/money.ts';
import { fetchOpportunities } from '../lib/opportunities.ts';
import { BrandBlock, DeadlineTimeline, StepsPath } from '../components/brand.tsx';

/** A fixed example founder, so visitors see a real plan computed from real verified listings. */
const EXAMPLE_FOUNDER = { school: 'unc', student_status: 'grad', state: 'NC', stage: 'prototype', sector: 'health_biotech', incorporated: false } as const;

export default function Landing() {
  const today = todayEastern();
  const [plan, setPlan] = useState<Plan | null>(null);
  useEffect(() => {
    fetchOpportunities().then((opps) => setPlan(buildPlan(opps, { ...EXAMPLE_FOUNDER, milestones: undefined }, today))).catch(() => setPlan(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const totals = plan ? computeTotals(plan) : null;
  const items = plan ? [...plan.apply_now, ...plan.coming_up].filter((m) => m.status === 'eligible' && m.window.closes)
    .map((m) => ({ slug: m.opportunity.slug, name: m.opportunity.name, date: m.window.closes!, expected: m.window.expected })) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
      <BrandBlock shapes="hero" className="px-6 py-12 md:px-12 md:py-16">
        <h1 className="max-w-[12em] text-[length:var(--text-hero-sm)] md:text-[length:var(--text-mega)]">Find the funding you should apply for, and in what order.</h1>
        <p className="mt-5 max-w-[30em] text-[length:var(--text-card)]">
          Grants, pitch competitions, fellowships and programs for early-stage founders. Answer seven questions. See what fits, why, and what to do first. Free, and Seedline never takes a share of anything you win.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/start" className="btn btn-ink">Find my funding</Link>
          <Link to="/map" className="btn btn-paper">Browse the funding map</Link>
        </div>
      </BrandBlock>

      {totals && totals.count > 0 && items.length > 0 && (
        <section aria-labelledby="example" className="mt-12">
          <h2 id="example" className="text-[length:var(--text-meta)] font-sans font-semibold text-muted">What a plan looks like, for an example founder (a graduate student at a North Carolina university, with a health prototype)</h2>
          <div className="mt-3 grid gap-6 rounded-[var(--radius-card)] border border-line p-5 md:grid-cols-[16rem_1fr] md:items-end md:p-7">
            <div>
              <p className="text-muted">Up to</p>
              <p className="tabular font-display text-[length:var(--text-hero-sm)] font-extrabold leading-none">{formatUsd(totals.total)}</p>
              <p className="mt-1 text-muted">across {totals.count} opportunit{totals.count === 1 ? 'y' : 'ies'}</p>
            </div>
            <DeadlineTimeline items={items} today={today} />
          </div>
        </section>
      )}

      <section aria-labelledby="how" className="mt-14">
        <h2 id="how" className="mb-6 text-[length:var(--text-page)]">How it works</h2>
        <StepsPath />
      </section>
    </div>
  );
}
