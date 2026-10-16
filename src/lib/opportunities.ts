// Reading opportunities from the database into the shared matching types.
import { asPastWinners, asQuestions, asRules, type Opportunity } from '../../shared/matching/index.ts';
import { supabase } from './supabase.ts';

export type OpportunityRow = Opportunity & {
  id: string;
  verified_by: string | null;
  organizer_edited_at: string | null;
  created_at: string;
  updated_at: string;
};

export function toOpportunity(row: Record<string, unknown>): OpportunityRow {
  return {
    ...(row as unknown as OpportunityRow),
    regions: (row.regions as string[]) ?? [],
    eligibility_rules: asRules(row.eligibility_rules),
    application_questions: asQuestions(row.application_questions),
    past_winners: asPastWinners(row.past_winners),
    target_groups: (row.target_groups as OpportunityRow['target_groups']) ?? [],
    materials_required: (row.materials_required as OpportunityRow['materials_required']) ?? [],
  };
}

/** Everything the caller may see. For founders and the public, RLS returns verified, unarchived rows only. */
export async function fetchOpportunities(): Promise<OpportunityRow[]> {
  const { data, error } = await supabase.from('opportunities').select('*').order('name');
  if (error) throw error;
  return (data ?? []).map(toOpportunity);
}

export async function fetchOpportunity(slug: string): Promise<OpportunityRow | null> {
  const { data, error } = await supabase.from('opportunities').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data ? toOpportunity(data) : null;
}

/** Listings not verified in 90 days show "May be outdated" (spec 7.10). */
export const STALE_DAYS = 90;
export function isStale(o: Pick<Opportunity, 'last_verified_at'>, now = Date.now()): boolean {
  if (!o.last_verified_at) return true;
  return now - new Date(o.last_verified_at).getTime() > STALE_DAYS * 86_400_000;
}
