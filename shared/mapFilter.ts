// Filters for the public funding map (spec 7.12). Pure functions over verified listings only.
import { addDays, addMonths, type IsoDate } from './dates.ts';
import { outcomeOf } from './matching/evaluateRule.ts';
import { isVisible, windowFor } from './matching/buildPlan.ts';
import type { Opportunity } from './matching/types.ts';
import type { GeographyLevel, OpportunityType, Sector, Stage } from './vocab.ts';

export const DEADLINE_FILTERS = ['any', 'open_now', 'next_30_days', 'next_3_months'] as const;
export type DeadlineFilter = (typeof DEADLINE_FILTERS)[number];
export const DEADLINE_FILTER_LABELS: Record<DeadlineFilter, string> = {
  any: 'Any time', open_now: 'Open now', next_30_days: 'Closing in the next 30 days', next_3_months: 'Closing in the next 3 months',
};

export interface MapFilters {
  type?: OpportunityType | '';
  geography?: GeographyLevel | '';
  sector?: Sector | '';
  stage?: Stage | '';
  deadline?: DeadlineFilter;
}

/**
 * A listing matches a sector or stage when none of its rules on that field fail for it.
 * A listing with no sector rule is open to every sector, so it matches any sector filter.
 */
function fieldAllows(o: Opportunity, field: 'sector' | 'stage', value: string): boolean {
  return o.eligibility_rules.filter((r) => r.field === field).every((r) => outcomeOf(r, { [field]: value }) !== 'fail');
}

export function matchesMap(o: Opportunity, f: MapFilters, today: IsoDate): boolean {
  if (!isVisible(o)) return false;
  if (f.type && o.type !== f.type) return false;
  if (f.geography && o.geography_level !== f.geography) return false;
  if (f.sector && !fieldAllows(o, 'sector', f.sector)) return false;
  if (f.stage && !fieldAllows(o, 'stage', f.stage)) return false;
  const w = windowFor(o, today);
  if (w.closes && w.closes < today) return false; // closed and not recurring
  const isOpen = !w.opens || w.opens <= today;
  switch (f.deadline ?? 'any') {
    case 'open_now': return isOpen;
    case 'next_30_days': return isOpen && !!w.closes && w.closes <= addDays(today, 30);
    case 'next_3_months': return !!w.closes && w.closes <= addMonths(today, 3);
    default: return true;
  }
}
