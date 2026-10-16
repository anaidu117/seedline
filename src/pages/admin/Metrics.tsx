import { useEffect, useState } from 'react';
import { APPLICATION_STATUSES, valueLabel } from '../../../shared/vocab.ts';
import { formatUsd } from '../../../shared/money.ts';
import { addDays, todayEastern } from '../../../shared/dates.ts';
import { toCsv } from '../../../shared/csv/csv.ts';
import { supabase } from '../../lib/supabase.ts';
import { Alert, Loading } from '../../components/ui.tsx';

interface Metrics {
  funnel: { intake_started_visitors: number; layer0_finished_visitors: number; accounts_created: number; layer2_finished: number; plans_generated: number };
  applications: Record<string, number>;
  dollars_won: number; won_with_amount: number; won_total: number;
  outcomes_reported: number; outcomes_possible: number;
  shares: { created: number; opened: number };
  by_school: Record<string, number>; by_sector: Record<string, number>;
  by_month: { month: string; event: string; count: number }[];
}

/** Every number shown here is recorded data. Definitions sit next to each one. */
const DEFINITIONS: Record<string, string> = {
  intake_started_visitors: 'Browsers that focused a question on the intake form. Counted once per browser (anonymous ID).',
  layer0_finished_visitors: 'Browsers that submitted the intake form.',
  accounts_created: 'Founders whose first sign-in created a profile.',
  layer2_finished: 'Founders who answered every required company question for the first time.',
  plans_generated: 'First full plans built after sign-in. One per founder.',
};

/** The event each funnel number counts, for its label. */
const FUNNEL_EVENT: Record<keyof Metrics['funnel'], string> = {
  intake_started_visitors: 'intake_started', layer0_finished_visitors: 'layer0_finished', accounts_created: 'account_created',
  layer2_finished: 'layer2_finished', plans_generated: 'plan_generated',
};

export default function Metrics() {
  const today = todayEastern();
  const [from, setFrom] = useState(addDays(today, -89));
  const [to, setTo] = useState(today);
  const [m, setM] = useState<Metrics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setM(null);
    supabase.rpc('admin_metrics', { p_from: from, p_to: to }).then(({ data, error: e }) => {
      if (e) setError(e.message); else { setError(''); setM(data as Metrics); }
    });
  }, [from, to]);

  function exportCsv() {
    if (!m) return;
    const rows: (string | number)[][] = [['section', 'metric', 'value', 'from', 'to']];
    for (const [k, v] of Object.entries(m.funnel)) rows.push(['funnel', k, v, from, to]);
    for (const s of APPLICATION_STATUSES) rows.push(['applications', s, m.applications[s] ?? 0, from, to]);
    rows.push(['outcomes', 'dollars_won_reported', m.dollars_won, from, to]);
    rows.push(['outcomes', 'won_with_amount', m.won_with_amount, from, to]);
    rows.push(['outcomes', 'outcomes_reported', m.outcomes_reported, from, to]);
    rows.push(['outcomes', 'outcomes_possible', m.outcomes_possible, from, to]);
    rows.push(['shares', 'created', m.shares.created, from, to], ['shares', 'opened', m.shares.opened, from, to]);
    for (const [k, v] of Object.entries(m.by_school)) rows.push(['accounts_by_school', k, v, from, to]);
    for (const [k, v] of Object.entries(m.by_sector)) rows.push(['accounts_by_sector', k, v, from, to]);
    for (const r of m.by_month) rows.push([`events_${r.month}`, r.event, r.count, from, to]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv' }));
    a.download = `seedline-metrics-${from}-to-${to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end gap-4">
        <div><label htmlFor="from" className="field-label">From</label><input id="from" type="date" className="input" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></div>
        <div><label htmlFor="to" className="field-label">To</label><input id="to" type="date" className="input" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} /></div>
        <button className="btn btn-secondary" onClick={exportCsv} disabled={!m}>Export CSV</button>
      </div>
      <p className="max-w-2xl text-muted">Counts come only from recorded events and saved applications in this date range (Eastern time). Nothing is estimated. Founder groups are never recorded here.</p>
      {error && <Alert tone="error">{error}</Alert>}
      {!m && !error && <Loading />}
      {m && (
        <>
          <section aria-labelledby="funnel">
            <h2 id="funnel" className="text-[length:var(--text-section)]">Funnel</h2>
            <dl className="mt-3 divide-y divide-line border-y border-line">
              {(Object.keys(DEFINITIONS) as (keyof Metrics['funnel'])[]).map((k) => (
                <div key={k} className="flex flex-col gap-1 py-3 md:flex-row md:gap-6">
                  <dt className="md:w-72"><span className="font-semibold">{valueLabel(FUNNEL_EVENT[k])}</span><span className="block text-[length:var(--text-meta)] text-muted">{DEFINITIONS[k]}</span></dt>
                  <dd className="tabular font-display text-[length:var(--text-section)] font-bold">{m.funnel[k]}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="apps">
            <h2 id="apps" className="text-[length:var(--text-section)]">Applications</h2>
            <p className="mt-1 text-[length:var(--text-meta)] text-muted">Saved applications created in this range, by their current status.</p>
            <ul className="tabular mt-3 grid gap-2 sm:grid-cols-3">
              {APPLICATION_STATUSES.map((s) => <li key={s} className="rounded-lg border border-line px-3 py-2">{valueLabel(s)}: <span className="font-semibold">{m.applications[s] ?? 0}</span></li>)}
            </ul>
            <p className="tabular mt-4"><span className="font-semibold">Dollars won, as founders reported:</span> {formatUsd(m.dollars_won)} <span className="text-muted">({m.won_with_amount} of {m.won_total} wins included an amount)</span></p>
            <p className="tabular mt-1"><span className="font-semibold">Outcome report rate:</span> {m.outcomes_reported} of {m.outcomes_possible} applications that were submitted have a reported result (won or not selected).</p>
          </section>

          <section aria-labelledby="shares">
            <h2 id="shares" className="text-[length:var(--text-section)]">Share links</h2>
            <p className="tabular mt-2">{m.shares.created} created · {m.shares.opened} opened (each successful open counts once)</p>
          </section>

          <section aria-labelledby="breakdowns" className="grid gap-8 md:grid-cols-2">
            <h2 id="breakdowns" className="sr-only">Breakdowns</h2>
            {([['Accounts created by school', m.by_school, 'school'], ['Accounts created by sector', m.by_sector, 'sector']] as const).map(([title, data, field]) => (
              <div key={title}>
                <h3 className="text-[length:var(--text-card)]">{title}</h3>
                {Object.keys(data).length === 0 ? <p className="mt-2 text-muted">None recorded in this range.</p> : (
                  <table className="tabular mt-2 w-full text-left">
                    <tbody>{Object.entries(data).sort((a, b) => b[1] - a[1]).map(([k, v]) => <tr key={k} className="border-b border-line"><td className="py-2">{k === 'not_recorded' ? 'Not recorded' : valueLabel(k, field)}</td><td className="py-2 text-right font-semibold">{v}</td></tr>)}</tbody>
                  </table>
                )}
              </div>
            ))}
          </section>

          <section aria-labelledby="months">
            <h2 id="months" className="text-[length:var(--text-section)]">By month</h2>
            {m.by_month.length === 0 ? <p className="mt-2 text-muted">No events recorded in this range.</p> : (
              <div className="mt-2 overflow-x-auto">
                <table className="tabular w-full min-w-[28rem] text-left">
                  <thead><tr className="border-b border-line-strong"><th className="py-2 pr-4">Month</th><th className="py-2 pr-4">Event</th><th className="py-2 text-right">Count</th></tr></thead>
                  <tbody>{m.by_month.map((r) => <tr key={`${r.month}-${r.event}`} className="border-b border-line"><td className="py-2 pr-4">{r.month}</td><td className="py-2 pr-4">{valueLabel(r.event)}</td><td className="py-2 text-right font-semibold">{r.count}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
