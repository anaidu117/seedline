// One form control for a vocabulary field, with its question and "why we ask" note.
import { PROFILE_FIELDS, US_STATES, valueLabel, type FieldDef, type ProfileFieldKey } from '../../shared/vocab.ts';
import { stateName } from '../../shared/matching/index.ts';

type Value = string | boolean | null | undefined;

export function ProfileField({ k, value, onChange, required = false }: {
  k: Exclude<ProfileFieldKey, 'founder_groups'>;
  value: Value;
  onChange: (v: Value) => void;
  required?: boolean;
}) {
  const f = PROFILE_FIELDS[k] as FieldDef;
  const id = `f-${k}`;
  const hintId = `${id}-why`;
  const why = <span id={hintId} className="field-hint">{f.why}{f.optional ? ' Optional.' : ''}</span>;

  if (f.type === 'boolean') {
    return (
      <fieldset aria-describedby={hintId}>
        <legend className="field-label">{f.question}</legend>
        <div className="flex flex-wrap gap-2">
          {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map((o) => (
            <label key={String(o.v)} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 font-semibold ${value === o.v ? 'border-carolina bg-blue-tint' : 'border-line-strong bg-bg'}`}>
              <input type="radio" name={id} className="size-4 accent-[var(--color-link)]" checked={value === o.v} onChange={() => onChange(o.v)} required={required} />
              {o.l}
            </label>
          ))}
          {!required && value !== undefined && value !== null && (
            <button type="button" className="btn btn-quiet" onClick={() => onChange(null)}>Clear answer</button>
          )}
        </div>
        {why}
      </fieldset>
    );
  }

  if (f.type === 'enum') {
    const isState = f.values === US_STATES;
    return (
      <div>
        <label htmlFor={id} className="field-label">{f.question}</label>
        <select id={id} className="input max-w-md" aria-describedby={hintId} value={(value as string) ?? ''} required={required}
          onChange={(e) => onChange(e.target.value || null)}>
          <option value="">{required ? 'Choose one' : 'Not answered'}</option>
          {f.values!.map((v) => <option key={v} value={v}>{isState ? stateName(v) : valueLabel(v, k)}</option>)}
        </select>
        {why}
      </div>
    );
  }

  if (f.type === 'month' || f.type === 'date') {
    const shown = f.type === 'month' && typeof value === 'string' ? value.slice(0, 7) : (value as string) ?? '';
    return (
      <div>
        <label htmlFor={id} className="field-label">{f.question}</label>
        <input id={id} type={f.type} className="input max-w-xs" aria-describedby={hintId} value={shown} required={required}
          onChange={(e) => onChange(e.target.value ? (f.type === 'month' ? `${e.target.value}-01` : e.target.value) : null)} />
        {why}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="field-label">{f.question}</label>
      <input id={id} className="input max-w-md" aria-describedby={hintId} value={(value as string) ?? ''} required={required} maxLength={120}
        onChange={(e) => onChange(e.target.value || null)} />
      {why}
    </div>
  );
}
