// Server-side plan building for emails, feeds and shared views. Uses the same shared engine as the app.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { asPastWinners, asQuestions, asRules, buildPlan, type Opportunity, type Plan } from '../../../shared/matching/index.ts';
import { toFounderProfile, type GroupsRow } from '../../../shared/profile.ts';
import { todayEastern } from '../../../shared/dates.ts';
import { signToken, type UnsubscribePayload } from '../../../shared/signedToken.ts';

export const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

export function toOpportunity(row: Record<string, unknown>): Opportunity & { id: string } {
  return {
    ...(row as unknown as Opportunity & { id: string }),
    regions: (row.regions as string[]) ?? [],
    eligibility_rules: asRules(row.eligibility_rules),
    application_questions: asQuestions(row.application_questions),
    past_winners: asPastWinners(row.past_winners),
  };
}

/** Only verified, unarchived listings. buildPlan filters again as a second guard. */
export async function visibleOpportunities(db: SupabaseClient): Promise<(Opportunity & { id: string })[]> {
  const { data, error } = await db.from('opportunities').select('*').neq('verification_status', 'unverified').eq('archived', false);
  if (error) throw error;
  return (data ?? []).map(toOpportunity);
}

export async function planFor(db: SupabaseClient, userId: string, opps: Opportunity[], opts: { includeGroups?: boolean } = {}): Promise<{ plan: Plan; profile: Record<string, unknown> } | null> {
  const [p, g] = await Promise.all([
    db.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    db.from('profile_founder_groups').select('groups, prefer_not_to_say').eq('user_id', userId).maybeSingle(),
  ]);
  if (p.error) throw p.error;
  if (!p.data) return null;
  const profile = toFounderProfile(p.data, (g.data as GroupsRow | null) ?? null, opts);
  return { plan: buildPlan(opps, profile, todayEastern()), profile: p.data };
}

export async function unsubscribeUrl(userId: string, kind: UnsubscribePayload['kind']): Promise<string> {
  const token = await signToken({ uid: userId, kind, purpose: 'unsubscribe', exp: 0 }, Deno.env.get('CHECKIN_SIGNING_SECRET')!);
  return `${SITE_URL}/unsubscribe?t=${encodeURIComponent(token)}`;
}

/** Scheduled functions accept only calls carrying the cron secret. */
export function isCron(req: Request): boolean {
  const secret = Deno.env.get('CRON_SECRET');
  return !!secret && req.headers.get('x-cron-secret') === secret;
}

export async function emailOf(db: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await db.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

/** Records that an email was sent. Returns false if this exact email was already sent (unique key). */
export async function claimSend(db: SupabaseClient, userId: string, kind: 'digest' | 'reminder' | 'checkin', ref: string): Promise<boolean> {
  const { error } = await db.from('email_log').insert({ user_id: userId, kind, ref });
  if (error?.code === '23505') return false;
  if (error) throw error;
  return true;
}

export async function releaseSend(db: SupabaseClient, userId: string, kind: string, ref: string): Promise<void> {
  await db.from('email_log').delete().eq('user_id', userId).eq('kind', kind).eq('ref', ref);
}
