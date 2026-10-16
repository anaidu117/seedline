import { describe, expect, it } from 'vitest';
import {
  buildPlan, computeTotals, evaluateRule, foundersLikeYouLine, materialsReadiness, matchOpportunity, newlyUnlocked,
  nextUnlock, pastWinnersSummary, readinessText, validatePastWinners, validateQuestions, validateRules, windowFor,
  type FounderProfile, type Match, type Opportunity, type Rule,
} from './index.ts';

const TODAY = '2026-10-15';
let n = 0;

function opp(over: Partial<Opportunity> = {}): Opportunity {
  n += 1;
  return {
    slug: `opp-${n}`, name: `Program ${n}`, organizer: 'Org', type: 'pitch_competition', geography_level: 'national',
    regions: [], amount_min: null, amount_max: 10000, equity_required: false, deadline_type: 'fixed',
    opens_at: '2026-10-01', deadline_at: '2026-11-30', decision_at: null, source_url: 'https://example.com',
    eligibility_rules: [], target_groups: [], materials_required: [], application_questions: [], past_winners: [],
    verification_status: 'verified', last_verified_at: '2026-10-01T00:00:00Z', ...over,
  };
}

const founder: FounderProfile = {
  school: 'unc', student_status: 'grad', state: 'NC', stage: 'prototype', sector: 'health_biotech', incorporated: false,
  milestones: [],
};

const rule = (r: Partial<Rule> & Pick<Rule, 'field' | 'op'>): Rule => ({ kind: 'eligibility', ...r });

describe('evaluateRule: three-valued results', () => {
  it('pass, fail and unknown for eq', () => {
    const r = rule({ field: 'school', op: 'eq', value: 'unc' });
    expect(evaluateRule(r, founder).outcome).toBe('pass');
    expect(evaluateRule(r, { ...founder, school: 'duke' }).outcome).toBe('fail');
    expect(evaluateRule(r, { ...founder, school: undefined }).outcome).toBe('unknown');
    expect(evaluateRule(r, { ...founder, school: null }).outcome).toBe('unknown');
  });

  it('in and not_in', () => {
    expect(evaluateRule(rule({ field: 'state', op: 'in', value: ['NC', 'SC'] }), founder).outcome).toBe('pass');
    expect(evaluateRule(rule({ field: 'state', op: 'not_in', value: ['NC'] }), founder).outcome).toBe('fail');
  });

  it('gte and lte on stage use the stage order', () => {
    expect(evaluateRule(rule({ field: 'stage', op: 'gte', value: 'idea' }), founder).outcome).toBe('pass');
    expect(evaluateRule(rule({ field: 'stage', op: 'gte', value: 'prototype' }), founder).outcome).toBe('pass');
    expect(evaluateRule(rule({ field: 'stage', op: 'gte', value: 'pilot_users' }), founder).outcome).toBe('fail');
    expect(evaluateRule(rule({ field: 'stage', op: 'lte', value: 'idea' }), founder).outcome).toBe('fail');
  });

  it('gte and lte on dates', () => {
    const p = { ...founder, founded_on: '2025-03-01' };
    expect(evaluateRule(rule({ field: 'founded_on', op: 'gte', value: '2024-01-01' }), p).outcome).toBe('pass');
    expect(evaluateRule(rule({ field: 'founded_on', op: 'lte', value: '2024-01-01' }), p).outcome).toBe('fail');
  });

  it('is_true, is_false and exists', () => {
    expect(evaluateRule(rule({ field: 'incorporated', op: 'is_true' }), founder).outcome).toBe('fail');
    expect(evaluateRule(rule({ field: 'incorporated', op: 'is_false' }), founder).outcome).toBe('pass');
    expect(evaluateRule(rule({ field: 'city', op: 'exists' }), founder).outcome).toBe('unknown');
    expect(evaluateRule(rule({ field: 'city', op: 'exists' }), { ...founder, city: 'Durham' }).outcome).toBe('pass');
  });

  it('milestones are unknown before an account, then pass or fail', () => {
    const r = rule({ field: 'first_pilot', op: 'is_true', kind: 'readiness' });
    expect(evaluateRule(r, { ...founder, milestones: undefined }).outcome).toBe('unknown');
    expect(evaluateRule(r, founder).outcome).toBe('fail');
    expect(evaluateRule(r, { ...founder, milestones: ['first_pilot'] }).outcome).toBe('pass');
  });

  it('writes plain-language requirement and gap text', () => {
    const fail = evaluateRule(rule({ field: 'stage', op: 'gte', value: 'pilot_users', kind: 'readiness' }), founder);
    expect(fail.requirement).toBe('Stage is Pilot users or later');
    expect(fail.gap).toBe('Needs stage is Pilot users or later. You have: Prototype.');
    const unknown = evaluateRule(rule({ field: 'team_size', op: 'lte', value: 'four_to_ten' }), founder);
    expect(unknown.gap).toBe('Answer "How many people are on your team?" in your profile.');
    const noted = evaluateRule(rule({ field: 'incorporated', op: 'is_true', note: 'Incorporate first.' }), founder);
    expect(noted.gap).toBe('Incorporate first.');
  });
});

describe('fit text uses the founder answer', () => {
  it('names the founder value for lists and ranges, and keeps simple rules as written', () => {
    expect(evaluateRule(rule({ field: 'student_status', op: 'in', value: ['undergrad', 'grad'] }), founder).fit).toBe('Student status is Graduate student');
    expect(evaluateRule(rule({ field: 'stage', op: 'gte', value: 'idea' }), founder).fit).toBe('Stage is Prototype (needs idea or later)');
    expect(evaluateRule(rule({ field: 'school', op: 'eq', value: 'unc' }), founder).fit).toBe('School is UNC Chapel Hill');
    expect(evaluateRule(rule({ field: 'state', op: 'not_in', value: ['SC'] }), founder).fit).toBe('State is North Carolina');
  });
  it('is empty for rules that did not pass', () => {
    expect(evaluateRule(rule({ field: 'school', op: 'eq', value: 'duke' }), founder).fit).toBe('');
  });
});

describe('statuses', () => {
  it('all rules pass: eligible', () => {
    const m = matchOpportunity(opp({ eligibility_rules: [rule({ field: 'school', op: 'eq', value: 'unc' })] }), founder, TODAY);
    expect(m.status).toBe('eligible');
    expect(m.group).toBe('apply_now');
    expect(m.passed).toHaveLength(1);
  });

  it('readiness failure: not ready yet, with the gap', () => {
    const m = matchOpportunity(opp({ eligibility_rules: [
      rule({ field: 'school', op: 'eq', value: 'unc' }),
      rule({ field: 'stage', op: 'gte', value: 'revenue', kind: 'readiness' }),
    ] }), founder, TODAY);
    expect(m.status).toBe('not_ready');
    expect(m.group).toBe('not_ready');
    expect(m.failed[0].gap).toContain('Revenue');
  });

  it('eligibility failure: not eligible, hidden from the plan groups', () => {
    const o = opp({ eligibility_rules: [rule({ field: 'school', op: 'eq', value: 'duke' })] });
    const plan = buildPlan([o], founder, TODAY);
    expect(plan.not_eligible.map((m) => m.opportunity.slug)).toEqual([o.slug]);
    for (const g of ['apply_now', 'coming_up', 'not_ready', 'needs_info', 'targeted'] as const) expect(plan[g]).toEqual([]);
  });

  it('eligibility failure wins over a readiness failure and unknowns', () => {
    const m = matchOpportunity(opp({ eligibility_rules: [
      rule({ field: 'stage', op: 'gte', value: 'revenue', kind: 'readiness' }),
      rule({ field: 'team_size', op: 'eq', value: 'solo' }),
      rule({ field: 'school', op: 'eq', value: 'duke' }),
    ] }), founder, TODAY);
    expect(m.status).toBe('not_eligible');
  });

  it('unknown with nothing failing: needs info', () => {
    const m = matchOpportunity(opp({ eligibility_rules: [rule({ field: 'incorporation_state', op: 'eq', value: 'NC' })] }), founder, TODAY);
    expect(m.status).toBe('needs_info');
    expect(m.group).toBe('needs_info');
    expect(m.unknown).toHaveLength(1);
  });

  it('readiness failure plus an unknown eligibility rule: not ready yet, listing both (PLAN Q5)', () => {
    const m = matchOpportunity(opp({ eligibility_rules: [
      rule({ field: 'incorporation_state', op: 'eq', value: 'NC' }),
      rule({ field: 'stage', op: 'gte', value: 'revenue', kind: 'readiness' }),
    ] }), founder, TODAY);
    expect(m.status).toBe('not_ready');
    expect(m.unknown).toHaveLength(1);
    expect(m.failed).toHaveLength(1);
  });
});

describe('targeted programs', () => {
  const targeted = () => opp({ target_groups: ['veteran', 'woman_founder'] });

  it('go to their own section when founder groups are unanswered', () => {
    const o = targeted();
    const plan = buildPlan([o], founder, TODAY);
    expect(plan.targeted.map((m) => m.opportunity.slug)).toEqual([o.slug]);
    expect(plan.apply_now).toEqual([]);
  });

  it('join the normal plan when the founder is in one of the groups', () => {
    const o = targeted();
    const plan = buildPlan([o], { ...founder, founder_groups: ['veteran'] }, TODAY);
    expect(plan.apply_now.map((m) => m.opportunity.slug)).toEqual([o.slug]);
  });

  it('are not eligible when the founder answered and is in none of the groups', () => {
    const o = targeted();
    const plan = buildPlan([o], { ...founder, founder_groups: [] }, TODAY);
    expect(plan.not_eligible.map((m) => m.opportunity.slug)).toEqual([o.slug]);
  });

  it('still respect eligibility rules', () => {
    const o = opp({ target_groups: ['veteran'], eligibility_rules: [rule({ field: 'school', op: 'eq', value: 'duke' })] });
    expect(buildPlan([o], founder, TODAY).not_eligible).toHaveLength(1);
  });
});

describe('grouping by dates at the boundaries (today 2026-10-15)', () => {
  const groupFor = (over: Partial<Opportunity>) => matchOpportunity(opp(over), founder, TODAY).group;

  it('open now', () => expect(groupFor({ opens_at: '2026-09-01', deadline_at: '2026-12-01' })).toBe('apply_now'));
  it('no open date counts as open now', () => expect(groupFor({ opens_at: null, deadline_at: '2026-12-01' })).toBe('apply_now'));
  it('opens today', () => expect(groupFor({ opens_at: TODAY, deadline_at: '2026-12-01' })).toBe('apply_now'));
  it('deadline today has not passed', () => expect(groupFor({ opens_at: '2026-09-01', deadline_at: TODAY })).toBe('apply_now'));
  it('deadline yesterday is closed', () => expect(groupFor({ opens_at: '2026-09-01', deadline_at: '2026-10-14' })).toBe('closed'));
  it('opens in exactly 30 days: apply now', () => expect(groupFor({ opens_at: '2026-11-14', deadline_at: '2027-01-01' })).toBe('apply_now'));
  it('opens in 31 days: coming up', () => expect(groupFor({ opens_at: '2026-11-15', deadline_at: '2027-01-01' })).toBe('coming_up'));
  it('opens in exactly 9 months: coming up', () => expect(groupFor({ opens_at: '2027-07-15', deadline_at: '2027-08-01' })).toBe('coming_up'));
  it('opens 9 months and 1 day out: later', () => expect(groupFor({ opens_at: '2027-07-16', deadline_at: '2027-08-01' })).toBe('later'));
  it('rolling with no deadline: apply now', () => expect(groupFor({ deadline_type: 'rolling', opens_at: null, deadline_at: null })).toBe('apply_now'));

  it('recurring with a past deadline is projected to the next cycle and marked expected', () => {
    const o = opp({ deadline_type: 'recurring', opens_at: '2026-03-01', deadline_at: '2026-04-01', decision_at: '2026-05-01' });
    const w = windowFor(o, TODAY);
    expect(w).toEqual({ opens: '2027-03-01', closes: '2027-04-01', decision: '2027-05-01', expected: true });
    expect(matchOpportunity(o, founder, TODAY).group).toBe('coming_up');
  });

  it('fixed with a past deadline is not projected', () => {
    const o = opp({ deadline_type: 'fixed', opens_at: '2026-03-01', deadline_at: '2026-04-01' });
    expect(windowFor(o, TODAY).expected).toBe(false);
    expect(matchOpportunity(o, founder, TODAY).group).toBe('closed');
  });
});

describe('ranking within a group', () => {
  const slugs = (ms: Match[]) => ms.map((m) => m.opportunity.name);

  it('nearest deadline first', () => {
    const plan = buildPlan([
      opp({ name: 'Later', deadline_at: '2026-12-20' }),
      opp({ name: 'Sooner', deadline_at: '2026-11-01' }),
      opp({ name: 'Undated', deadline_type: 'rolling', deadline_at: null }),
    ], founder, TODAY);
    expect(slugs(plan.apply_now)).toEqual(['Sooner', 'Later', 'Undated']);
  });

  it('then larger amount_max, undisclosed last', () => {
    const plan = buildPlan([
      opp({ name: 'Small', amount_max: 1000 }),
      opp({ name: 'Unknown', amount_max: null }),
      opp({ name: 'Big', amount_max: 50000 }),
    ], founder, TODAY);
    expect(slugs(plan.apply_now)).toEqual(['Big', 'Small', 'Unknown']);
  });

  it('then name, A to Z', () => {
    const plan = buildPlan([opp({ name: 'Beta' }), opp({ name: 'alpha' }), opp({ name: 'Gamma' })], founder, TODAY);
    expect(slugs(plan.apply_now)).toEqual(['alpha', 'Beta', 'Gamma']);
  });

  it('is independent of input order', () => {
    const list = [opp({ name: 'Same' }), opp({ name: 'Same' }), opp({ name: 'Other', amount_max: 5 })];
    const a = buildPlan(list, founder, TODAY).apply_now.map((m) => m.opportunity.slug);
    const b = buildPlan([...list].reverse(), founder, TODAY).apply_now.map((m) => m.opportunity.slug);
    expect(a).toEqual(b);
  });
});

describe('unverified and archived listings', () => {
  it('never reach any plan group', () => {
    const plan = buildPlan([opp({ verification_status: 'unverified' }), opp({ archived: true })], founder, TODAY);
    const all = Object.entries(plan).filter(([k]) => k !== 'today').flatMap(([, v]) => v as Match[]);
    expect(all).toEqual([]);
  });

  it('organizer verified listings count as verified (PLAN Q4)', () => {
    expect(buildPlan([opp({ verification_status: 'organizer_verified' })], founder, TODAY).apply_now).toHaveLength(1);
  });
});

describe('"up to" totals', () => {
  it('sums eligible non-equity amounts, split into open now and opening later', () => {
    const plan = buildPlan([
      opp({ amount_max: 10000 }),
      opp({ amount_max: 5000 }),
      opp({ amount_max: 20000, opens_at: '2027-02-01', deadline_at: '2027-03-01' }),
    ], founder, TODAY);
    const t = computeTotals(plan);
    expect(t).toMatchObject({ openNow: 15000, openingLater: 20000, total: 35000, count: 3 });
  });

  it('excludes equity programs from the sum and lists them separately', () => {
    const eq = opp({ amount_max: 100000, equity_required: true });
    const t = computeTotals(buildPlan([opp({ amount_max: 1000 }), eq], founder, TODAY));
    expect(t.total).toBe(1000);
    expect(t.equity.map((o) => o.slug)).toEqual([eq.slug]);
  });

  it('counts undisclosed amounts in the note, not the sum', () => {
    const t = computeTotals(buildPlan([opp({ amount_max: 1000 }), opp({ amount_max: null }), opp({ amount_max: null })], founder, TODAY));
    expect(t.total).toBe(1000);
    expect(t.count).toBe(1);
    expect(t.undisclosed).toHaveLength(2);
  });

  it('excludes unverified programs even if one reaches the totals directly', () => {
    const good = matchOpportunity(opp({ amount_max: 1000 }), founder, TODAY);
    const bad = matchOpportunity(opp({ amount_max: 99999, verification_status: 'unverified' }), founder, TODAY);
    expect(computeTotals({ apply_now: [good, bad], coming_up: [] }).total).toBe(1000);
  });

  it('only counts eligible programs, not not-ready, needs-info or targeted ones', () => {
    const plan = buildPlan([
      opp({ amount_max: 1000 }),
      opp({ amount_max: 5000, eligibility_rules: [rule({ field: 'stage', op: 'gte', value: 'revenue', kind: 'readiness' })] }),
      opp({ amount_max: 5000, eligibility_rules: [rule({ field: 'team_size', op: 'eq', value: 'solo' })] }),
      opp({ amount_max: 5000, target_groups: ['veteran'] }),
    ], founder, TODAY);
    expect(computeTotals(plan).total).toBe(1000);
  });
});

describe('next-unlock advisor', () => {
  const needs = (r: Partial<Rule> & Pick<Rule, 'field' | 'op'>, over: Partial<Opportunity> = {}) =>
    opp({ eligibility_rules: [rule({ kind: 'readiness', ...r })], ...over });

  it('picks the change with the largest verified non-equity addition', () => {
    const list = [
      needs({ field: 'first_pilot', op: 'is_true' }, { amount_max: 5000 }),
      needs({ field: 'first_pilot', op: 'is_true' }, { amount_max: 5000 }),
      needs({ field: 'first_paying_customer', op: 'is_true' }, { amount_max: 50000 }),
    ];
    const u = nextUnlock(list, founder, TODAY);
    expect(u?.key).toBe('first_paying_customer');
    expect(u?.amount).toBe(50000);
    expect(u?.message).toBe('Getting your first paying customer would make you eligible for 1 more program worth up to $50,000.');
  });

  it('ignores equity and unverified programs in count and amount', () => {
    const list = [
      needs({ field: 'won_award', op: 'is_true' }, { amount_max: 900000, equity_required: true }),
      needs({ field: 'won_award', op: 'is_true' }, { amount_max: 900000, verification_status: 'unverified' }),
      needs({ field: 'first_pilot', op: 'is_true' }, { amount_max: 100 }),
    ];
    expect(nextUnlock(list, founder, TODAY)?.key).toBe('first_pilot');
  });

  it('breaks amount ties by count, then by name', () => {
    const byCount = [
      needs({ field: 'first_pilot', op: 'is_true' }, { amount_max: 5000 }),
      needs({ field: 'first_pilot', op: 'is_true' }, { amount_max: null }),
      needs({ field: 'won_award', op: 'is_true' }, { amount_max: 5000 }),
    ];
    expect(nextUnlock(byCount, founder, TODAY)?.key).toBe('first_pilot');
    const byName = [
      needs({ field: 'won_award', op: 'is_true' }, { amount_max: 5000 }),
      needs({ field: 'first_pilot', op: 'is_true' }, { amount_max: 5000 }),
    ];
    // "Running a first pilot" sorts before "Winning an award".
    expect(nextUnlock(byName, founder, TODAY)?.key).toBe('first_pilot');
  });

  it('phrases incorporating in a state as an action', () => {
    const list = [needs({ field: 'incorporation_state', op: 'eq', value: 'NC', kind: 'eligibility' }, { amount_max: 65000 })];
    const u = nextUnlock(list, founder, TODAY);
    expect(u?.message).toBe('Incorporating in North Carolina would make you eligible for 1 more program worth up to $65,000.');
  });

  it('applies milestone effects: marking first revenue raises stage', () => {
    const list = [needs({ field: 'stage', op: 'gte', value: 'revenue' }, { amount_max: 7000 })];
    expect(nextUnlock(list, founder, TODAY)?.key).toBe('first_revenue');
  });

  it('never suggests citizenship or founder groups', () => {
    const list = [
      needs({ field: 'us_citizen_or_pr', op: 'is_true', kind: 'eligibility' }, { amount_max: 100000 }),
      opp({ target_groups: ['veteran'], amount_max: 100000 }),
    ];
    expect(nextUnlock(list, { ...founder, milestones: [...['incorporated', 'prototype_built', 'first_pilot', 'first_paying_customer', 'first_revenue', 'won_award', 'graduated'] as const] }, TODAY)).toBeNull();
  });

  it('returns null when nothing would help', () => {
    expect(nextUnlock([opp()], founder, TODAY)).toBeNull();
  });
});

describe('founders like you threshold', () => {
  it('is hidden at 9 reports', () => {
    expect(foundersLikeYouLine({ reported: 9, won: 4 })).toEqual({ shown: false, text: 'Not enough data yet.' });
  });
  it('is shown at 10, with the count', () => {
    expect(foundersLikeYouLine({ reported: 10, won: 3 })).toEqual({ shown: true, text: '3 of 10 founders at your stage and in your sector won.' });
  });
  it('is hidden with no data', () => {
    expect(foundersLikeYouLine(null).shown).toBe(false);
  });
});

describe('newly unlocked', () => {
  it('lists programs that became eligible or left not ready yet', () => {
    const out = newlyUnlocked(
      { a: 'not_ready', b: 'needs_info', c: 'apply_now', d: 'not_ready' },
      { a: 'apply_now', b: 'coming_up', c: 'apply_now', d: 'needs_info', e: 'apply_now' },
    );
    expect(out.map((u) => u.slug)).toEqual(['a', 'b', 'd', 'e']);
  });
  it('is empty when nothing changed', () => {
    expect(newlyUnlocked({ a: 'apply_now' }, { a: 'apply_now' })).toEqual([]);
  });
});

describe('past winners summary', () => {
  it('summarizes the last 2 years from the list', () => {
    const w = [
      { name: 'A', sector: 'health_biotech', year: 2026 }, { name: 'B', sector: 'health_biotech', year: 2025 },
      { name: 'C', sector: 'software', year: 2025 }, { name: 'D', sector: 'software', year: 2020 },
    ];
    expect(pastWinnersSummary(w, 2026)).toBe('Last 2 years: 3 winners, 2 in health or biotech.');
  });
  it('shows nothing for an empty list', () => {
    expect(pastWinnersSummary([], 2026)).toBeNull();
  });
});

describe('materials readiness', () => {
  it('counts, never a percentage', () => {
    const r = materialsReadiness(['pitch_deck', 'budget', 'team_bios', 'demo'], ['pitch_deck', 'demo', 'team_bios']);
    expect(r).toEqual({ ready: 3, required: 4, missing: ['budget'] });
    expect(readinessText(r)).toBe('3 of 4 materials ready. Missing: budget.');
  });
});

describe('rule validation', () => {
  it('accepts valid rules', () => {
    expect(validateRules([
      { field: 'stage', op: 'gte', value: 'prototype', kind: 'readiness' },
      { field: 'state', op: 'in', value: ['NC'], kind: 'eligibility' },
      { field: 'first_pilot', op: 'is_true', kind: 'readiness' },
    ])).toEqual([]);
  });
  it('rejects unknown fields, ops, keys and values', () => {
    expect(validateRules([{ field: 'stge', op: 'eq', value: 'idea', kind: 'eligibility' }])[0]).toMatch(/unknown field "stge"/);
    expect(validateRules([{ field: 'stage', op: 'like', value: 'idea', kind: 'eligibility' }])[0]).toMatch(/unknown op/);
    expect(validateRules([{ field: 'stage', op: 'eq', value: 'idea', kind: 'eligibility', extra: 1 }])[0]).toMatch(/unknown vocabulary key.*extra/);
    expect(validateRules([{ field: 'stage', op: 'eq', value: 'seed', kind: 'eligibility' }])[0]).toMatch(/not a valid value/);
    expect(validateRules([{ field: 'sector', op: 'gte', value: 'software', kind: 'eligibility' }])[0]).toMatch(/only works on ordered/);
  });
  it('validates questions and past winners', () => {
    expect(validateQuestions([{ text: 'Q', word_limit: 100, maps_to: 'problem' }])).toEqual([]);
    expect(validateQuestions([{ text: 'Q', word_limit: 100, maps_to: 'problme' }])[0]).toMatch(/not an answer bank key/);
    expect(validatePastWinners([{ name: 'X', sector: 'software', year: 2025 }])).toEqual([]);
    expect(validatePastWinners([{ name: 'X', sector: 'crypto' }])[0]).toMatch(/unknown sector/);
  });
});
