import { useState, type ChangeEvent } from 'react';
import { callFunction } from '../../lib/supabase.ts';
import { Alert } from '../../components/ui.tsx';

interface PreviewRow { line: number; slug: string; ok: boolean; errors?: string[]; exists?: boolean; diff?: { field: string; from: unknown; to: unknown }[] }
interface Preview { headerErrors: string[]; rows: PreviewRow[] }
interface Report { imported: string[]; updated: string[]; skipped: string[]; rejected: { line: number; slug: string; errors: string[] }[]; headerErrors?: string[] }

const show = (v: unknown) => (v === null || v === undefined || v === '' ? '(empty)' : typeof v === 'object' ? JSON.stringify(v) : String(v));

export default function CsvImport() {
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [overwrite, setOverwrite] = useState<Set<string>>(new Set());
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPreview(null); setReport(null); setError(''); setOverwrite(new Set());
    if (!f) return;
    setFileName(f.name);
    setCsv(await f.text());
  }

  async function check() {
    setBusy(true); setError(''); setReport(null);
    try { setPreview(await callFunction<Preview>('csv-import', { csv, mode: 'preview' })); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  async function commit() {
    setBusy(true); setError('');
    try {
      setReport(await callFunction<Report>('csv-import', { csv, mode: 'commit', overwrite: [...overwrite] }));
      setPreview(null);
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  const valid = preview?.rows.filter((r) => r.ok) ?? [];
  const willImport = valid.filter((r) => !r.exists || overwrite.has(r.slug)).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-2xl">
        <h2 className="text-[length:var(--text-section)]">Import opportunities from a CSV</h2>
        <p className="mt-2 text-muted">Every row is checked against the vocabulary first. Every imported row is unverified until you mark it verified. Rows with any problem are not imported at all. The exact column list is in the README.</p>
      </div>
      <div>
        <label htmlFor="csv-file" className="field-label">CSV file</label>
        <input id="csv-file" type="file" accept=".csv,text/csv" onChange={onFile} className="block min-h-11 py-2" />
        {fileName && <span className="field-hint">{fileName}, {csv.length.toLocaleString('en-US')} characters</span>}
      </div>
      <div><button className="btn btn-primary" onClick={check} disabled={!csv || busy}>{busy && !preview ? 'Checking...' : 'Check file'}</button></div>
      {error && <Alert tone="error">{error}</Alert>}

      {preview && preview.headerErrors.length > 0 && (
        <Alert tone="error"><p className="font-semibold">The file can't be imported:</p><ul className="mt-1 list-disc pl-5">{preview.headerErrors.map((e) => <li key={e}>{e}</li>)}</ul></Alert>
      )}

      {preview && preview.headerErrors.length === 0 && (
        <section className="flex flex-col gap-4">
          <p className="tabular font-semibold">{valid.length} of {preview.rows.length} rows are valid. {preview.rows.length - valid.length} will be rejected.</p>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {preview.rows.map((r) => (
              <li key={r.line} className="px-4 py-3">
                <p className="font-semibold">Line {r.line}: {r.slug || '(no slug)'} <span className={`chip ml-2 ${r.ok ? (r.exists ? 'bg-amber-tint text-amber-ink' : 'bg-blue-tint text-navy') : 'bg-error-tint text-error'}`}>{r.ok ? (r.exists ? 'Already exists' : 'New') : 'Rejected'}</span></p>
                {r.errors && <ul className="mt-1 list-disc pl-5 text-error">{r.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
                {r.exists && (
                  <div className="mt-2">
                    {r.diff && r.diff.length > 0 ? (
                      <>
                        <table className="w-full text-left text-[length:var(--text-meta)]">
                          <thead><tr><th className="py-1 pr-3">Field</th><th className="py-1 pr-3">Now</th><th className="py-1">In file</th></tr></thead>
                          <tbody>{r.diff.map((d) => <tr key={d.field} className="align-top"><td className="py-1 pr-3 font-semibold">{d.field}</td><td className="py-1 pr-3 break-all">{show(d.from)}</td><td className="py-1 break-all">{show(d.to)}</td></tr>)}</tbody>
                        </table>
                        <label className="mt-2 flex min-h-11 items-center gap-3 font-semibold">
                          <input type="checkbox" className="size-5" checked={overwrite.has(r.slug)} onChange={(e) => {
                            const next = new Set(overwrite);
                            if (e.target.checked) next.add(r.slug); else next.delete(r.slug);
                            setOverwrite(next);
                          }} />
                          Overwrite the existing listing (it becomes unverified)
                        </label>
                      </>
                    ) : <p className="text-muted">No differences. It will be skipped.</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div><button className="btn btn-primary" onClick={commit} disabled={busy || willImport === 0}>{busy ? 'Importing...' : `Import ${willImport} row${willImport === 1 ? '' : 's'}`}</button></div>
        </section>
      )}

      {report && (
        <section className="flex flex-col gap-3">
          <Alert tone={report.rejected.length ? 'info' : 'success'}>
            <p className="tabular font-semibold">Imported {report.imported.length}. Updated {report.updated.length}. Skipped {report.skipped.length}. Rejected {report.rejected.length}.</p>
            <p className="mt-1">Imported and updated rows are unverified. Review them in the verification queue.</p>
          </Alert>
          {report.rejected.length > 0 && (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {report.rejected.map((r) => <li key={r.line} className="px-4 py-3"><p className="font-semibold">Line {r.line}: {r.slug || '(no slug)'}</p><ul className="list-disc pl-5 text-error">{r.errors.map((e) => <li key={e}>{e}</li>)}</ul></li>)}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
