import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { valueLabel } from '../../../shared/vocab.ts';
import { fetchOpportunities, type OpportunityRow } from '../../lib/opportunities.ts';
import { useAuth } from '../../lib/auth.tsx';
import { Alert, Loading } from '../../components/ui.tsx';
import { markVerified, VerificationChip } from './shared.tsx';

/** Unverified listings and organizer edits waiting for review. */
export default function VerificationQueue() {
  const { user } = useAuth();
  const [rows, setRows] = useState<OpportunityRow[] | null>(null);
  const [error, setError] = useState('');
  const load = () => fetchOpportunities().then((all) => setRows(all.filter((r) => !r.archived && (r.verification_status === 'unverified' || r.organizer_edited_at)))).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!rows) return <Loading />;
  return (
    <div>
      <p className="mb-4 max-w-2xl text-muted">Check each listing against its source before marking it verified. Only verified listings reach founders and the public map.</p>
      {rows.length === 0 ? <Alert tone="success">Nothing waiting for review.</Alert> : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <Link to={`/admin/opportunities/${r.id}`} className="font-semibold">{r.name}</Link>
                <p className="text-[length:var(--text-meta)] text-muted">{valueLabel(r.type)} · Source: <a href={r.source_url} target="_blank" rel="noreferrer">{r.source_url}</a></p>
              </div>
              <VerificationChip status={r.verification_status} />
              {r.organizer_edited_at && <span className="chip bg-blue-tint text-navy">Organizer edit</span>}
              <button className="btn btn-secondary" onClick={async () => {
                try { await markVerified(r.id, r.verification_status, user!.email!); await load(); } catch (e) { setError((e as Error).message); }
              }}>Mark verified</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
