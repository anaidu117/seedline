import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { DEADLINE_TYPES, MATERIALS, valueLabel, type MaterialKey } from '../../shared/vocab.ts';
import { validateQuestions, validateRules } from '../../shared/matching/index.ts';
import { isIsoDate } from '../../shared/dates.ts';
import { callFunction, supabase } from '../lib/supabase.ts';
import { useAuth } from '../lib/auth.tsx';
import { fetchOpportunity, type OpportunityRow } from '../lib/opportunities.ts';
import { Alert, Loading, Page, PageTitle } from '../components/ui.tsx';
import { RequireAuth } from '../components/RequireAuth.tsx';
import NotFound from './NotFound.tsx';

export default function ClaimPage() {
  return <RequireAuth><ClaimInner /></RequireAuth>;
}

function ClaimInner() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const [o, setO] = useState<OpportunityRow | null | undefined>(undefined);
  const [claim, setClaim] = useState<{ status: string } | null | undefined>(undefined);
  const load = async () => {
    const opp = await fetchOpportunity(slug);
    setO(opp);
    if (!opp) return;
    const { data } = await supabase.from('opportunity_claims').select('status').eq('opportunity_id', opp.id).eq('user_id', user!.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    setClaim(data ?? null);
  };
  useEffect(() => { void load(); }, [slug, user?.id]);

  if (o === undefined || claim === undefined) return o === null ? <NotFound /> : <Page><Loading /></Page>;
  if (o === null) return <NotFound />;
  if (claim?.status === 'approved') return <OrganizerEditor o={o} />;
  if (claim?.status === 'pending') {
    return (
      <Page narrow>
        <PageTitle>Your claim on {o.name}</PageTitle>
        <Alert>Your claim is waiting for review. We'll email you when it's approved. Then you can edit this listing here.</Alert>
      </Page>
    );
  }
  return <ClaimForm o={o} onDone={load} rejected={claim?.status === 'rejected'} />;
}

function ClaimForm({ o, onDone, rejected }: { o: OpportunityRow; onDone: () => void; rejected: boolean }) {
  const [org, setOrg] = useState('');
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await callFunction('claim-listing', { slug: o.slug, organization: org, role_title: role, message }); onDone(); } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }
  return (
    <Page narrow>
      <PageTitle lead="If you run this program, claim the listing to keep it accurate. We review every claim. Once approved, you can edit this listing and it shows a Verified by organizer badge.">Claim {o.name}</PageTitle>
      {rejected && <div className="mb-4"><Alert>An earlier claim was not approved. You can send a new one with more detail.</Alert></div>}
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div><label htmlFor="c-org" className="field-label">Your organization</label><input id="c-org" required className="input max-w-md" value={org} onChange={(e) => setOrg(e.target.value)} /></div>
        <div><label htmlFor="c-role" className="field-label">Your role</label><input id="c-role" required className="input max-w-md" value={role} onChange={(e) => setRole(e.target.value)} /></div>
        <div>
          <label htmlFor="c-msg" className="field-label">How can we confirm you run it? <span className="font-normal text-muted">(optional)</span></label>
          <textarea id="c-msg" className="input max-w-lg" value={message} onChange={(e) => setMessage(e.target.value)} />
          <span className="field-hint">For example, a staff page that lists you, or an email address at the organizer's domain.</span>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <div><button className="btn btn-primary" disabled={busy}>Send my claim</button></div>
      </form>
    </Page>
  );
}

/** The organizer edits content fields only. RLS limits them to this listing; a trigger blocks verification fields. */
function OrganizerEditor({ o }: { o: OpportunityRow }) {
  const [f, setF] = useState<Record<string, string>>(() => ({
    name: o.name, organizer: o.organizer, description: o.description ?? '', amount_min: o.amount_min?.toString() ?? '',
    amount_max: o.amount_max?.toString() ?? '', amount_notes: o.amount_notes ?? '', equity_notes: o.equity_notes ?? '',
    deadline_type: o.deadline_type, opens_at: o.opens_at ?? '', deadline_at: o.deadline_at ?? '', decision_at: o.decision_at ?? '',
    cycle_notes: o.cycle_notes ?? '', application_url: o.application_url ?? '', source_url: o.source_url,
    eligibility_rules: JSON.stringify(o.eligibility_rules, null, 2), application_questions: JSON.stringify(o.application_questions, null, 2),
    past_results_text: o.past_results_text ?? '',
  }));
  const [equity, setEquity] = useState(o.equity_required);
  const [mats, setMats] = useState<MaterialKey[]>(o.materials_required);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState('');

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaved('');
    const errs: string[] = [];
    const num = (k: string) => { const v = f[k].trim(); if (!v) return null; if (!/^\d+$/.test(v)) { errs.push(`${k.replace('_', ' ')} must be whole dollars.`); return null; } return Number(v); };
    const date = (k: string) => { const v = f[k].trim(); if (!v) return null; if (!isIsoDate(v)) errs.push(`${k.replace('_', ' ')} must be a real date.`); return v; };
    const parse = (k: string, check: (x: unknown) => string[]) => { try { const v = JSON.parse(f[k] || '[]'); errs.push(...check(v)); return v; } catch { errs.push(`${k.replace('_', ' ')} is not valid JSON.`); return []; } };
    const row = {
      name: f.name.trim(), organizer: f.organizer.trim(), description: f.description.trim() || null, amount_min: num('amount_min'), amount_max: num('amount_max'),
      amount_notes: f.amount_notes.trim() || null, equity_required: equity, equity_notes: f.equity_notes.trim() || null, deadline_type: f.deadline_type,
      opens_at: date('opens_at'), deadline_at: date('deadline_at'), decision_at: date('decision_at'), cycle_notes: f.cycle_notes.trim() || null,
      application_url: f.application_url.trim() || null, source_url: f.source_url.trim(), eligibility_rules: parse('eligibility_rules', validateRules),
      application_questions: parse('application_questions', validateQuestions), past_results_text: f.past_results_text.trim() || null, materials_required: mats,
    };
    if (!row.name || !row.organizer || !/^https?:\/\/\S+$/.test(row.source_url)) errs.push('Name, organizer and a source link starting with https:// are required.');
    setErrors(errs);
    if (errs.length) return;
    const { error } = await supabase.from('opportunities').update(row).eq('id', o.id!);
    if (error) { setErrors([error.message]); return; }
    setSaved('Saved. Your changes are live, and Seedline will review them.');
  }

  const text = (k: string, label: string, opts: { area?: boolean; mono?: boolean; type?: string } = {}) => (
    <div className={opts.area ? 'md:col-span-2' : ''}>
      <label htmlFor={`o-${k}`} className="field-label">{label}</label>
      {opts.area
        ? <textarea id={`o-${k}`} className={`input ${opts.mono ? 'font-mono text-[length:var(--text-meta)]' : ''}`} rows={opts.mono ? 8 : 4} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        : <input id={`o-${k}`} type={opts.type ?? 'text'} className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}
    </div>
  );

  return (
    <Page narrow>
      <PageTitle lead="You manage this listing. Changes go live right away and show a Verified by organizer badge. Seedline reviews every change.">Edit {o.name}</PageTitle>
      <p className="mb-6"><Link className="link-target" to={`/opportunity/${o.slug}`}>See the public listing</Link></p>
      <form onSubmit={save} className="grid gap-5 md:grid-cols-2">
        {text('name', 'Program name')}
        {text('organizer', 'Organizer')}
        {text('description', 'Description', { area: true })}
        {text('amount_min', 'Amount min (whole dollars)')}
        {text('amount_max', 'Amount max (whole dollars)')}
        {text('amount_notes', 'Amount notes')}
        <label className="flex min-h-11 items-center gap-3 font-semibold"><input type="checkbox" className="size-5" checked={equity} onChange={(e) => setEquity(e.target.checked)} />Takes equity</label>
        {text('equity_notes', 'Equity notes')}
        <div>
          <label htmlFor="o-deadline_type" className="field-label">Deadline type</label>
          <select id="o-deadline_type" className="input" value={f.deadline_type} onChange={(e) => setF({ ...f, deadline_type: e.target.value })}>{DEADLINE_TYPES.map((d) => <option key={d} value={d}>{valueLabel(d)}</option>)}</select>
        </div>
        {text('opens_at', 'Opens', { type: 'date' })}
        {text('deadline_at', 'Deadline', { type: 'date' })}
        {text('decision_at', 'Decision', { type: 'date' })}
        {text('cycle_notes', 'Cycle notes')}
        {text('application_url', 'Application link')}
        {text('source_url', 'Source link')}
        <fieldset className="md:col-span-2">
          <legend className="field-label">Materials required</legend>
          <div className="grid sm:grid-cols-2">{MATERIALS.map((m) => (
            <label key={m} className="flex min-h-11 items-center gap-3"><input type="checkbox" className="size-5" checked={mats.includes(m)} onChange={(e) => setMats(e.target.checked ? [...mats, m] : mats.filter((x) => x !== m))} />{valueLabel(m)}</label>
          ))}</div>
        </fieldset>
        {text('eligibility_rules', 'Eligibility rules (JSON)', { area: true, mono: true })}
        {text('application_questions', 'Application questions (JSON)', { area: true, mono: true })}
        {text('past_results_text', 'Past results', { area: true })}
        <div className="md:col-span-2 flex flex-col gap-3">
          {errors.length > 0 && <Alert tone="error"><ul className="list-disc pl-5">{errors.map((x) => <li key={x}>{x}</li>)}</ul></Alert>}
          {saved && <Alert tone="success">{saved}</Alert>}
          <div><button className="btn btn-primary">Save changes</button></div>
        </div>
      </form>
    </Page>
  );
}
