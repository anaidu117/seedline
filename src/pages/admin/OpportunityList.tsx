import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { valueLabel, VERIFICATION_STATUSES } from '../../../shared/vocab.ts';
import { amountLine } from '../../../shared/money.ts';
import { fetchOpportunities, isStale, type OpportunityRow } from '../../lib/opportunities.ts';
import { Alert, Loading } from '../../components/ui.tsx';
import { VerificationChip } from './shared.tsx';

export default function OpportunityList() {
  const [rows, setRows] = useState<OpportunityRow[] | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    fetchOpportunities().then(setRows).catch((e) => setError(e.message));
  }, []);

  const shown = useMemo(() => (rows ?? []).filter((r) =>
    (status === 'all' || (status === 'archived' ? r.archived : !r.archived && r.verification_status === status))
    && (!q || `${r.name} ${r.organizer} ${r.slug}`.toLowerCase().includes(q.toLowerCase()))), [rows, status, q]);

  if (error) return <Alert tone="error">Couldn't load opportunities: {error}</Alert>;
  if (!rows) return <Loading />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="field-label" htmlFor="q">Search</label>
          <input id="q" className="input w-64" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, organizer or slug" />
        </div>
        <div>
          <label className="field-label" htmlFor="status">Status</label>
          <select id="status" className="input w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            {VERIFICATION_STATUSES.map((s) => <option key={s} value={s}>{valueLabel(s)}</option>)}
            <option value="archived">Archived</option>
          </select>
        </div>
        <Link className="btn btn-primary ml-auto" to="/admin/opportunities/new">New opportunity</Link>
      </div>
      <p className="mb-3 text-muted tabular">{shown.length} of {rows.length} opportunities</p>
      {shown.length === 0 ? (
        <Alert>No opportunities match. Import a CSV or create one.</Alert>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {shown.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 px-4 py-3 md:flex-row md:items-center md:gap-4">
              <div className="min-w-0 flex-1">
                <Link to={`/admin/opportunities/${r.id}`} className="font-semibold">{r.name}</Link>
                <p className="text-[length:var(--text-meta)] text-muted">{r.organizer} · {valueLabel(r.type)} · {amountLine(r.amount_min, r.amount_max)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <VerificationChip status={r.verification_status} />
                {r.archived && <span className="chip bg-surface text-muted">Archived</span>}
                {!r.archived && r.verification_status !== 'unverified' && isStale(r) && <span className="chip bg-amber-tint text-amber-ink">May be outdated</span>}
                {r.organizer_edited_at && <span className="chip bg-blue-tint text-navy">Organizer edit to review</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
