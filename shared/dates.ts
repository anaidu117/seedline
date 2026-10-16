// Date helpers. All plan dates are calendar dates (YYYY-MM-DD) in Eastern time (PLAN.md Q6).
// Working with plain date strings avoids time zone drift between browser, Node and Deno.

export const PLAN_TIME_ZONE = 'America/New_York';

export type IsoDate = string; // YYYY-MM-DD

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: unknown): s is IsoDate {
  if (typeof s !== 'string' || !ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Today's date in Eastern time. */
export function todayEastern(now: Date = new Date()): IsoDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PLAN_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

function toUtc(d: IsoDate): Date {
  return new Date(`${d}T00:00:00Z`);
}

function fromUtc(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: IsoDate, days: number): IsoDate {
  const x = toUtc(d);
  x.setUTCDate(x.getUTCDate() + days);
  return fromUtc(x);
}

/** Calendar months. The day is clamped to the end of a shorter month (Jan 31 + 1 month = Feb 28). */
export function addMonths(d: IsoDate, months: number): IsoDate {
  const [y, m, day] = d.split('-').map(Number);
  const targetMonthIndex = m - 1 + months;
  const ty = y + Math.floor(targetMonthIndex / 12);
  const tm = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return fromUtc(new Date(Date.UTC(ty, tm, Math.min(day, lastDay))));
}

export function addYears(d: IsoDate, years: number): IsoDate {
  return addMonths(d, years * 12);
}

/** Whole days from a to b (positive when b is later). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

export function formatDate(d: IsoDate, opts: { withYear?: boolean } = {}): string {
  return toUtc(d).toLocaleDateString('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', ...(opts.withYear === false ? {} : { year: 'numeric' }),
  });
}

/** "today", "tomorrow", "in 9 days", "in 2 months". */
export function relativeDays(from: IsoDate, to: IsoDate): string {
  const n = daysBetween(from, to);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n < 0) return `${-n} days ago`;
  if (n < 60) return `in ${n} days`;
  return `in ${Math.round(n / 30.4)} months`;
}
