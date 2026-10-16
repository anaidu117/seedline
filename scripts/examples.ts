// The 5 obviously fake EXAMPLE opportunities (spec section 10). Nothing else is seeded.
// `npx tsx scripts/examples.ts` writes data/examples.csv and supabase/seed.sql from this one list,
// so the two can never drift. tests check that both files match this output.
import { writeFileSync } from 'node:fs';
import { CSV_COLUMNS } from '../shared/vocab.ts';
import { toCsv, validateCsv } from '../shared/csv/csv.ts';

type Row = Partial<Record<(typeof CSV_COLUMNS)[number], string | number | boolean>>;
const j = (x: unknown) => JSON.stringify(x);

export const EXAMPLES: Row[] = [
  {
    slug: 'example-campus-seed-grant', name: 'EXAMPLE: Campus seed grant', organizer: 'EXAMPLE: University venture office',
    type: 'university_grant', geography_level: 'campus', regions: 'Chapel Hill',
    description: 'EXAMPLE listing to show the format. A small grant for student founders at one campus.',
    amount_min: 1000, amount_max: 5000, amount_notes: 'EXAMPLE: amounts vary by team.', equity_required: false,
    deadline_type: 'fixed', opens_at: '2026-10-01', deadline_at: '2026-11-20', decision_at: '2026-12-15',
    cycle_notes: 'EXAMPLE: one cycle each fall.', application_url: 'https://example.com/apply/campus-seed-grant',
    source_url: 'https://example.com/campus-seed-grant',
    eligibility_rules: j([
      { field: 'school', op: 'eq', value: 'unc', kind: 'eligibility' },
      { field: 'student_status', op: 'in', value: ['undergrad', 'grad', 'recent_alum'], kind: 'eligibility' },
      { field: 'stage', op: 'gte', value: 'idea', kind: 'readiness' },
    ]),
    materials_required: 'one_pager;budget;faculty_sponsor_letter',
    application_questions: j([
      { text: 'What problem are you solving?', word_limit: 150, maps_to: 'problem' },
      { text: 'Describe your solution.', word_limit: 150, maps_to: 'solution' },
      { text: 'How will you use the grant?', word_limit: 100, maps_to: 'use_of_funds' },
      { text: 'Name your faculty sponsor and their department.', word_limit: 30, maps_to: null },
    ]),
    past_results_text: 'EXAMPLE: placeholder text showing where public results go.', past_results_count: 3,
    past_results_year: 2025, past_results_source_url: 'https://example.com/campus-seed-grant/results',
    past_winners: j([
      { name: 'EXAMPLE Team A', sector: 'health_biotech', stage: 'prototype', award: 'EXAMPLE award', year: 2025, source_url: 'https://example.com/winners' },
      { name: 'EXAMPLE Team B', sector: 'software', stage: 'idea', award: 'EXAMPLE award', year: 2025, source_url: 'https://example.com/winners' },
      { name: 'EXAMPLE Team C', sector: 'health_biotech', stage: 'prototype', award: 'EXAMPLE award', year: 2026, source_url: 'https://example.com/winners' },
    ]),
    research_notes: 'Fake example row for format reference only.',
  },
  {
    slug: 'example-regional-pitch-night', name: 'EXAMPLE: Regional pitch night', organizer: 'EXAMPLE: Regional founders network',
    type: 'pitch_competition', geography_level: 'triangle', regions: 'Durham;Raleigh;Chapel Hill',
    description: 'EXAMPLE listing to show the format. A recurring pitch event with a cash prize.',
    amount_max: 10000, equity_required: false, deadline_type: 'recurring',
    opens_at: '2026-02-01', deadline_at: '2026-03-15', decision_at: '2026-04-10',
    cycle_notes: 'EXAMPLE: runs every spring.', application_url: 'https://example.com/apply/pitch-night',
    source_url: 'https://example.com/pitch-night',
    eligibility_rules: j([
      { field: 'state', op: 'eq', value: 'NC', kind: 'eligibility' },
      { field: 'stage', op: 'gte', value: 'prototype', kind: 'readiness' },
    ]),
    materials_required: 'pitch_deck;pitch_video',
    application_questions: j([
      { text: 'In two sentences, what does your company do?', word_limit: 50, maps_to: 'solution' },
      { text: 'What traction do you have?', word_limit: 100, maps_to: 'traction' },
    ]),
    research_notes: 'Fake example row for format reference only.',
  },
  {
    slug: 'example-state-matching-grant', name: 'EXAMPLE: State matching grant', organizer: 'EXAMPLE: State economic office',
    type: 'state_grant', geography_level: 'north_carolina', regions: 'North Carolina',
    description: 'EXAMPLE listing to show the format. A state grant for incorporated companies with a pilot.',
    amount_min: 10000, amount_max: 50000, equity_required: false, deadline_type: 'fixed',
    opens_at: '2026-11-01', deadline_at: '2027-01-31', decision_at: '2027-03-15',
    application_url: 'https://example.com/apply/state-grant', source_url: 'https://example.com/state-grant',
    eligibility_rules: j([
      { field: 'incorporated', op: 'is_true', kind: 'eligibility' },
      { field: 'incorporation_state', op: 'eq', value: 'NC', kind: 'eligibility' },
      { field: 'first_pilot', op: 'is_true', kind: 'readiness', note: 'Run a first pilot with a real customer before applying.' },
    ]),
    materials_required: 'business_plan;budget;financials',
    application_questions: j([
      { text: 'Describe your market.', word_limit: 250, maps_to: 'market' },
      { text: 'Describe your business model.', word_limit: 250, maps_to: 'business_model' },
    ]),
    research_notes: 'Fake example row for format reference only.',
  },
  {
    slug: 'example-federal-research-grant', name: 'EXAMPLE: Federal research grant', organizer: 'EXAMPLE: Federal agency',
    type: 'federal_grant', geography_level: 'national', regions: '',
    description: 'EXAMPLE listing to show the format. A program-level federal grant that links to current topics.',
    amount_notes: 'EXAMPLE: amount depends on the topic.', equity_required: false, deadline_type: 'rolling',
    cycle_notes: 'EXAMPLE: topics open several times a year.', application_url: 'https://example.com/apply/federal',
    source_url: 'https://example.com/federal-grant',
    eligibility_rules: j([
      { field: 'incorporated', op: 'is_true', kind: 'eligibility' },
      { field: 'majority_us_owned', op: 'is_true', kind: 'eligibility' },
      { field: 'team_size', op: 'lte', value: 'eleven_plus', kind: 'eligibility' },
    ]),
    materials_required: 'executive_summary;budget;team_bios',
    application_questions: j([
      { text: 'What is the technical innovation?', word_limit: 300, maps_to: 'solution' },
      { text: 'Who is on the team?', word_limit: 200, maps_to: 'team' },
      { text: 'What is the broader impact?', word_limit: 200, maps_to: 'impact' },
    ]),
    research_notes: 'Fake example row for format reference only.',
  },
  {
    slug: 'example-founder-accelerator', name: 'EXAMPLE: Founder accelerator', organizer: 'EXAMPLE: Accelerator program',
    type: 'accelerator', geography_level: 'southeast', regions: 'Southeast',
    description: 'EXAMPLE listing to show the format. An accelerator for specific founder groups that takes equity.',
    amount_max: 100000, equity_required: true, equity_notes: 'EXAMPLE: takes a share of the company in exchange for funding.',
    deadline_type: 'fixed', opens_at: '2027-01-15', deadline_at: '2027-03-01', decision_at: '2027-04-01',
    application_url: 'https://example.com/apply/accelerator', source_url: 'https://example.com/accelerator',
    eligibility_rules: j([{ field: 'stage', op: 'gte', value: 'pilot_users', kind: 'readiness' }]),
    target_groups: 'woman_founder;first_generation_college',
    materials_required: 'pitch_deck;one_pager;demo',
    application_questions: j([
      { text: 'Who is your customer?', word_limit: 150, maps_to: 'customer' },
      { text: 'Who are your competitors?', word_limit: 150, maps_to: 'competition' },
    ]),
    research_notes: 'Fake example row for format reference only.',
  },
];

function sqlLiteral(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v) || typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

const PG_ARRAY_TYPES: Record<string, string> = { regions: 'text[]', target_groups: 'public.founder_group[]', materials_required: 'public.material_key[]' };

export function buildFiles(): { csv: string; seed: string } {
  const csv = toCsv([[...CSV_COLUMNS], ...EXAMPLES.map((r) => CSV_COLUMNS.map((c) => r[c] ?? ''))]);
  const parsed = validateCsv(csv);
  if (parsed.headerErrors.length || parsed.rows.some((r) => !r.ok)) {
    throw new Error(`examples do not validate: ${JSON.stringify(parsed)}`);
  }
  const statements = parsed.rows.map((r) => {
    if (!r.ok) throw new Error('unreachable');
    const o = r.row.opportunity;
    const cols = Object.keys(o);
    const vals = cols.map((c) => {
      const v = o[c];
      if (PG_ARRAY_TYPES[c]) return `array[${(v as string[]).map(sqlLiteral).join(', ')}]::${PG_ARRAY_TYPES[c]}`;
      if (c === 'eligibility_rules' || c === 'application_questions' || c === 'past_winners') return `${sqlLiteral(v)}::jsonb`;
      return sqlLiteral(v);
    });
    return `insert into public.opportunities (${cols.join(', ')})\nvalues (${vals.join(', ')});\n`
      + `insert into public.opportunity_research_notes (opportunity_id, notes)\nselect id, ${sqlLiteral(r.row.research_notes)} from public.opportunities where slug = ${sqlLiteral(o.slug)};\n`;
  });
  const seed = `-- Generated by scripts/examples.ts from the same rows as data/examples.csv. Do not edit by hand.\n`
    + `-- The only seed data: 5 obviously fake EXAMPLE opportunities, all unverified.\n\n${statements.join('\n')}`;
  return { csv, seed };
}

if (process.argv[1]?.endsWith('examples.ts')) {
  const { csv, seed } = buildFiles();
  writeFileSync('data/examples.csv', csv);
  writeFileSync('supabase/seed.sql', seed);
  console.log('wrote data/examples.csv and supabase/seed.sql (5 EXAMPLE rows)');
}
