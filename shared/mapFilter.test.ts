import { describe, expect, it } from 'vitest';
import { matchesMap } from './mapFilter.ts';
import type { Opportunity } from './matching/types.ts';

const TODAY = '2026-10-15';
const base: Opportunity = {
  slug: 's', name: 'N', organizer: 'O', type: 'pitch_competition', geography_level: 'triangle', regions: [],
  amount_min: null, amount_max: 1000, equity_required: false, deadline_type: 'fixed', opens_at: '2026-10-01',
  deadline_at: '2026-11-01', decision_at: null, source_url: 'https://example.com', eligibility_rules: [], target_groups: [],
  materials_required: [], application_questions: [], past_winners: [], verification_status: 'verified', last_verified_at: null,
};
const o = (x: Partial<Opportunity>) => ({ ...base, ...x });

describe('public map filters', () => {
  it('never shows unverified or archived listings', () => {
    expect(matchesMap(o({ verification_status: 'unverified' }), {}, TODAY)).toBe(false);
    expect(matchesMap(o({ archived: true }), {}, TODAY)).toBe(false);
    expect(matchesMap(o({ verification_status: 'organizer_verified' }), {}, TODAY)).toBe(true);
  });
  it('filters by type and geography', () => {
    expect(matchesMap(base, { type: 'pitch_competition', geography: 'triangle' }, TODAY)).toBe(true);
    expect(matchesMap(base, { type: 'fellowship' }, TODAY)).toBe(false);
    expect(matchesMap(base, { geography: 'national' }, TODAY)).toBe(false);
  });
  it('filters by sector and stage through the rules; no rule means open to all', () => {
    const health = o({ eligibility_rules: [{ field: 'sector', op: 'in', value: ['health_biotech', 'medtech'], kind: 'eligibility' }] });
    expect(matchesMap(health, { sector: 'medtech' }, TODAY)).toBe(true);
    expect(matchesMap(health, { sector: 'software' }, TODAY)).toBe(false);
    expect(matchesMap(base, { sector: 'software' }, TODAY)).toBe(true);
    const later = o({ eligibility_rules: [{ field: 'stage', op: 'gte', value: 'pilot_users', kind: 'readiness' }] });
    expect(matchesMap(later, { stage: 'revenue' }, TODAY)).toBe(true);
    expect(matchesMap(later, { stage: 'idea' }, TODAY)).toBe(false);
  });
  it('filters by deadline and hides closed listings', () => {
    expect(matchesMap(base, { deadline: 'open_now' }, TODAY)).toBe(true);
    expect(matchesMap(base, { deadline: 'next_30_days' }, TODAY)).toBe(true);
    expect(matchesMap(o({ deadline_at: '2027-01-01' }), { deadline: 'next_30_days' }, TODAY)).toBe(false);
    expect(matchesMap(o({ opens_at: '2026-12-01', deadline_at: '2026-12-20' }), { deadline: 'open_now' }, TODAY)).toBe(false);
    expect(matchesMap(o({ deadline_at: '2026-10-01', opens_at: '2026-09-01' }), {}, TODAY)).toBe(false);
  });
});
