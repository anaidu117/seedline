// Shared pieces of the bold-blocks plus deadline-timeline design (approved mockup:
// design/mockups/b-plus-c.html). Shapes are brand texture; every ordinal color comes from ramp().
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { OPPORTUNITY_TYPE_GROUP, TYPE_GROUP_LABELS, valueLabel, type OpportunityType } from '../../shared/vocab.ts';
import { addMonths, daysBetween, formatDate, type IsoDate } from '../../shared/dates.ts';
import { ramp, urgencyT } from '../../shared/ramp.ts';

type ShapeSet = 'hero' | 'band' | 'small' | 'none';

const SHAPES: Record<ShapeSet, CSSProperties[]> = {
  hero: [
    { width: '24rem', height: '24rem', right: '-6rem', top: '-8rem', background: 'var(--color-navy)' },
    { width: '9rem', height: '9rem', right: '16rem', bottom: '-4rem', background: 'var(--color-blue-tint)' },
    { width: '4rem', height: '4rem', right: '12rem', top: '3.5rem', background: 'var(--color-blue-tint)' },
  ],
  band: [
    { width: '16rem', height: '16rem', right: '-4.5rem', top: '-7rem', background: 'var(--color-navy)' },
    { width: '5.5rem', height: '5.5rem', right: '9rem', bottom: '-2.5rem', background: 'var(--color-blue-tint)' },
  ],
  small: [{ width: '10rem', height: '10rem', right: '-4rem', top: '-5rem', background: 'var(--color-navy)' }],
  none: [],
};

/** The Carolina blue block. Text inside is navy. */
export function BrandBlock({ children, shapes = 'band', className = '', as: Tag = 'section', ...rest }: {
  children: ReactNode; shapes?: ShapeSet; className?: string; as?: 'section' | 'header' | 'div';
} & Record<string, unknown>) {
  return (
    <Tag className={`brand-block ${className}`} {...rest}>
      {SHAPES[shapes].map((s, i) => <span key={i} aria-hidden="true" className={`shape ${i > 0 ? 'hidden sm:block' : ''}`} style={s} />)}
      <div className="block-content">{children}</div>
    </Tag>
  );
}

/** Money award (solid navy) or program (light blue), plus the type name. */
export function TypeChip({ type }: { type: OpportunityType }) {
  const group = OPPORTUNITY_TYPE_GROUP[type];
  return (
    <span className={`chip ${group === 'money_award' ? 'chip-money' : 'chip-program'}`} title={TYPE_GROUP_LABELS[group]}>
      {valueLabel(type)}
    </span>
  );
}

export function TypeKey() {
  return (
    <p className="text-[length:var(--text-meta)] text-muted">
      <span className="chip chip-money">Money award</span> grants and competitions · <span className="chip chip-program">Program</span> fellowships, accelerators and showcases
    </p>
  );
}

export interface TimelineItem { slug: string; name: string; date: IsoDate; expected: boolean }

const WEEKS = 39;

/**
 * The 9-month deadline rail (laptop) and dated list (phone). Rail tints, pins and dots are ramp():
 * amber is close, navy is far. Only `animate` (the first plan) grows the rail.
 */
export function DeadlineTimeline({ items, today, animate = false }: { items: TimelineItem[]; today: IsoDate; animate?: boolean }) {
  const end = addMonths(today, 9);
  const span = Math.max(1, daysBetween(today, end));
  const shown = items.filter((i) => i.date >= today && i.date <= end).sort((a, b) => (a.date < b.date ? -1 : 1));
  const months = Array.from({ length: 9 }, (_, m) => {
    const d = addMonths(today, m);
    return m === 0 ? 'Today' : new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  });
  if (shown.length === 0) {
    return <p className="text-muted">No deadlines on your plan in the next 9 months yet.</p>;
  }
  // Labels alternate rows when two deadlines are close, so they never overlap.
  let lastPct = -100;
  let row = 0;
  return (
    <>
      <div className="tl hidden md:block" aria-hidden="true">
        <div className={`tl-rail ${animate ? 'rail-grow' : ''}`}>
          {Array.from({ length: WEEKS }, (_, w) => <span key={w} style={{ background: ramp(urgencyT(w * 7), 0.3) }} />)}
        </div>
        <span className="tl-today" />
        {shown.map((i) => {
          const days = daysBetween(today, i.date);
          const pct = Math.min(100, (days / span) * 100);
          row = pct - lastPct < 22 ? 1 - row : 0;
          lastPct = pct;
          return (
            <span key={i.slug}>
              <span className="tl-pin" style={{ left: `${pct}%`, background: ramp(urgencyT(days)) }} />
              <span className="tl-label" style={{ left: `${Math.min(88, Math.max(8, pct))}%`, top: row ? 0 : '1.75rem' }}>
                {i.name} · {formatDate(i.date, { withYear: false })}{i.expected ? ' (expected)' : ''}
              </span>
            </span>
          );
        })}
        <div className="tl-months">{months.map((m, k) => <span key={k} className={k === 0 ? 'font-bold text-navy' : ''}>{m}</span>)}</div>
      </div>
      {/* The same information as a list: shown on phones, and read by screen readers everywhere. */}
      <ul data-timeline-list className="divide-y divide-line border-y border-line md:sr-only">
        {shown.map((i) => {
          const days = daysBetween(today, i.date);
          return (
            <li key={i.slug} className="flex items-start gap-4 py-3">
              <div className="w-14 shrink-0 text-center">
                <span className="block text-[length:var(--text-meta)] text-muted">{new Date(`${i.date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}</span>
                <span className="tabular block font-display text-[length:var(--text-section)] font-bold leading-none">{Number(i.date.slice(8, 10))}</span>
              </div>
              <div className="min-w-0 flex-1">
                <Link to={`/opportunity/${i.slug}`} className="link-target font-semibold">{i.name}</Link>
                <p className="text-[length:var(--text-meta)] text-muted">
                  <span aria-hidden="true" className="mr-1.5 inline-block size-2.5 rounded-full align-middle" style={{ background: ramp(urgencyT(days)) }} />
                  {days === 0 ? 'Closes today' : `Closes in ${days} day${days === 1 ? '' : 's'}`}{i.expected ? ' (expected)' : ''}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function StepsPath() {
  const steps = [
    ['Tell us the basics', 'School, stage, sector and state. About two minutes, no account.'],
    ['See what fits and why', "Every match lists the rules you meet and what's missing."],
    ['Apply in order', 'Deadlines on a timeline, drafts from your saved answers, and reminders.'],
  ];
  return (
    <ol className="steps-path">
      {steps.map(([title, body], i) => (
        <li key={title}>
          <span className="step-n" aria-hidden="true">{i + 1}</span>
          <h3 className="text-[length:var(--text-card)]"><span className="sr-only">Step {i + 1}: </span>{title}</h3>
          <p className="mt-1 max-w-[22em] text-muted">{body}</p>
        </li>
      ))}
    </ol>
  );
}
