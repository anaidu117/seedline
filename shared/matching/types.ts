import type {
  ApplicationStatus, AnswerKey, DeadlineType, FounderGroup, GeographyLevel, MaterialKey, Milestone, OpportunityType,
  RuleFieldKey, RuleKind, RuleOp, School, Sector, Stage, StudentStatus, UsState, VerificationStatus,
} from '../vocab.ts';
import type { IsoDate } from '../dates.ts';

export interface Rule {
  field: RuleFieldKey;
  op: RuleOp;
  value?: unknown;
  kind: RuleKind;
  /** Optional plain-language gap text written by an admin, used instead of the generated text. */
  note?: string;
}

export type RuleOutcome = 'pass' | 'fail' | 'unknown';

export interface RuleResult {
  rule: Rule;
  outcome: RuleOutcome;
  /** The requirement in plain words, for example "Stage is Prototype or later". */
  requirement: string;
  /** For fail: what is missing. For unknown: what to answer. Empty for pass. */
  gap: string;
  /** For pass: why it fits, in terms of the founder's own answer. Empty otherwise. */
  fit: string;
}

/**
 * A founder's answers. undefined or null means "not answered".
 * `milestones` is undefined before the founder has an account (preview), so milestone rules are unknown there.
 * `founder_groups` is undefined when not answered or "prefer not to say".
 */
export interface FounderProfile {
  school?: School | null;
  student_status?: StudentStatus | null;
  state?: UsState | null;
  city?: string | null;
  stage?: Stage | null;
  sector?: Sector | null;
  incorporated?: boolean | null;
  incorporation_state?: UsState | null;
  founded_on?: IsoDate | null;
  university_ip?: string | null;
  team_size?: string | null;
  paying_customers?: string | null;
  monthly_revenue_range?: string | null;
  funding_needed?: string | null;
  funding_deadline?: IsoDate | null;
  equity_ok?: boolean | null;
  majority_us_owned?: boolean | null;
  us_citizen_or_pr?: boolean | null;
  milestones?: Milestone[];
  founder_groups?: FounderGroup[];
}

export interface ApplicationQuestion {
  text: string;
  word_limit: number | null;
  maps_to: AnswerKey | null;
}

export interface PastWinner {
  name: string;
  sector?: string | null;
  stage?: string | null;
  award?: string | null;
  year?: number | null;
  source_url?: string | null;
}

export interface Opportunity {
  id?: string;
  slug: string;
  name: string;
  organizer: string;
  type: OpportunityType;
  geography_level: GeographyLevel;
  regions: string[];
  description?: string | null;
  amount_min: number | null;
  amount_max: number | null;
  amount_notes?: string | null;
  equity_required: boolean;
  equity_notes?: string | null;
  deadline_type: DeadlineType;
  opens_at: IsoDate | null;
  deadline_at: IsoDate | null;
  decision_at: IsoDate | null;
  cycle_notes?: string | null;
  application_url?: string | null;
  source_url: string;
  eligibility_rules: Rule[];
  target_groups: FounderGroup[];
  materials_required: MaterialKey[];
  application_questions: ApplicationQuestion[];
  past_results_text?: string | null;
  past_results_count?: number | null;
  past_results_year?: number | null;
  past_results_source_url?: string | null;
  past_winners: PastWinner[];
  verification_status: VerificationStatus;
  last_verified_at: string | null;
  archived?: boolean;
}

export type MatchStatus = 'eligible' | 'not_ready' | 'needs_info' | 'not_eligible';

/** Where a match lands on the plan page. */
export type PlanGroup =
  | 'apply_now' | 'coming_up' | 'not_ready' | 'needs_info' | 'targeted'
  | 'later' // eligible, but opens more than 9 months from now
  | 'closed' // deadline has passed and it does not recur
  | 'not_eligible';

export interface Window {
  opens: IsoDate | null;
  closes: IsoDate | null;
  decision: IsoDate | null;
  /** True when the dates were projected forward from a past cycle of a recurring program. */
  expected: boolean;
}

export interface Match {
  opportunity: Opportunity;
  status: MatchStatus;
  group: PlanGroup;
  passed: RuleResult[];
  failed: RuleResult[];
  unknown: RuleResult[];
  /** True when the program targets founder groups and the founder has not answered founder groups. */
  targeted: boolean;
  window: Window;
}

export interface Plan {
  today: IsoDate;
  apply_now: Match[];
  coming_up: Match[];
  not_ready: Match[];
  needs_info: Match[];
  targeted: Match[];
  later: Match[];
  closed: Match[];
  not_eligible: Match[];
}

export interface ApplicationRef {
  opportunity_id: string;
  status: ApplicationStatus;
}
