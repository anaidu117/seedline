import { useEffect, useState, type FormEvent } from 'react';
import { callFunction, supabase } from '../lib/supabase.ts';
import { Alert } from './ui.tsx';

interface LinkRow { id: string; mode: 'password' | 'invite'; label: string | null; expires_at: string | null; revoked_at: string | null; open_count: number; created_at: string }

/** Create, list and revoke read-only share links for the founder's plan (spec 7.11). */
export function SharePanel({ userId }: { userId: string }) {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [mode, setMode] = useState<'password' | 'invite'>('password');
  const [password, setPassword] = useState('');
  const [emails, setEmails] = useState('');
  const [expires, setExpires] = useState('30');
  const [label, setLabel] = useState('');
  const [created, setCreated] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await supabase.from('share_links').select('id, mode, label, expires_at, revoked_at, open_count, created_at').eq('user_id', userId).order('created_at', { ascending: false });
    setLinks((data as LinkRow[]) ?? []);
  };
  useEffect(() => { void load(); }, [userId]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(''); setCreated('');
    try {
      const r = await callFunction<{ url: string }>('share-create', {
        mode, password: mode === 'password' ? password : undefined,
        emails: mode === 'invite' ? emails.split(/[\s,;]+/).filter(Boolean) : undefined,
        expiresInDays: expires === 'never' ? null : Number(expires), label,
      });
      setCreated(r.url); setPassword(''); setEmails(''); setLabel('');
      await load();
    } catch (err) { setError((err as Error).message); }
  }

  async function revoke(id: string) {
    await supabase.from('share_links').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    await load();
  }

  const now = Date.now();
  return (
    <section aria-labelledby="share" className="rounded-xl border border-line p-4 md:p-5">
      <h2 id="share" className="text-[length:var(--text-section)]">Share this plan</h2>
      <p className="mt-1 max-w-2xl text-muted">Give a mentor or cofounder a read-only view. Shared views never show your founder groups, your materials, or programs for specific founder groups.</p>
      <form onSubmit={create} className="mt-4 flex flex-col gap-4">
        <fieldset>
          <legend className="field-label">Who can open it</legend>
          <div className="flex flex-wrap gap-2">
            {(['password', 'invite'] as const).map((m) => (
              <label key={m} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 font-semibold ${mode === m ? 'border-carolina bg-blue-tint' : 'border-line-strong'}`}>
                <input type="radio" name="share-mode" value={m} className="size-4" checked={mode === m} onChange={() => setMode(m)} />
                {m === 'password' ? 'Anyone with the password' : 'Only people I invite by email'}
              </label>
            ))}
          </div>
        </fieldset>
        {mode === 'password' ? (
          <div>
            <label htmlFor="share-pw" className="field-label">Password</label>
            <input id="share-pw" type="text" autoComplete="off" minLength={8} required className="input max-w-sm" value={password} onChange={(e) => setPassword(e.target.value)} />
            <span className="field-hint">At least 8 characters. Send it separately from the link.</span>
          </div>
        ) : (
          <div>
            <label htmlFor="share-emails" className="field-label">Email addresses</label>
            <textarea id="share-emails" required className="input max-w-lg" rows={2} value={emails} onChange={(e) => setEmails(e.target.value)} />
            <span className="field-hint">Separate with commas. They'll sign in with a one-time email link to view it.</span>
          </div>
        )}
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="share-exp" className="field-label">Turns off after</label>
            <select id="share-exp" className="input w-44" value={expires} onChange={(e) => setExpires(e.target.value)}>
              <option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="never">Never</option>
            </select>
          </div>
          <div>
            <label htmlFor="share-label" className="field-label">Note to yourself <span className="font-normal text-muted">(optional)</span></label>
            <input id="share-label" className="input w-64" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <div><button className="btn btn-primary">Create share link</button></div>
      </form>
      {created && (
        <div className="mt-4 flex flex-col gap-2">
          <Alert tone="success">Link created. Copy it now; we only show it once.</Alert>
          <label htmlFor="share-url" className="sr-only">Share link</label>
          <input id="share-url" readOnly className="input font-mono text-[length:var(--text-meta)]" value={created} onFocus={(e) => e.target.select()} />
          <div><button type="button" className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(created)}>Copy link</button></div>
        </div>
      )}
      {links.length > 0 && (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {links.map((l) => {
            const off = l.revoked_at || (l.expires_at && new Date(l.expires_at).getTime() < now);
            return (
              <li key={l.id} className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:gap-4">
                <div className="flex-1">
                  <p className="font-semibold">{l.label || (l.mode === 'password' ? 'Password link' : 'Invite link')}</p>
                  <p className="tabular text-[length:var(--text-meta)] text-muted">
                    Created {new Date(l.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })} · Opened {l.open_count} time{l.open_count === 1 ? '' : 's'} · {l.revoked_at ? 'Turned off' : l.expires_at ? `${off ? 'Expired' : 'Expires'} ${new Date(l.expires_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}` : 'No expiry'}
                  </p>
                </div>
                {!off && <button className="btn btn-quiet" onClick={() => revoke(l.id)}>Turn off</button>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
