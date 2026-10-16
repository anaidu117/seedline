import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { GEOGRAPHY_LEVELS, OPPORTUNITY_TYPES, SECTORS, STAGES, valueLabel } from '../../shared/vocab.ts';
import { DEADLINE_FILTERS, DEADLINE_FILTER_LABELS, matchesMap, type DeadlineFilter, type MapFilters } from '../../shared/mapFilter.ts';
import { compareMatches, windowFor } from '../../shared/matching/index.ts';
import { todayEastern } from '../../shared/dates.ts';
import { fetchOpportunities, type OpportunityRow } from '../lib/opportunities.ts';
import { Alert, Loading, Page, PageTitle } from '../components/ui.tsx';
import { DeadlineChip, MetaLine, ResultsLines, SourceLine } from '../components/opportunity.tsx';
import { useAuth } from '../lib/auth.tsx';
import { supabase } from '../lib/supabase.ts';
import { flyFor, useFoundersLikeYou } from '../lib/fly.ts';
import type { Sector, Stage } from '../../shared/vocab.ts';
import { Disclaimer } from '../components/Disclaimer.tsx';

/** Public funding map (spec 7.12). Verified listings only; no founder data of any kind. */
export default function MapPage() {
  const [rows, setRows] = useState<OpportunityRow[] | null>(null);
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();
  const today = todayEastern();
  const filters: MapFilters = {
    type: (params.get('type') ?? '') as MapFilters['type'],
    geography: (params.get('geography') ?? '') as MapFilters['geography'],
    sector: (params.get('sector') ?? '') as MapFilters['sector'],
    stage: (params.get('stage') ?? '') as MapFilters['stage'],
    deadline: (params.get('deadline') ?? 'any') as DeadlineFilter,
  };

  // Signed-in founders see "Founders like you" for their own stage and sector; everyone else is asked to sign in.
  const { user } = useAuth();
  const [who, setWho] = useState<{ stage: Stage | null; sector: Sector | null } | null>(null);
  useEffect(() => {
    if (!user) { setWho(null); return; }
    supabase.from('profiles').select('stage, sector').eq('user_id', user.id).maybeSingle().then(({ data }) => setWho(data ?? { stage: null, sector: null }));
  }, [user?.id]);

  useEffect(() => {
    // Opportunities only. RLS returns verified, unarchived listings to everyone.
    fetchOpportunities().then(setRows).catch((e) => setError(e.message));
  }, []);

  const shown = useMemo(() => (rows ?? [])
    .filter((o) => matchesMap(o, filters, today))
    .map((o) => ({ o, w: windowFor(o, today) }))
    .sort((a, b) => compareMatches({ opportunity: a.o, window: a.w } as never, { opportunity: b.o, window: b.w } as never)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [rows, params.toString()]);

  const fly = useFoundersLikeYou(shown.map(({ o }) => o.id), who);

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v && v !== 'any') next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const select = (k: keyof MapFilters, label: string, values: readonly string[]) => (
    <div>
      <label htmlFor={`m-${k}`} className="field-label">{label}</label>
      <select id={`m-${k}`} className="input" value={filters[k] ?? ''} onChange={(e) => set(k, e.target.value)}>
        <option value="">All</option>
        {values.map((v) => <option key={v} value={v}>{valueLabel(v)}</option>)}
      </select>
    </div>
  );

  return (
    <Page>
      <PageTitle lead="Every verified grant, competition, fellowship and program in Seedline. No sign-in needed. Each listing shows where the information came from and when it was last checked.">
        Funding map
      </PageTitle>
      <form className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(e) => e.preventDefault()} aria-label="Filter programs">
        {select('type', 'Type', OPPORTUNITY_TYPES)}
        {select('geography', 'Geography', GEOGRAPHY_LEVELS)}
        {select('sector', 'Sector', SECTORS)}
        {select('stage', 'Stage', STAGES)}
        <div>
          <label htmlFor="m-deadline" className="field-label">Deadline</label>
          <select id="m-deadline" className="input" value={filters.deadline} onChange={(e) => set('deadline', e.target.value)}>
            {DEADLINE_FILTERS.map((d) => <option key={d} value={d}>{DEADLINE_FILTER_LABELS[d]}</option>)}
          </select>
        </div>
      </form>
      {error && <Alert tone="error">We couldn't load the map: {error}</Alert>}
      {!rows && !error && <Loading />}
      {rows && (
        <>
          <p className="tabular mb-3 text-muted" role="status">{shown.length} program{shown.length === 1 ? '' : 's'}{params.toString() ? ' match these filters' : ''}.</p>
          {shown.length === 0 ? (
            <Alert>No verified programs match these filters. Try fewer filters{params.toString() ? '' : ', or check back soon'}.</Alert>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {shown.map(({ o, w }) => (
                <li key={o.slug} className="flex flex-col gap-1 py-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <Link to={`/opportunity/${o.slug}`} className="inline-flex min-h-11 items-center font-display text-[length:var(--text-card)] font-bold">{o.name}</Link>
                    <DeadlineChip match={{ window: w, opportunity: o }} today={today} />
                  </div>
                  <MetaLine o={o} />
                  <p className="text-[length:var(--text-meta)] text-muted">{valueLabel(o.geography_level)}{o.regions.length ? `: ${o.regions.join(', ')}` : ''}</p>
                  <ResultsLines o={o} fly={flyFor(fly, o.id)} />
                  <SourceLine o={o} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <div className="mt-8 rounded-xl bg-surface p-4">
        <p>Know a program that's missing? <Link to="/submit">Submit an opportunity</Link>. Want to know which ones fit you? <Link to="/start">Find my funding</Link>.</p>
      </div>
      <Disclaimer className="mt-6" />
    </Page>
  );
}
