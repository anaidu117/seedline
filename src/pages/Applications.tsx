import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { APPLICATION_STATUSES, valueLabel, type ApplicationStatus } from '../../shared/vocab.ts';
import { formatUsd } from '../../shared/money.ts';
import { windowFor } from '../../shared/matching/index.ts';
import { todayEastern } from '../../shared/dates.ts';
import { supabase } from '../lib/supabase.ts';
import { useAuth } from '../lib/auth.tsx';
import { toOpportunity, type OpportunityRow } from '../lib/opportunities.ts';
import { track } from '../lib/events.ts';
import { Alert, EmptyState, Loading, Page, PageTitle } from '../components/ui.tsx';
import { DeadlineChip } from '../components/opportunity.tsx';
import { RequireAuth } from '../components/RequireAuth.tsx';
import { TypeChip } from '../components/brand.tsx';

interface AppRow { id: string; status: ApplicationStatus; amount_won: number | null; opportunity: OpportunityRow | null }

export default function ApplicationsPage() {
  return <RequireAuth><ApplicationsInner /></RequireAuth>;
}

function ApplicationsInner() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AppRow[] | null>(null);
  const [error, setError] = useState('');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const today = todayEastern();

  const load = async () => {
    const { data, error: err } = await supabase.from('applications')
      .select('id, status, amount_won, opportunity:opportunities(*)').eq('user_id', user!.id).order('created_at');
    if (err) { setError(err.message); return; }
    setRows((data ?? []).map((r) => ({ ...(r as unknown as AppRow), opportunity: r.opportunity ? toOpportunity(r.opportunity as unknown as Record<string, unknown>) : null })));
  };
  useEffect(() => { void load(); }, []);

  async function setStatus(row: AppRow, status: ApplicationStatus) {
    const { error: err } = await supabase.from('applications').update({ status, ...(status === 'won' ? {} : { amount_won: null }) }).eq('id', row.id);
    if (err) { setError(err.message); return; }
    const p = { school: null, sector: null };
    void track('application_status_changed', p);
    if (status === 'won' || status === 'not_selected') void track('outcome_reported', p);
    await load();
  }

  async function saveAmount(row: AppRow) {
    const v = (amounts[row.id] ?? '').replace(/[$,\s]/g, '');
    if (v && !/^\d+$/.test(v)) { setError('Enter the amount in whole dollars, for example 5000.'); return; }
    const { error: err } = await supabase.from('applications').update({ amount_won: v ? Number(v) : null }).eq('id', row.id);
    if (err) { setError(err.message); return; }
    setError('');
    await load();
  }

  async function remove(row: AppRow) {
    await supabase.from('applications').delete().eq('id', row.id);
    await load();
  }

  if (!rows) return <Page>{error ? <Alert tone="error">{error}</Alert> : <Loading />}</Page>;
  const counts = APPLICATION_STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length] as const).filter(([, n]) => n > 0);
  const won = rows.filter((r) => r.status === 'won');
  const wonTotal = won.reduce((s, r) => s + (r.amount_won ?? 0), 0);

  return (
    <Page narrow>
      <PageTitle lead="Track where each application stands. Reporting outcomes helps other founders like you, and is only ever shown in aggregate.">Applications</PageTitle>
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}
      {rows.length === 0 ? (
        <EmptyState title="No saved applications yet" action={{ to: '/plan', label: 'Go to my plan' }}>
          Save programs from your plan to track them here. You'll get reminders before their deadlines.
        </EmptyState>
      ) : (
        <>
          <p className="tabular mb-1">{counts.map(([s, n]) => `${n} ${valueLabel(s).toLowerCase()}`).join(' · ')}</p>
          {won.length > 0 && <p className="tabular mb-6 font-semibold">{wonTotal > 0 ? `${formatUsd(wonTotal)} won so far, as you reported.` : `${won.length} won.`}</p>}
          <ul className="flex flex-col gap-4">
            {rows.map((r) => {
              const o = r.opportunity;
              return (
                <li key={r.id} className="rounded-xl border border-line p-4">
                  {o ? (
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div><TypeChip type={o.type} /><div><Link to={`/opportunity/${o.slug}`} className="inline-flex min-h-11 items-center font-display text-[length:var(--text-card)] font-bold">{o.name}</Link></div></div>
                      <DeadlineChip match={{ window: windowFor(o, today), opportunity: o }} today={today} />
                    </div>
                  ) : <p className="text-muted">This listing is no longer available.</p>}
                  <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
                    <div>
                      <label className="field-label" htmlFor={`s-${r.id}`}>Status</label>
                      <select id={`s-${r.id}`} className="input w-56" value={r.status} onChange={(e) => setStatus(r, e.target.value as ApplicationStatus)}>
                        {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{valueLabel(s)}</option>)}
                      </select>
                    </div>
                    {r.status === 'won' && (
                      <div>
                        <label className="field-label" htmlFor={`a-${r.id}`}>Amount won <span className="font-normal text-muted">(optional)</span></label>
                        <div className="flex gap-2">
                          <input id={`a-${r.id}`} className="input w-40" inputMode="numeric" placeholder={r.amount_won != null ? String(r.amount_won) : 'Whole dollars'}
                            value={amounts[r.id] ?? ''} onChange={(e) => setAmounts({ ...amounts, [r.id]: e.target.value })} />
                          <button className="btn btn-secondary" onClick={() => saveAmount(r)}>Save amount</button>
                        </div>
                        {r.amount_won != null && <span className="field-hint tabular">Saved: {formatUsd(r.amount_won)}</span>}
                      </div>
                    )}
                    <button className="btn btn-quiet md:ml-auto" onClick={() => remove(r)}>Remove</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Page>
  );
}
