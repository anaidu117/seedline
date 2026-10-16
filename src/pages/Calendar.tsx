import { useState } from 'react';
import { Link } from 'react-router';
import { addDays, daysBetween, formatDate, type IsoDate } from '../../shared/dates.ts';
import { ramp, urgencyT } from '../../shared/ramp.ts';
import { buildIcs } from '../../shared/ics.ts';
import type { Match } from '../../shared/matching/index.ts';
import { supabase } from '../lib/supabase.ts';
import { useAuth } from '../lib/auth.tsx';
import { useFounder, type FounderData } from '../lib/founder.ts';
import { Alert, EmptyState, Loading, Page, PageTitle } from '../components/ui.tsx';
import { RequireAuth } from '../components/RequireAuth.tsx';
import { deadlineEvent } from '../components/CalendarButtons.tsx';

export default function CalendarPage() {
  return <RequireAuth><CalendarInner /></RequireAuth>;
}

interface Item { match: Match; date: IsoDate; saved: boolean }

/** Eligible deadlines on the plan plus any saved ones, soonest first. */
function deadlines(d: FounderData): Item[] {
  const all = [...d.plan.apply_now, ...d.plan.coming_up, ...d.plan.not_ready, ...d.plan.needs_info, ...d.plan.targeted];
  const out: Item[] = [];
  for (const m of all) {
    const saved = d.applications.has(m.opportunity.id!) && d.applications.get(m.opportunity.id!)!.status !== 'skipped';
    const eligible = m.status === 'eligible' && (m.group === 'apply_now' || m.group === 'coming_up');
    if (m.window.closes && (eligible || saved)) out.push({ match: m, date: m.window.closes, saved });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.match.opportunity.name.localeCompare(b.match.opportunity.name)));
}

function CalendarInner() {
  const { user } = useAuth();
  const { data, error } = useFounder(user?.id, { updateSnapshot: false });
  const [feedUrl, setFeedUrl] = useState('');
  const [feedError, setFeedError] = useState('');

  if (error) return <Page><Alert tone="error">{error}</Alert></Page>;
  if (!data) return <Page><Loading /></Page>;
  const items = deadlines(data);
  const months = new Map<string, Item[]>();
  for (const it of items) {
    const key = it.date.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), it]);
  }

  async function makeFeed() {
    setFeedError('');
    const { data: token, error: err } = await supabase.rpc('rotate_calendar_token');
    if (err) { setFeedError(err.message); return; }
    setFeedUrl(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed?token=${token}`);
  }

  function downloadAll() {
    const blob = new Blob([buildIcs(items.map((i) => deadlineEvent(i.match.opportunity, i.date)), { name: 'Seedline deadlines' })], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'seedline-deadlines.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <Page>
      <PageTitle lead="Deadlines for programs you're eligible for, plus any you saved. Dates marked expected are projected from the last cycle.">Calendar</PageTitle>

      <section className="mb-10 rounded-xl border border-line bg-surface p-4 md:p-5">
        <h2 className="text-[length:var(--text-card)]">Subscribe in your calendar app</h2>
        <p className="mt-1 max-w-2xl text-muted">A private link that keeps your calendar up to date as your plan changes. Anyone with the link can see your deadlines, so keep it to yourself. Making a new link turns off the old one.</p>
        {feedUrl ? (
          <div className="mt-3 flex flex-col gap-2">
            <label htmlFor="feed" className="field-label">Your private feed link</label>
            <input id="feed" readOnly className="input font-mono text-[length:var(--text-meta)]" value={feedUrl} onFocus={(e) => e.target.select()} />
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(feedUrl)}>Copy link</button>
              <a className="btn btn-quiet" href={feedUrl.replace(/^https?:/, 'webcal:')}>Open in my calendar app</a>
            </div>
          </div>
        ) : (
          <button className="btn btn-secondary mt-3" onClick={makeFeed}>{data.profileRow.calendar_token_hash ? 'Make a new feed link' : 'Get my feed link'}</button>
        )}
        {feedError && <div className="mt-2"><Alert tone="error">{feedError}</Alert></div>}
        {items.length > 0 && <button className="btn btn-quiet mt-2" onClick={downloadAll}>Download all deadlines (.ics)</button>}
      </section>

      {items.length === 0 ? (
        <EmptyState title="No deadlines yet" action={{ to: '/plan', label: 'Go to my plan' }}>
          Deadlines show up here when you're eligible for a program or save one to your applications.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-10">
          {[...months.entries()].map(([month, list]) => <Month key={month} month={month} items={list} today={data.today} />)}
        </div>
      )}
    </Page>
  );
}

function Month({ month, items, today }: { month: string; items: Item[]; today: IsoDate }) {
  const first = `${month}-01`;
  const title = new Date(`${first}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const startDow = new Date(`${first}T00:00:00Z`).getUTCDay();
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const byDay = new Map<number, Item[]>();
  for (const it of items) byDay.set(Number(it.date.slice(8, 10)), [...(byDay.get(Number(it.date.slice(8, 10))) ?? []), it]);
  const dot = (d: IsoDate) => ramp(urgencyT(Math.max(0, daysBetween(today, d))));

  return (
    <section aria-labelledby={`m-${month}`}>
      <h2 id={`m-${month}`} className="text-[length:var(--text-section)]">{title}</h2>
      <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        {/* Month grid, a visual summary. The list beside it carries the same information for everyone. */}
        <div aria-hidden="true" className="hidden rounded-xl border border-line p-3 md:block">
          <div className="grid grid-cols-7 gap-1 text-center text-[length:var(--text-meta)] text-muted">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
            {Array.from({ length: startDow }, (_, i) => <div key={`b${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const date = addDays(first, i);
              const has = byDay.get(day);
              return (
                <div key={day} className={`flex h-10 flex-col items-center justify-center rounded-md tabular ${date === today ? 'border border-carolina' : ''} ${has ? 'bg-surface font-semibold text-navy' : ''}`}>
                  {day}
                  {has && <span className="mt-0.5 inline-block size-1.5 rounded-full" style={{ background: dot(date) }} />}
                </div>
              );
            })}
          </div>
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {items.map((it) => (
            <li key={`${it.match.opportunity.slug}-${it.date}`} className="flex items-start gap-4 py-3">
              <div className="w-16 shrink-0 text-center">
                <span className="block text-[length:var(--text-meta)] text-muted">{formatDate(it.date, { withYear: false }).split(' ')[0]}</span>
                <span className="tabular block font-display text-[length:var(--text-section)] font-bold leading-none">{it.date.slice(8, 10).replace(/^0/, '')}</span>
              </div>
              <div className="min-w-0 flex-1">
                <Link to={`/opportunity/${it.match.opportunity.slug}`} className="font-semibold">{it.match.opportunity.name}</Link>
                <p className="text-[length:var(--text-meta)] text-muted">
                  <span aria-hidden="true" className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: dot(it.date) }} />
                  {it.date === today ? 'Closes today' : `Closes ${formatDate(it.date)}`}{it.match.window.expected ? ' (expected)' : ''}{it.saved ? ' · Saved' : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
