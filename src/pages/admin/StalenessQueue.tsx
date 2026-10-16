import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { fetchOpportunities, isStale, STALE_DAYS, type OpportunityRow } from '../../lib/opportunities.ts';
import { useAuth } from '../../lib/auth.tsx';
import { Alert, Loading } from '../../components/ui.tsx';
import { markVerified, VerificationChip } from './shared.tsx';

/** Published listings not verified in 90 days. Founders see "May be outdated" on these. */
export default function StalenessQueue() {
  const { user } = useAuth();
  const [rows, setRows] = useState<OpportunityRow[] | null>(null);
  const [error, setError] = useState('');
  const load = () => fetchOpportunities().then((all) => setRows(all
    .filter((o) => !o.archived && o.verification_status !== 'unverified' && isStale(o))
    .sort((a, b) => (a.last_verified_at ?? '').localeCompare(b.last_verified_at ?? '')))).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!rows) return <Loading />;
  return (
    <div>
      <p className="mb-4 max-w-2xl text-muted">Published listings not verified in the last {STALE_DAYS} days, oldest first. Check each against its source, then mark it verified.</p>
      {rows.length === 0 ? <Alert tone="success">Nothing is stale.</Alert> : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <Link to={`/admin/opportunities/${r.id}`} className="link-target font-semibold">{r.name}</Link>
                <p className="text-[length:var(--text-meta)] text-muted">Last verified {r.last_verified_at ? new Date(r.last_verified_at).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'never recorded'} · <a href={r.source_url} target="_blank" rel="noreferrer noopener">Source</a></p>
              </div>
              <VerificationChip status={r.verification_status} />
              <button className="btn btn-secondary" onClick={async () => { try { await markVerified(r.id, r.verification_status, user!.email!); await load(); } catch (e) { setError((e as Error).message); } }}>Mark verified</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
