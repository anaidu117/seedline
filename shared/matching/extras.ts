// Small pure helpers used around the plan: newly unlocked, founders like you,
// past winners summary and materials readiness.
import { valueLabel, type MaterialKey } from '../vocab.ts';
import { NOT_ENOUGH_DATA } from '../money.ts';
import type { PastWinner, PlanGroup } from './types.ts';

// ---------------------------------------------------------------------------
// Newly unlocked (spec 7.3): what just became eligible or moved out of Not ready yet.
// ---------------------------------------------------------------------------

const ON_PLAN: PlanGroup[] = ['apply_now', 'coming_up', 'later'];

export interface Unlocked { slug: string; from: PlanGroup | null; to: PlanGroup }

export function newlyUnlocked(before: Record<string, PlanGroup>, after: Record<string, PlanGroup>): Unlocked[] {
  const out: Unlocked[] = [];
  for (const [slug, to] of Object.entries(after)) {
    const from = before[slug] ?? null;
    if (from === to) continue;
    const becameEligible = ON_PLAN.includes(to) && (from === null || !ON_PLAN.includes(from));
    const leftNotReady = from === 'not_ready' && to !== 'not_eligible' && to !== 'closed';
    if (becameEligible || leftNotReady) out.push({ slug, from, to });
  }
  return out.sort((a, b) => (a.slug < b.slug ? -1 : 1));
}

// ---------------------------------------------------------------------------
// Founders like you (spec section 8): same stage and sector at application time, 10 or more reports.
// ---------------------------------------------------------------------------

export const FOUNDERS_LIKE_YOU_MIN = 10;

export function foundersLikeYouLine(counts: { reported: number; won: number } | null | undefined): { shown: boolean; text: string } {
  if (!counts || counts.reported < FOUNDERS_LIKE_YOU_MIN) return { shown: false, text: `${NOT_ENOUGH_DATA}.` };
  return { shown: true, text: `${counts.won} of ${counts.reported} founders at your stage and in your sector won.` };
}

// ---------------------------------------------------------------------------
// Past winners summary (spec 7.8). Computed only from the list; nothing when the list is empty.
// ---------------------------------------------------------------------------

export function pastWinnersSummary(winners: PastWinner[], currentYear: number): string | null {
  if (winners.length === 0) return null;
  const recent = winners.filter((w) => typeof w.year === 'number' && w.year >= currentYear - 1);
  const set = recent.length > 0 ? recent : winners;
  const lead = recent.length > 0
    ? 'Last 2 years'
    : (() => {
        const years = winners.map((w) => w.year).filter((y): y is number => typeof y === 'number');
        return years.length ? `Since ${Math.min(...years)}` : 'Listed';
      })();
  const n = set.length;
  const bySector = new Map<string, number>();
  for (const w of set) if (w.sector) bySector.set(w.sector, (bySector.get(w.sector) ?? 0) + 1);
  // Most common sector; ties broken by label A to Z.
  const top = [...bySector.entries()].sort((a, b) => b[1] - a[1] || valueLabel(a[0]).localeCompare(valueLabel(b[0])))[0];
  const sectorPart = top ? `, ${top[1]} in ${valueLabel(top[0]).toLowerCase()}` : '';
  return `${lead}: ${n} winner${n === 1 ? '' : 's'}${sectorPart}.`;
}

// ---------------------------------------------------------------------------
// Materials readiness (spec 7.6). Counts only, never a percentage.
// ---------------------------------------------------------------------------

export interface Readiness { ready: number; required: number; missing: MaterialKey[] }

export function materialsReadiness(required: MaterialKey[], have: Iterable<MaterialKey>): Readiness {
  const owned = new Set(have);
  const missing = required.filter((m) => !owned.has(m));
  return { ready: required.length - missing.length, required: required.length, missing };
}

export function readinessText(r: Readiness): string {
  if (r.required === 0) return 'No materials required.';
  const head = `${r.ready} of ${r.required} materials ready.`;
  if (r.missing.length === 0) return head;
  return `${head} Missing: ${r.missing.map((m) => valueLabel(m).toLowerCase()).join(', ')}.`;
}
