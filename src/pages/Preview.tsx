import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { buildPlan, computeTotals, type Plan } from '../../shared/matching/index.ts';
import { todayEastern } from '../../shared/dates.ts';
import { formatUsd } from '../../shared/money.ts';
import { fetchOpportunities } from '../lib/opportunities.ts';
import { readLayer0 } from '../lib/layer0.ts';
import { useAuth } from '../lib/auth.tsx';
import { Alert, Loading, Page } from '../components/ui.tsx';
import { OpportunityCard } from '../components/opportunity.tsx';
import { Disclaimer } from '../components/Disclaimer.tsx';
import { BrandBlock, DeadlineTimeline } from '../components/brand.tsx';
import { MagicLinkForm } from './SignIn.tsx';

export default function Preview() {
  const layer0 = readLayer0();
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState('');
  const today = todayEastern();

  useEffect(() => {
    if (!layer0) return;
    fetchOpportunities()
      // No account yet, so milestones are unknown here (the matching engine treats them as unanswered).
      .then((opps) => setPlan(buildPlan(opps, { ...layer0, milestones: undefined }, today)))
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!layer0) return <Navigate to="/start" replace />;
  if (error) return <Page narrow><Alert tone="error">We couldn't load programs right now: {error}. Try again in a minute.</Alert></Page>;
  if (!plan) return <Page narrow><Loading label="Finding your matches" /></Page>;

  const totals = computeTotals(plan);
  const eligible = [...plan.apply_now, ...plan.coming_up];
  const top = eligible.slice(0, 3);
  const more = plan.needs_info.length + plan.targeted.length;

  return (
    <Page narrow>
      <BrandBlock shapes="small" className="p-6 md:p-8">
        {eligible.length > 0 ? (
          <>
            <p className="text-[length:var(--text-card)]">You match <span className="tabular font-bold">{eligible.length}</span> program{eligible.length === 1 ? '' : 's'} so far.</p>
            {totals.count > 0 && (
              <p className="mt-2">
                <span className="block font-semibold">You could apply for up to</span>
                <span className="tabular font-display text-[length:var(--text-hero)] font-extrabold leading-none">{formatUsd(totals.total)}</span>
              </p>
            )}
            {totals.undisclosed.length > 0 && <p className="mt-1">{totals.undisclosed.length} more with undisclosed amounts.</p>}
            <p className="mt-2 text-[length:var(--text-meta)]">Founders rarely win everything. This is the most you could apply for.</p>
          </>
        ) : (
          <p className="text-[length:var(--text-card)]">No programs match your answers yet.</p>
        )}
        {more > 0 && <p className="mt-3">{more} more could match once you answer a few more questions.</p>}
      </BrandBlock>

      {eligible.length > 0 && (
        <section aria-labelledby="preview-timeline" className="mt-8">
          <h2 id="preview-timeline" className="mb-3 text-[length:var(--text-section)]">Your next 9 months</h2>
          <DeadlineTimeline today={today} items={eligible.filter((m) => m.window.closes).map((m) => ({ slug: m.opportunity.slug, name: m.opportunity.name, date: m.window.closes!, expected: m.window.expected }))} />
        </section>
      )}

      {top.length > 0 && (
        <section className="mt-8 flex flex-col gap-4">
          <h2 className="text-[length:var(--text-section)]">Your top matches</h2>
          {top.map((m) => <OpportunityCard key={m.opportunity.slug} match={m} today={today} fly="signin" />)}
        </section>
      )}

      <section className="mt-10 rounded-xl border border-line p-6">
        {user ? (
          <>
            <h2 className="text-[length:var(--text-section)]">You're signed in</h2>
            <Link className="btn btn-primary mt-4" to="/plan">See my full plan</Link>
          </>
        ) : (
          <>
            <h2 className="text-[length:var(--text-section)]">Enter your email to see your full plan.</h2>
            <p className="mt-2 text-muted">Your full plan shows what to apply to now, what's coming up, what you're close to, and deadlines. We'll save your answers.</p>
            <div className="mt-4"><MagicLinkForm next="/plan" cta="Email me my plan" /></div>
          </>
        )}
      </section>
      <p className="mt-6"><Link className="link-target" to="/start">Change my answers</Link></p>
      <Disclaimer className="mt-6" />
    </Page>
  );
}
