import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '../../lib/supabase.ts';
import { useAuth } from '../../lib/auth.tsx';
import { Alert, Loading } from '../../components/ui.tsx';

interface Sub { id: string; submitter_email: string; payload: Record<string, string>; status: string; created_at: string }

export default function SubmissionsQueue() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Sub[] | null>(null);
  const [error, setError] = useState('');
  const load = async () => {
    const { data, error: e } = await supabase.from('submissions').select('*').eq('status', 'pending').order('created_at');
    if (e) setError(e.message); else setRows(data as Sub[]);
  };
  useEffect(() => { void load(); }, []);
  const review = async (id: string, status: 'approved' | 'rejected') => {
    const { error: e } = await supabase.from('submissions').update({ status, reviewed_by: user!.email, reviewed_at: new Date().toISOString() }).eq('id', id);
    if (e) setError(e.message); else await load();
  };
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!rows) return <Loading />;
  return (
    <div>
      <p className="mb-4 max-w-2xl text-muted">Public submissions. Create a listing from one to start an unverified draft, check it against the source, then mark it verified. Nothing publishes on its own.</p>
      {rows.length === 0 ? <Alert tone="success">No submissions waiting.</Alert> : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {rows.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 px-4 py-3">
              <p className="font-semibold">{s.payload.name} <span className="font-normal text-muted">by {s.payload.organizer}</span></p>
              <p className="text-[length:var(--text-meta)]"><a href={s.payload.url} target="_blank" rel="noreferrer noopener" className="link-target break-all">{s.payload.url}</a>{s.payload.deadline ? ` · Deadline ${s.payload.deadline}` : ''}{s.payload.amount_notes ? ` · ${s.payload.amount_notes}` : ''}</p>
              {s.payload.description && <p className="text-[length:var(--text-meta)]">{s.payload.description}</p>}
              <p className="text-[length:var(--text-meta)] text-muted">From {s.submitter_email}, {new Date(s.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}</p>
              <div className="flex flex-wrap gap-2">
                <Link className="btn btn-secondary" to={`/admin/opportunities/new?from=${s.id}`}>Create a listing from this</Link>
                <button className="btn btn-quiet" onClick={() => review(s.id, 'approved')}>Mark approved</button>
                <button className="btn btn-quiet" onClick={() => review(s.id, 'rejected')}>Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
