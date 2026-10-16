// Full create and edit form for every opportunity field (spec section 10).
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  DEADLINE_TYPES, FOUNDER_GROUPS, GEOGRAPHY_LEVELS, MATERIALS, OPPORTUNITY_TYPES, valueLabel, type VerificationStatus,
} from '../../../shared/vocab.ts';
import { validatePastWinners, validateQuestions, validateRules } from '../../../shared/matching/index.ts';
import { isIsoDate } from '../../../shared/dates.ts';
import { supabase } from '../../lib/supabase.ts';
import { useAuth } from '../../lib/auth.tsx';
import { Alert, Loading } from '../../components/ui.tsx';
import { markVerified, VerificationChip } from './shared.tsx';

type Form = Record<string, string | boolean | string[]>;

const EMPTY: Form = {
  slug: '', name: '', organizer: '', type: 'pitch_competition', geography_level: 'national', regions: '', description: '',
  amount_min: '', amount_max: '', amount_notes: '', equity_required: false, equity_notes: '', deadline_type: 'fixed',
  opens_at: '', deadline_at: '', decision_at: '', cycle_notes: '', application_url: '', source_url: '',
  eligibility_rules: '[]', target_groups: [], materials_required: [], application_questions: '[]',
  past_results_text: '', past_results_count: '', past_results_year: '', past_results_source_url: '', past_winners: '[]',
  archived: false,
};
const TEXT = ['slug', 'name', 'organizer', 'description', 'amount_notes', 'equity_notes', 'cycle_notes', 'application_url', 'source_url', 'past_results_text', 'past_results_source_url'];
const INTS = ['amount_min', 'amount_max', 'past_results_count', 'past_results_year'];
const DATES = ['opens_at', 'deadline_at', 'decision_at'];
const JSONS = ['eligibility_rules', 'application_questions', 'past_winners'] as const;

function toForm(row: Record<string, unknown>): Form {
  const f: Form = { ...EMPTY };
  for (const k of Object.keys(EMPTY)) {
    const v = row[k];
    if (JSONS.includes(k as (typeof JSONS)[number])) f[k] = JSON.stringify(v ?? [], null, 2);
    else if (k === 'regions') f[k] = ((v as string[]) ?? []).join('; ');
    else if (Array.isArray(v)) f[k] = v as string[];
    else if (typeof v === 'boolean') f[k] = v;
    else f[k] = v == null ? '' : String(v);
  }
  return f;
}

/** Validates the form and returns either the database row or the list of problems. */
function toRow(f: Form): { row?: Record<string, unknown>; errors: string[] } {
  const errors: string[] = [];
  const row: Record<string, unknown> = {};
  for (const k of TEXT) row[k] = String(f[k]).trim() || null;
  for (const k of ['slug', 'name', 'organizer', 'source_url']) if (!row[k]) errors.push(`${k.replace('_', ' ')} is required.`);
  if (row.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(row.slug))) errors.push('Slug must be lowercase letters, numbers and single hyphens.');
  for (const k of ['application_url', 'source_url', 'past_results_source_url']) {
    if (row[k] && !/^https?:\/\/\S+$/.test(String(row[k]))) errors.push(`${k.replaceAll('_', ' ')} must start with http:// or https://.`);
  }
  for (const k of INTS) {
    const v = String(f[k]).trim();
    if (!v) { row[k] = null; continue; }
    if (!/^\d+$/.test(v)) errors.push(`${k.replaceAll('_', ' ')} must be a whole number, digits only.`);
    row[k] = Number(v);
  }
  for (const k of DATES) {
    const v = String(f[k]).trim();
    if (!v) { row[k] = null; continue; }
    if (!isIsoDate(v)) errors.push(`${k.replaceAll('_', ' ')} must be a real date.`);
    row[k] = v;
  }
  row.type = f.type; row.geography_level = f.geography_level; row.deadline_type = f.deadline_type;
  row.equity_required = f.equity_required; row.archived = f.archived;
  row.regions = String(f.regions).split(';').map((s) => s.trim()).filter(Boolean);
  row.target_groups = f.target_groups; row.materials_required = f.materials_required;
  const validators = { eligibility_rules: validateRules, application_questions: validateQuestions, past_winners: validatePastWinners };
  for (const k of JSONS) {
    try {
      const parsed = JSON.parse(String(f[k]) || '[]');
      const problems = validators[k](parsed);
      errors.push(...problems.map((p) => `${k.replaceAll('_', ' ')}: ${p}`));
      row[k] = parsed;
    } catch { errors.push(`${k.replaceAll('_', ' ')} is not valid JSON.`); }
  }
  if (typeof row.amount_min === 'number' && typeof row.amount_max === 'number' && row.amount_min > row.amount_max) errors.push('Amount min is larger than amount max.');
  if (row.opens_at && row.deadline_at && String(row.opens_at) > String(row.deadline_at)) errors.push('Opens is after the deadline.');
  if (row.deadline_type === 'fixed' && !row.deadline_at) errors.push('A fixed deadline needs a deadline date.');
  return errors.length ? { errors } : { row, errors };
}

export default function OpportunityForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [notes, setNotes] = useState('');
  const [meta, setMeta] = useState<{ status: VerificationStatus; last_verified_at: string | null; verified_by: string | null; organizer_edited_at: string | null } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // "Create a listing from this" in the submissions queue: prefill from the submission.
    const from = params.get('from');
    if (!isNew || !from) return;
    supabase.from('submissions').select('payload').eq('id', from).single().then(({ data }) => {
      const p = (data?.payload ?? {}) as Record<string, string>;
      const slug = (p.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      setForm((f) => ({ ...(f ?? EMPTY), name: p.name ?? '', organizer: p.organizer ?? '', slug, source_url: p.url ?? '', application_url: p.url ?? '',
        deadline_at: p.deadline ?? '', amount_notes: p.amount_notes ?? '', description: p.description ?? '' }));
    });
  }, [isNew, params]);

  useEffect(() => {
    if (isNew || !id) return;
    (async () => {
      const { data, error } = await supabase.from('opportunities').select('*').eq('id', id).single();
      if (error) { setErrors([`Couldn't load this opportunity: ${error.message}`]); return; }
      setForm(toForm(data));
      setMeta({ status: data.verification_status, last_verified_at: data.last_verified_at, verified_by: data.verified_by, organizer_edited_at: data.organizer_edited_at });
      const n = await supabase.from('opportunity_research_notes').select('notes').eq('opportunity_id', id).maybeSingle();
      setNotes(n.data?.notes ?? '');
    })();
  }, [id, isNew]);

  if (!form) return errors.length ? <Alert tone="error">{errors[0]}</Alert> : <Loading />;

  const set = (k: string, v: string | boolean | string[]) => setForm({ ...form, [k]: v });

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaved('');
    const { row, errors: errs } = toRow(form!);
    setErrors(errs);
    if (!row) return;
    setBusy(true);
    const res = isNew
      ? await supabase.from('opportunities').insert(row).select('id').single()
      : await supabase.from('opportunities').update(row).eq('id', id!).select('id').single();
    if (res.error) { setBusy(false); setErrors([res.error.message]); return; }
    const newId = res.data.id as string;
    const n = await supabase.from('opportunity_research_notes').upsert({ opportunity_id: newId, notes, updated_at: new Date().toISOString() });
    setBusy(false);
    if (n.error) { setErrors([`Saved, but the research notes failed: ${n.error.message}`]); return; }
    setSaved('Saved.');
    if (isNew) navigate(`/admin/opportunities/${newId}`, { replace: true });
  }

  async function verify() {
    if (!id || !meta || !user?.email) return;
    setBusy(true);
    try {
      await markVerified(id, meta.status, user.email);
      setMeta({ ...meta, status: meta.status === 'organizer_verified' ? 'organizer_verified' : 'verified', last_verified_at: new Date().toISOString(), verified_by: user.email, organizer_edited_at: null });
      setSaved('Marked verified.');
    } catch (e) { setErrors([(e as Error).message]); }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-8" noValidate>
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin" className="btn btn-quiet">Back to opportunities</Link>
        <h2 className="text-[length:var(--text-section)]">{isNew ? 'New opportunity' : String(form.name)}</h2>
        {meta && <VerificationChip status={meta.status} />}
      </div>

      {meta && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 md:flex-row md:items-center">
          <p className="flex-1 text-[length:var(--text-meta)]">
            {meta.last_verified_at ? `Last verified ${new Date(meta.last_verified_at).toLocaleDateString('en-US', { dateStyle: 'medium' })} by ${meta.verified_by}.` : 'Never verified. Founders and the public cannot see it.'}
            {meta.organizer_edited_at && ` Edited by its organizer on ${new Date(meta.organizer_edited_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}, review the changes.`}
          </p>
          <button type="button" className="btn btn-secondary" onClick={verify} disabled={busy}>Mark verified</button>
        </div>
      )}

      {errors.length > 0 && (
        <Alert tone="error">
          <p className="font-semibold">Fix these before saving:</p>
          <ul className="mt-1 list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </Alert>
      )}
      {saved && <Alert tone="success">{saved}</Alert>}

      <Fieldset legend="Basics">
        <Text label="Name" k="name" form={form} set={set} />
        <Text label="Slug" k="slug" form={form} set={set} hint="Used in the URL. Cannot be changed by organizers." />
        <Text label="Organizer" k="organizer" form={form} set={set} />
        <Select label="Type" k="type" values={OPPORTUNITY_TYPES} form={form} set={set} />
        <Select label="Geography" k="geography_level" values={GEOGRAPHY_LEVELS} form={form} set={set} />
        <Text label="Regions" k="regions" form={form} set={set} hint="Separate with semicolons." />
        <Area label="Description" k="description" form={form} set={set} wide />
      </Fieldset>

      <Fieldset legend="Money">
        <Text label="Amount min" k="amount_min" form={form} set={set} inputMode="numeric" hint="Whole dollars. Leave empty if not disclosed." />
        <Text label="Amount max" k="amount_max" form={form} set={set} inputMode="numeric" hint="Whole dollars. Leave empty if not disclosed." />
        <Text label="Amount notes" k="amount_notes" form={form} set={set} />
        <Check label="Takes equity" k="equity_required" form={form} set={set} />
        <Text label="Equity notes" k="equity_notes" form={form} set={set} />
      </Fieldset>

      <Fieldset legend="Dates">
        <Select label="Deadline type" k="deadline_type" values={DEADLINE_TYPES} form={form} set={set} />
        <DateField label="Opens" k="opens_at" form={form} set={set} />
        <DateField label="Deadline" k="deadline_at" form={form} set={set} />
        <DateField label="Decision" k="decision_at" form={form} set={set} />
        <Text label="Cycle notes" k="cycle_notes" form={form} set={set} />
      </Fieldset>

      <Fieldset legend="Links">
        <Text label="Application URL" k="application_url" form={form} set={set} />
        <Text label="Source URL" k="source_url" form={form} set={set} hint="Where this information was confirmed. Shown to founders." />
      </Fieldset>

      <Fieldset legend="Eligibility and requirements">
        <Area label="Eligibility rules (JSON)" k="eligibility_rules" form={form} set={set} wide mono hint='A list of {"field", "op", "value", "kind"}. Fields and values come from shared/vocab.ts. Optional "note" replaces the generated gap text.' />
        <Multi label="Target founder groups" k="target_groups" values={FOUNDER_GROUPS} form={form} set={set} hint="Leave all unchecked if open to everyone." />
        <Multi label="Materials required" k="materials_required" values={MATERIALS} form={form} set={set} />
        <Area label="Application questions (JSON)" k="application_questions" form={form} set={set} wide mono hint='A list of {"text", "word_limit", "maps_to"}. maps_to is an answer bank key or null.' />
      </Fieldset>

      <Fieldset legend="Past results">
        <Area label="Past results text" k="past_results_text" form={form} set={set} wide />
        <Text label="Past results count" k="past_results_count" form={form} set={set} inputMode="numeric" />
        <Text label="Past results year" k="past_results_year" form={form} set={set} inputMode="numeric" />
        <Text label="Past results source URL" k="past_results_source_url" form={form} set={set} />
        <Area label="Past winners (JSON)" k="past_winners" form={form} set={set} wide mono hint='A list of {"name", "sector", "stage", "award", "year", "source_url"}.' />
      </Fieldset>

      <Fieldset legend="Admin only">
        <div className="md:col-span-2">
          <label htmlFor="research_notes" className="field-label">Research notes</label>
          <textarea id="research_notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <span className="field-hint">Never shown to founders, organizers or the public.</span>
        </div>
        <Check label="Archived (hidden everywhere)" k="archived" form={form} set={set} />
      </Fieldset>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-bg px-4 py-3 md:mx-0 md:px-0">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : isNew ? 'Create opportunity' : 'Save changes'}</button>
      </div>
    </form>
  );
}

type FieldProps = { label: string; k: string; form: Form; set: (k: string, v: string | boolean | string[]) => void; hint?: string };

function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-line p-4 md:p-6">
      <legend className="px-2 font-display text-[length:var(--text-card)] font-bold">{legend}</legend>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}
function Text({ label, k, form, set, hint, inputMode }: FieldProps & { inputMode?: 'numeric' }) {
  return (
    <div>
      <label htmlFor={k} className="field-label">{label}</label>
      <input id={k} className="input" inputMode={inputMode} value={String(form[k])} onChange={(e) => set(k, e.target.value)} />
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
function DateField({ label, k, form, set }: FieldProps) {
  return (
    <div>
      <label htmlFor={k} className="field-label">{label}</label>
      <input id={k} type="date" className="input" value={String(form[k])} onChange={(e) => set(k, e.target.value)} />
    </div>
  );
}
function Area({ label, k, form, set, hint, wide, mono }: FieldProps & { wide?: boolean; mono?: boolean }) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label htmlFor={k} className="field-label">{label}</label>
      <textarea id={k} className={`input ${mono ? 'font-mono text-[length:var(--text-meta)]' : ''}`} rows={mono ? 8 : 4} value={String(form[k])} onChange={(e) => set(k, e.target.value)} />
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
function Select({ label, k, values, form, set }: FieldProps & { values: readonly string[] }) {
  return (
    <div>
      <label htmlFor={k} className="field-label">{label}</label>
      <select id={k} className="input" value={String(form[k])} onChange={(e) => set(k, e.target.value)}>
        {values.map((v) => <option key={v} value={v}>{valueLabel(v)}</option>)}
      </select>
    </div>
  );
}
function Check({ label, k, form, set }: FieldProps) {
  return (
    <label className="flex min-h-11 items-center gap-3 font-semibold">
      <input type="checkbox" className="size-5 accent-[var(--color-link)]" checked={Boolean(form[k])} onChange={(e) => set(k, e.target.checked)} />
      {label}
    </label>
  );
}
function Multi({ label, k, values, form, set, hint }: FieldProps & { values: readonly string[] }) {
  const cur = form[k] as string[];
  return (
    <fieldset className="md:col-span-2">
      <legend className="field-label">{label}</legend>
      {hint && <span className="field-hint mb-2">{hint}</span>}
      <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
        {values.map((v) => (
          <label key={v} className="flex min-h-11 items-center gap-3">
            <input type="checkbox" className="size-5 accent-[var(--color-link)]" checked={cur.includes(v)}
              onChange={(e) => set(k, e.target.checked ? [...cur, v] : cur.filter((x) => x !== v))} />
            {valueLabel(v)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
