// The single source of truth for every field name and allowed value in Seedline.
// Every other module (intake, matching, rules, CSV import, database enums, emails)
// imports keys from here. Do not hardcode field strings anywhere else.

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

/** Ordered: idea < prototype < pilot_users < revenue. */
export const STAGES = ['idea', 'prototype', 'pilot_users', 'revenue'] as const;
export const SECTORS = [
  'software', 'fintech', 'health_biotech', 'medtech', 'deep_tech_hardware', 'energy_climate',
  'consumer', 'education', 'social_impact', 'food_ag', 'other',
] as const;
export const SCHOOLS = ['unc', 'duke', 'nc_state', 'nccu', 'other', 'none'] as const;
export const STUDENT_STATUSES = ['undergrad', 'grad', 'recent_alum', 'faculty_staff', 'not_affiliated'] as const;
export const OPPORTUNITY_TYPES = [
  'university_grant', 'pitch_competition', 'state_grant', 'federal_grant', 'fellowship',
  'accelerator', 'showcase_conference',
] as const;
/**
 * Opportunity type groups (design decision, PROGRESS.md): money awards vs programs.
 * Shown as two chip styles; the group is meaning, not decoration.
 */
export const OPPORTUNITY_TYPE_GROUPS = ['money_award', 'program'] as const;
export type OpportunityTypeGroup = (typeof OPPORTUNITY_TYPE_GROUPS)[number];
export const OPPORTUNITY_TYPE_GROUP: Record<(typeof OPPORTUNITY_TYPES)[number], OpportunityTypeGroup> = {
  university_grant: 'money_award', pitch_competition: 'money_award', state_grant: 'money_award', federal_grant: 'money_award',
  fellowship: 'program', accelerator: 'program', showcase_conference: 'program',
};
export const TYPE_GROUP_LABELS: Record<OpportunityTypeGroup, string> = { money_award: 'Money award', program: 'Program' };

export const GEOGRAPHY_LEVELS = ['campus', 'triangle', 'north_carolina', 'southeast', 'national'] as const;
export const MATERIALS = [
  'pitch_deck', 'pitch_video', 'one_pager', 'executive_summary', 'budget', 'faculty_sponsor_letter',
  'financials', 'demo', 'team_bios', 'business_plan',
] as const;
export const ANSWER_KEYS = [
  'problem', 'solution', 'customer', 'market', 'competition', 'team', 'traction', 'business_model',
  'use_of_funds', 'impact',
] as const;
export const ANSWER_LENGTHS = ['short', 'medium', 'long'] as const;
export const MILESTONES = [
  'incorporated', 'prototype_built', 'first_pilot', 'first_paying_customer', 'first_revenue',
  'won_award', 'graduated',
] as const;
export const FOUNDER_GROUPS = [
  'woman_founder', 'veteran', 'black_founder', 'hispanic_latino_founder', 'native_american_founder',
  'first_generation_college', 'lgbtq_founder', 'founder_with_disability',
] as const;
export const VERIFICATION_STATUSES = ['unverified', 'verified', 'organizer_verified'] as const;
export const APPLICATION_STATUSES = ['planning', 'applied', 'won', 'not_selected', 'waiting', 'skipped'] as const;
export const DEADLINE_TYPES = ['fixed', 'rolling', 'recurring'] as const;
export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const EMAIL_KINDS = ['digest', 'reminder', 'checkin'] as const;
export const MATERIAL_KINDS = ['file', 'link'] as const;
export const SHARE_MODES = ['password', 'invite'] as const;
export const EVENT_NAMES = [
  'intake_started', 'layer0_finished', 'account_created', 'layer2_finished', 'plan_generated',
  'application_status_changed', 'outcome_reported', 'share_created', 'share_opened',
] as const;

// Layer 2 buckets (decided in PLAN.md Q1). All are ordered, smallest first.
export const UNIVERSITY_IP_VALUES = ['yes', 'no', 'not_sure'] as const;
export const TEAM_SIZES = ['solo', 'two_to_three', 'four_to_ten', 'eleven_plus'] as const;
export const PAYING_CUSTOMER_RANGES = ['none', 'one_to_ten', 'eleven_to_hundred', 'over_hundred'] as const;
export const MONTHLY_REVENUE_RANGES = ['none', 'under_1k', 'from_1k_to_10k', 'from_10k_to_50k', 'over_50k'] as const;
export const FUNDING_NEEDED_RANGES = ['under_10k', 'from_10k_to_50k', 'from_50k_to_250k', 'over_250k'] as const;

/** Two-letter codes for the 50 states, DC and PR, plus outside_us. */
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
  'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC',
  'ND', 'OH', 'OK', 'OR', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI',
  'WY', 'outside_us',
] as const;

export type Stage = (typeof STAGES)[number];
export type Sector = (typeof SECTORS)[number];
export type School = (typeof SCHOOLS)[number];
export type StudentStatus = (typeof STUDENT_STATUSES)[number];
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];
export type GeographyLevel = (typeof GEOGRAPHY_LEVELS)[number];
export type MaterialKey = (typeof MATERIALS)[number];
export type AnswerKey = (typeof ANSWER_KEYS)[number];
export type AnswerLength = (typeof ANSWER_LENGTHS)[number];
export type Milestone = (typeof MILESTONES)[number];
export type FounderGroup = (typeof FOUNDER_GROUPS)[number];
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type DeadlineType = (typeof DEADLINE_TYPES)[number];
export type EventName = (typeof EVENT_NAMES)[number];
export type UsState = (typeof US_STATES)[number];

/**
 * Database enums. The migration is generated from this table and
 * tests/db/enums-match-vocab.test.ts fails if the database ever differs.
 */
export const DB_ENUMS = {
  stage: STAGES,
  sector: SECTORS,
  school: SCHOOLS,
  student_status: STUDENT_STATUSES,
  opportunity_type: OPPORTUNITY_TYPES,
  geography_level: GEOGRAPHY_LEVELS,
  material_key: MATERIALS,
  answer_key: ANSWER_KEYS,
  answer_length: ANSWER_LENGTHS,
  milestone: MILESTONES,
  founder_group: FOUNDER_GROUPS,
  verification_status: VERIFICATION_STATUSES,
  application_status: APPLICATION_STATUSES,
  deadline_type: DEADLINE_TYPES,
  review_status: REVIEW_STATUSES,
  email_kind: EMAIL_KINDS,
  material_kind: MATERIAL_KINDS,
  share_mode: SHARE_MODES,
  event_name: EVENT_NAMES,
  university_ip: UNIVERSITY_IP_VALUES,
  team_size: TEAM_SIZES,
  paying_customers_range: PAYING_CUSTOMER_RANGES,
  monthly_revenue_range: MONTHLY_REVENUE_RANGES,
  funding_needed_range: FUNDING_NEEDED_RANGES,
  us_state: US_STATES,
} as const;
export type DbEnumName = keyof typeof DB_ENUMS;

// ---------------------------------------------------------------------------
// Display labels for enum values (sentence case, no all-caps).
// ---------------------------------------------------------------------------

export const VALUE_LABELS: Record<string, string> = {
  // stage
  idea: 'Idea', prototype: 'Prototype', pilot_users: 'Pilot users', revenue: 'Revenue',
  // sector
  software: 'Software', fintech: 'Fintech', health_biotech: 'Health or biotech', medtech: 'Medical devices',
  deep_tech_hardware: 'Deep tech or hardware', energy_climate: 'Energy or climate', consumer: 'Consumer',
  education: 'Education', social_impact: 'Social impact', food_ag: 'Food or agriculture', other: 'Other',
  // school (data labels for the intake form, not Seedline branding)
  unc: 'UNC Chapel Hill', duke: 'Duke', nc_state: 'NC State', nccu: 'NC Central', none: 'No school',
  // student status
  undergrad: 'Undergraduate student', grad: 'Graduate student', recent_alum: 'Recent graduate',
  faculty_staff: 'Faculty or staff', not_affiliated: 'Not affiliated with a school',
  // opportunity type
  university_grant: 'University grant', pitch_competition: 'Pitch competition', state_grant: 'State grant',
  federal_grant: 'Federal grant', fellowship: 'Fellowship', accelerator: 'Accelerator',
  showcase_conference: 'Showcase or conference',
  // geography
  campus: 'Campus', triangle: 'Research Triangle', north_carolina: 'North Carolina', southeast: 'Southeast',
  national: 'National',
  // materials
  pitch_deck: 'Pitch deck', pitch_video: 'Pitch video', one_pager: 'One-pager',
  executive_summary: 'Executive summary', budget: 'Budget', faculty_sponsor_letter: 'Faculty sponsor letter',
  financials: 'Financials', demo: 'Demo', team_bios: 'Team bios', business_plan: 'Business plan',
  // answer bank
  problem: 'Problem', solution: 'Solution', customer: 'Customer', market: 'Market',
  competition: 'Competition', team: 'Team', traction: 'Traction', business_model: 'Business model',
  use_of_funds: 'Use of funds', impact: 'Impact',
  short: 'Short', medium: 'Medium', long: 'Long',
  // milestones
  incorporated: 'Incorporated', prototype_built: 'Built a prototype', first_pilot: 'Ran a first pilot',
  first_paying_customer: 'Got a first paying customer', first_revenue: 'Earned first revenue',
  won_award: 'Won an award', graduated: 'Graduated',
  // founder groups
  woman_founder: 'Woman founder', veteran: 'Veteran', black_founder: 'Black founder',
  hispanic_latino_founder: 'Hispanic or Latino founder', native_american_founder: 'Native American founder',
  first_generation_college: 'First-generation college student', lgbtq_founder: 'LGBTQ+ founder',
  founder_with_disability: 'Founder with a disability',
  // verification
  unverified: 'Unverified', verified: 'Verified', organizer_verified: 'Verified by organizer',
  // application status
  planning: 'Planning', applied: 'Applied', won: 'Won', not_selected: 'Not selected', waiting: 'Waiting',
  skipped: 'Skipped',
  // deadline type
  fixed: 'Fixed deadline', rolling: 'Rolling', recurring: 'Recurring',
  // buckets
  yes: 'Yes', no: 'No', not_sure: 'Not sure',
  solo: 'Just me', two_to_three: '2 to 3 people', four_to_ten: '4 to 10 people', eleven_plus: '11 or more people',
  one_to_ten: '1 to 10', eleven_to_hundred: '11 to 100', over_hundred: 'More than 100',
  under_1k: 'Under $1,000 a month', from_1k_to_10k: '$1,000 to $10,000 a month',
  from_10k_to_50k: '$10,000 to $50,000 a month', over_50k: 'Over $50,000 a month',
  under_10k: 'Under $10,000',
  from_50k_to_250k: '$50,000 to $250,000', over_250k: 'Over $250,000',
  outside_us: 'Outside the US',
  // admin and system enums
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
  digest: 'Weekly digest', reminder: 'Deadline reminders', checkin: 'Outcome check-ins',
  file: 'File', link: 'Link', password: 'Password', invite: 'Invited emails',
  intake_started: 'Started intake', layer0_finished: 'Finished the basics', account_created: 'Created an account',
  layer2_finished: 'Finished company details', plan_generated: 'Plan generated',
  application_status_changed: 'Application status changed', outcome_reported: 'Outcome reported',
  share_created: 'Share link created', share_opened: 'Share link opened',
};

/** Labels where the same value key means different things in two enums. */
const CONTEXT_LABELS: Partial<Record<string, Record<string, string>>> = {
  monthly_revenue_range: { none: 'No revenue yet' },
  paying_customers: { none: 'None yet' },
  funding_needed: { from_10k_to_50k: '$10,000 to $50,000' },
  school: { other: 'Another school' },
};

/** Display names for state codes. */
export const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'Washington, DC', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  PR: 'Puerto Rico', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

export function valueLabel(value: string, field?: string): string {
  if (field && CONTEXT_LABELS[field]?.[value]) return CONTEXT_LABELS[field]![value];
  return VALUE_LABELS[value] ?? US_STATE_NAMES[value] ?? value;
}

// ---------------------------------------------------------------------------
// Founder profile fields
// ---------------------------------------------------------------------------

export type Layer = 0 | 1 | 2 | 3 | 4 | 'optional';
export type FieldType = 'enum' | 'enum_list' | 'boolean' | 'text' | 'date' | 'month';

export interface FieldDef {
  key: string;
  label: string;
  /** The question as asked in forms. */
  question: string;
  type: FieldType;
  values?: readonly string[];
  /** True when the values have an order that gte and lte can use. */
  ordered?: boolean;
  layer: Layer;
  why: string;
  optional?: boolean;
}

function field<K extends string>(def: FieldDef & { key: K }): FieldDef & { key: K } {
  return def;
}

export const PROFILE_FIELDS = {
  school: field({
    key: 'school', label: 'School', question: 'Which school are you connected to?', type: 'enum',
    values: SCHOOLS, layer: 0, why: 'Many grants and competitions are only open to one campus.',
  }),
  student_status: field({
    key: 'student_status', label: 'Student status', question: 'What is your connection to that school?',
    type: 'enum', values: STUDENT_STATUSES, layer: 0,
    why: 'Some programs are only for current students or recent graduates.',
  }),
  state: field({
    key: 'state', label: 'State', question: 'Which state are you based in?', type: 'enum', values: US_STATES,
    layer: 0, why: 'State grants and regional programs depend on where you are.',
  }),
  city: field({
    key: 'city', label: 'City', question: 'Which city are you based in?', type: 'text', layer: 0,
    why: 'Some local programs only accept founders in their area.',
  }),
  stage: field({
    key: 'stage', label: 'Stage', question: 'How far along is your company?', type: 'enum', values: STAGES,
    ordered: true, layer: 0, why: 'Programs often set a minimum or maximum stage.',
  }),
  sector: field({
    key: 'sector', label: 'Sector', question: 'Which sector fits best?', type: 'enum', values: SECTORS,
    layer: 0, why: 'Many programs focus on one industry.',
  }),
  incorporated: field({
    key: 'incorporated', label: 'Incorporated', question: 'Is your company incorporated?', type: 'boolean',
    layer: 0, why: 'Many grants can only pay a registered company.',
  }),
  incorporation_state: field({
    key: 'incorporation_state', label: 'Incorporation state', question: 'Which state is your company incorporated in?',
    type: 'enum', values: US_STATES, layer: 2, why: 'State grants often require incorporation in that state.',
  }),
  founded_on: field({
    key: 'founded_on', label: 'Founded', question: 'When did you start the company?', type: 'month', layer: 2,
    why: 'Some programs only accept companies younger than a set age.',
  }),
  university_ip: field({
    key: 'university_ip', label: 'University IP', question: 'Does your company use technology licensed from a university?',
    type: 'enum', values: UNIVERSITY_IP_VALUES, layer: 2,
    why: 'Some programs, like STTR, are built around university research.',
  }),
  team_size: field({
    key: 'team_size', label: 'Team size', question: 'How many people are on your team?', type: 'enum',
    values: TEAM_SIZES, ordered: true, layer: 2, why: 'Some programs set limits on team size.',
  }),
  paying_customers: field({
    key: 'paying_customers', label: 'Paying customers', question: 'How many paying customers do you have?',
    type: 'enum', values: PAYING_CUSTOMER_RANGES, ordered: true, layer: 2,
    why: 'Programs use this to judge traction.',
  }),
  monthly_revenue_range: field({
    key: 'monthly_revenue_range', label: 'Monthly revenue', question: 'What is your monthly revenue?',
    type: 'enum', values: MONTHLY_REVENUE_RANGES, ordered: true, layer: 2,
    why: 'Some programs have revenue minimums or caps.',
  }),
  funding_needed: field({
    key: 'funding_needed', label: 'Funding needed', question: 'How much funding are you looking for?',
    type: 'enum', values: FUNDING_NEEDED_RANGES, ordered: true, layer: 2,
    why: 'We use this to point you at programs of the right size.',
  }),
  funding_deadline: field({
    key: 'funding_deadline', label: 'Funding needed by', question: 'By when do you need the funding?', type: 'date',
    layer: 2, why: 'We use this to focus on programs that pay out in time.',
  }),
  equity_ok: field({
    key: 'equity_ok', label: 'Open to giving equity', question: 'Are you open to programs that take equity?',
    type: 'boolean', layer: 2, why: 'Some accelerators take a share of your company. We list those separately.',
  }),
  majority_us_owned: field({
    key: 'majority_us_owned', label: 'Majority US owned', question: 'Is your company more than half owned by US citizens or permanent residents?',
    type: 'boolean', layer: 2, optional: true,
    why: 'SBIR and STTR require majority US ownership. We use this only to check eligibility.',
  }),
  us_citizen_or_pr: field({
    key: 'us_citizen_or_pr', label: 'US citizen or permanent resident', question: 'Are you a US citizen or permanent resident?',
    type: 'boolean', layer: 2, optional: true,
    why: 'Some fellowships require it. We use this only to check eligibility.',
  }),
  founder_groups: field({
    key: 'founder_groups', label: 'Founder groups', question: 'Do any of these describe you? Choose all that apply.',
    type: 'enum_list', values: FOUNDER_GROUPS, layer: 'optional', optional: true,
    why: 'Some programs are only for specific groups of founders. We use this only to match you, it is never shown to anyone else.',
  }),
} as const;

export type ProfileFieldKey = keyof typeof PROFILE_FIELDS;
export const PROFILE_FIELD_KEYS = Object.keys(PROFILE_FIELDS) as ProfileFieldKey[];
export const LAYER0_FIELD_KEYS = PROFILE_FIELD_KEYS.filter((k) => PROFILE_FIELDS[k].layer === 0);
export const LAYER2_FIELD_KEYS = PROFILE_FIELD_KEYS.filter((k) => PROFILE_FIELDS[k].layer === 2);

/** Milestone labels as actions, for the next-unlock advisor. */
export const MILESTONE_ACTIONS: Record<Milestone, string> = {
  incorporated: 'Incorporating your company',
  prototype_built: 'Building a prototype',
  first_pilot: 'Running a first pilot',
  first_paying_customer: 'Getting your first paying customer',
  first_revenue: 'Earning your first revenue',
  won_award: 'Winning an award',
  graduated: 'Graduating',
};

/**
 * Milestones that also set a profile field (PLAN.md Q3).
 * Stage only ever moves up when a milestone is marked.
 */
export const MILESTONE_EFFECTS: Partial<Record<Milestone, { incorporated?: true; stageAtLeast?: Stage }>> = {
  incorporated: { incorporated: true },
  prototype_built: { stageAtLeast: 'prototype' },
  first_pilot: { stageAtLeast: 'pilot_users' },
  first_revenue: { stageAtLeast: 'revenue' },
};

/** Keys a rule's `field` may name: profile fields (except founder groups) and milestones. */
export const RULE_FIELD_KEYS = [
  ...PROFILE_FIELD_KEYS.filter((k) => k !== 'founder_groups'),
  ...MILESTONES,
] as const;
export type RuleFieldKey = (typeof RULE_FIELD_KEYS)[number];

export function isMilestone(key: string): key is Milestone {
  return (MILESTONES as readonly string[]).includes(key);
}

export const RULE_OPS = ['eq', 'in', 'not_in', 'gte', 'lte', 'exists', 'is_true', 'is_false'] as const;
export type RuleOp = (typeof RULE_OPS)[number];
export const RULE_KINDS = ['eligibility', 'readiness'] as const;
export type RuleKind = (typeof RULE_KINDS)[number];
export const RULE_KEYS = ['field', 'op', 'value', 'kind', 'note'] as const;
export const QUESTION_KEYS = ['text', 'word_limit', 'maps_to'] as const;
export const PAST_WINNER_KEYS = ['name', 'sector', 'stage', 'award', 'year', 'source_url'] as const;

/** Order lookup for ordered fields, used by gte and lte. */
export function orderOf(fieldKey: string): readonly string[] | undefined {
  const def = (PROFILE_FIELDS as Record<string, FieldDef>)[fieldKey];
  return def?.ordered ? def.values : undefined;
}

// ---------------------------------------------------------------------------
// Opportunity fields and the exact CSV columns (spec section 10)
// ---------------------------------------------------------------------------

export const CSV_COLUMNS = [
  'slug', 'name', 'organizer', 'type', 'geography_level', 'regions', 'description', 'amount_min',
  'amount_max', 'amount_notes', 'equity_required', 'equity_notes', 'deadline_type', 'opens_at',
  'deadline_at', 'decision_at', 'cycle_notes', 'application_url', 'source_url', 'eligibility_rules',
  'target_groups', 'materials_required', 'application_questions', 'past_results_text',
  'past_results_count', 'past_results_year', 'past_results_source_url', 'past_winners', 'research_notes',
] as const;
export type CsvColumn = (typeof CSV_COLUMNS)[number];

/** Opportunity fields not in the CSV, set by the system or by admins. */
export const OPPORTUNITY_SYSTEM_FIELDS = [
  'id', 'verification_status', 'last_verified_at', 'verified_by', 'archived', 'created_at', 'updated_at',
] as const;
export const OPPORTUNITY_FIELDS = [
  ...CSV_COLUMNS.filter((c) => c !== 'research_notes'),
  ...OPPORTUNITY_SYSTEM_FIELDS,
] as const;
export type OpportunityField = (typeof OPPORTUNITY_FIELDS)[number];

export const CSV_LIST_COLUMNS = ['regions', 'target_groups', 'materials_required'] as const;
export const CSV_JSON_COLUMNS = ['eligibility_rules', 'application_questions', 'past_winners'] as const;
export const CSV_DATE_COLUMNS = ['opens_at', 'deadline_at', 'decision_at'] as const;
export const CSV_INT_COLUMNS = ['amount_min', 'amount_max', 'past_results_count', 'past_results_year'] as const;
export const CSV_BOOL_COLUMNS = ['equity_required'] as const;
export const CSV_REQUIRED_COLUMNS = ['slug', 'name', 'organizer', 'type', 'geography_level', 'deadline_type', 'source_url'] as const;

// ---------------------------------------------------------------------------
// Key checking
// ---------------------------------------------------------------------------

const ALL_KNOWN_KEYS = new Set<string>([
  ...PROFILE_FIELD_KEYS, ...MILESTONES, ...MATERIALS, ...ANSWER_KEYS, ...FOUNDER_GROUPS,
  ...CSV_COLUMNS, ...OPPORTUNITY_SYSTEM_FIELDS, ...RULE_KEYS, ...QUESTION_KEYS, ...PAST_WINNER_KEYS,
  'email', 'milestones',
]);

/**
 * Throws if any key is not a vocabulary key. Call it at module load wherever
 * a table or rule set is keyed by vocabulary, so a typo fails loudly at startup.
 */
export function assertKnownKeys(keys: Iterable<string>, who: string, allowed?: Iterable<string>): void {
  const known = allowed ? new Set(allowed) : ALL_KNOWN_KEYS;
  const unknown = [...keys].filter((k) => !known.has(k));
  if (unknown.length > 0) {
    throw new Error(`${who}: unknown vocabulary key(s): ${unknown.join(', ')}`);
  }
}

export function isOneOf<T extends string>(values: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && (values as readonly string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Layers: what each one unlocks, in plain words (profile page).
// ---------------------------------------------------------------------------

export const LAYER_UNLOCKS: Record<Exclude<Layer, 1>, { title: string; unlocks: string }> = {
  0: { title: 'The basics', unlocks: 'A preview of your matches and how much you could apply for.' },
  2: { title: 'Company details', unlocks: 'State and federal matches, including SBIR, and advice on what to do next.' },
  3: { title: 'Materials and answers', unlocks: 'Readiness checks on each program and pre-filled application drafts.' },
  4: { title: 'Outcomes', unlocks: 'Results from founders like you, once enough of them have reported.' },
  optional: { title: 'Founder groups', unlocks: 'Programs set aside for specific groups of founders.' },
};

assertKnownKeys(Object.keys(MILESTONE_ACTIONS), 'vocab.MILESTONE_ACTIONS', MILESTONES);
assertKnownKeys(Object.keys(MILESTONE_EFFECTS), 'vocab.MILESTONE_EFFECTS', MILESTONES);
