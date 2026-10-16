import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '../../lib/supabase.ts';
import { useAuth } from '../../lib/auth.tsx';
import { Alert, Loading } from '../../components/ui.tsx';

interface ClaimRow { id: string; claimant_email: string; organization: string; role_title: string; message: string | null; created_at: string; opportunity: { id: string; slug: string; name: string; source_url: string } | null }

export default function ClaimsQueue() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ClaimRow[] | null>(null);
  const [error, setError] = useState('');
  const load = async () => {
    const { data, error: e } = await supabase.from('opportunity_claims').select('id, claimant_email, organization, role_title, message, created_at, opportunity:opportunities(id, slug, name, source_url)').eq('status', 'pending').order('created_at');
    if (e) setError(e.message); else setRows(data as unknown as ClaimRow[]);
  };
  useEffect(() => { void load(); }, []);
  const review = async (id: string, status: 'approved' | 'rejected') => {
    const { error: e } = await supabase.from('opportunity_claims').update({ status, reviewed_by: user!.email, reviewed_at: new Date().toISOString() }).eq('id', id);
    if (e) setError(e.message); else await load();
  };
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!rows) return <Loading />;
  return (
    <div>
      <p className="mb-4 max-w-2xl text-muted">Approving a claim lets that person edit only that listing, and marks it Verified by organizer. Confirm they really run it first.</p>
      {rows.length === 0 ? <Alert tone="success">No claims waiting.</Alert> : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {rows.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 px-4 py-3">
              <p className="font-semibold">{c.opportunity ? <Link to={`/admin/opportunities/${c.opportunity.id}`}>{c.opportunity.name}</Link> : 'Listing removed'}</p>
              <p>{c.claimant_email} · {c.role_title}, {c.organization}</p>
              {c.message && <p className="text-[length:var(--text-meta)]">{c.message}</p>}
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-secondary" onClick={() => review(c.id, 'approved')}>Approve</button>
                <button className="btn btn-quiet" onClick={() => review(c.id, 'rejected')}>Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
