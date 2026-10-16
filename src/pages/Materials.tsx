import { useEffect, useState, type ChangeEvent } from 'react';
import { MATERIALS, valueLabel, type MaterialKey } from '../../shared/vocab.ts';
import { supabase } from '../lib/supabase.ts';
import { useAuth } from '../lib/auth.tsx';
import { useFounder } from '../lib/founder.ts';
import { Alert, Loading, Page, PageTitle } from '../components/ui.tsx';
import { RequireAuth } from '../components/RequireAuth.tsx';

interface MaterialRow { material_key: MaterialKey; kind: 'file' | 'link'; storage_path: string | null; url: string | null; file_name: string | null; updated_at: string }

export const SIGNED_URL_SECONDS = 60;
const MAX_BYTES = 25 * 1024 * 1024;

export default function MaterialsPage() {
  return <RequireAuth><MaterialsInner /></RequireAuth>;
}

function MaterialsInner() {
  const { user } = useAuth();
  const founder = useFounder(user?.id, { updateSnapshot: false });
  const [rows, setRows] = useState<Map<MaterialKey, MaterialRow> | null>(null);
  const [msg, setMsg] = useState<{ key: string; tone: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [links, setLinks] = useState<Record<string, string>>({});

  const load = async () => {
    const { data, error } = await supabase.from('materials').select('*').eq('user_id', user!.id);
    if (error) { setMsg({ key: 'all', tone: 'error', text: error.message }); return; }
    setRows(new Map((data as MaterialRow[]).map((r) => [r.material_key, r])));
  };
  useEffect(() => { void load(); }, []);

  // How many programs on the founder's plan need each material.
  const neededBy = new Map<MaterialKey, number>();
  for (const m of [...(founder.data?.plan.apply_now ?? []), ...(founder.data?.plan.coming_up ?? [])]) {
    for (const k of m.opportunity.materials_required) neededBy.set(k, (neededBy.get(k) ?? 0) + 1);
  }

  async function upload(key: MaterialKey, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) { setMsg({ key, tone: 'error', text: 'That file is over 25 MB. Upload a smaller file or add a link instead.' }); return; }
    setBusy(key); setMsg(null);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
    const path = `${user!.id}/${key}/${Date.now()}-${safeName}`;
    const old = rows?.get(key);
    const up = await supabase.storage.from('materials').upload(path, file, { contentType: file.type || 'application/octet-stream' });
    if (up.error) { setBusy(''); setMsg({ key, tone: 'error', text: `Upload failed: ${up.error.message}` }); return; }
    const { error } = await supabase.from('materials').upsert({ user_id: user!.id, material_key: key, kind: 'file', storage_path: path, url: null, file_name: file.name, updated_at: new Date().toISOString() });
    if (error) { setBusy(''); setMsg({ key, tone: 'error', text: error.message }); return; }
    if (old?.storage_path) await supabase.storage.from('materials').remove([old.storage_path]);
    await load(); await founder.reload();
    setBusy(''); setMsg({ key, tone: 'success', text: 'Uploaded.' });
  }

  async function saveLink(key: MaterialKey) {
    const url = (links[key] ?? '').trim();
    if (!/^https?:\/\/\S+$/.test(url)) { setMsg({ key, tone: 'error', text: 'Enter a full link starting with https://' }); return; }
    setBusy(key); setMsg(null);
    const old = rows?.get(key);
    const { error } = await supabase.from('materials').upsert({ user_id: user!.id, material_key: key, kind: 'link', url, storage_path: null, file_name: null, updated_at: new Date().toISOString() });
    if (error) { setBusy(''); setMsg({ key, tone: 'error', text: error.message }); return; }
    if (old?.storage_path) await supabase.storage.from('materials').remove([old.storage_path]);
    await load(); await founder.reload();
    setBusy(''); setMsg({ key, tone: 'success', text: 'Link saved.' });
  }

  async function remove(key: MaterialKey) {
    const old = rows?.get(key);
    setBusy(key);
    await supabase.from('materials').delete().eq('user_id', user!.id).eq('material_key', key);
    if (old?.storage_path) await supabase.storage.from('materials').remove([old.storage_path]);
    await load(); await founder.reload();
    setBusy('');
  }

  async function open(row: MaterialRow) {
    // Private bucket: a short-lived signed URL, never a public link.
    const { data, error } = await supabase.storage.from('materials').createSignedUrl(row.storage_path!, SIGNED_URL_SECONDS);
    if (error) { setMsg({ key: row.material_key, tone: 'error', text: error.message }); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  if (!rows) return <Page><Loading /></Page>;
  const ready = MATERIALS.filter((m) => rows.has(m)).length;

  return (
    <Page narrow>
      <PageTitle lead="Upload or link each material once. Every program on your plan then shows what you have and what's missing. Files are private to you.">Materials</PageTitle>
      <p className="tabular mb-6 font-semibold">{ready} of {MATERIALS.length} materials added.</p>
      {msg?.key === 'all' && <Alert tone="error">{msg.text}</Alert>}
      <ul className="divide-y divide-line border-y border-line">
        {MATERIALS.map((key) => {
          const row = rows.get(key);
          const n = neededBy.get(key) ?? 0;
          return (
            <li key={key} className="flex flex-col gap-3 py-4">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h2 className="text-[length:var(--text-card)]">{valueLabel(key)}</h2>
                <span className="text-[length:var(--text-meta)] text-muted">{n > 0 ? `Needed by ${n} program${n === 1 ? '' : 's'} on your plan` : 'Not needed by your plan right now'}</span>
              </div>
              {row ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip bg-blue-tint text-navy">Ready</span>
                  {row.kind === 'file'
                    ? <button className="btn btn-quiet" onClick={() => open(row)}>Open {row.file_name}</button>
                    : <a className="btn btn-quiet break-all" href={row.url!} target="_blank" rel="noreferrer noopener">{row.url}</a>}
                  <button className="btn btn-quiet" disabled={busy === key} onClick={() => remove(key)}>Remove</button>
                </div>
              ) : <p className="text-muted">Not added yet.</p>}
              <div className="flex flex-col gap-2 md:flex-row md:items-end">
                <div>
                  <label className="field-label" htmlFor={`file-${key}`}>{row ? 'Replace with a file' : 'Upload a file'}</label>
                  <input id={`file-${key}`} type="file" className="block min-h-11 py-2" disabled={busy === key} onChange={(e) => upload(key, e)} />
                </div>
                <span className="text-muted md:pb-3">or</span>
                <div className="flex-1">
                  <label className="field-label" htmlFor={`link-${key}`}>Add a link</label>
                  <div className="flex gap-2">
                    <input id={`link-${key}`} type="url" className="input" placeholder="https://" value={links[key] ?? ''} onChange={(e) => setLinks({ ...links, [key]: e.target.value })} />
                    <button className="btn btn-secondary whitespace-nowrap" disabled={busy === key} onClick={() => saveLink(key)}>Save link</button>
                  </div>
                </div>
              </div>
              {msg?.key === key && <Alert tone={msg.tone}>{msg.text}</Alert>}
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
