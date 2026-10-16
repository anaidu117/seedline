// Loading and saving a signed-in founder's data, and computing their plan.
import { useCallback, useEffect, useState } from 'react';
import { PROFILE_FIELD_KEYS, type ApplicationStatus, type FounderGroup, type MaterialKey } from '../../shared/vocab.ts';
import {
  buildPlan, computeTotals, newlyUnlocked, nextUnlock, planStatuses, type FounderProfile, type Plan, type PlanGroup,
  type Totals, type Unlock, type Unlocked,
} from '../../shared/matching/index.ts';
import { todayEastern } from '../../shared/dates.ts';
import { supabase } from './supabase.ts';
import { fetchOpportunities, type OpportunityRow } from './opportunities.ts';
import { clearLayer0, readLayer0 } from './layer0.ts';
import { track } from './events.ts';

export type ProfileRow = Record<string, unknown> & {
  user_id: string;
  milestones: string[];
  email_digest: boolean;
  email_reminders: boolean;
  email_checkins: boolean;
};
export interface GroupsRow { groups: FounderGroup[]; prefer_not_to_say: boolean }
export interface ApplicationRow { id: string; opportunity_id: string; status: ApplicationStatus; amount_won: number | null; updated_at: string }

/** DB rows to the matching engine's profile. Founder groups count only when answered and not "prefer not to say". */
export function toFounderProfile(p: ProfileRow, g: GroupsRow | null): FounderProfile {
  const out: Record<string, unknown> = {};
  for (const k of PROFILE_FIELD_KEYS) if (k !== 'founder_groups') out[k] = p[k] ?? undefined;
  out.milestones = p.milestones ?? [];
  out.founder_groups = g && !g.prefer_not_to_say ? g.groups : undefined;
  return out as FounderProfile;
}

/**
 * Makes sure a profile row exists. On the first sign-in, Layer 0 answers saved in this browser
 * move into the profile and the "account created" event is recorded.
 */
export async function ensureProfile(userId: string): Promise<ProfileRow> {
  const existing = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data as ProfileRow;
  const layer0 = readLayer0() ?? {};
  const inserted = await supabase.from('profiles').insert({ user_id: userId, ...layer0 }).select('*').single();
  if (inserted.error) {
    // Another tab may have created it first.
    const again = await supabase.from('profiles').select('*').eq('user_id', userId).single();
    if (again.error) throw inserted.error;
    return again.data as ProfileRow;
  }
  clearLayer0();
  void track('account_created', { school: layer0.school, sector: layer0.sector });
  return inserted.data as ProfileRow;
}

export interface FounderData {
  profileRow: ProfileRow;
  groups: GroupsRow | null;
  profile: FounderProfile;
  opportunities: OpportunityRow[];
  materials: Set<MaterialKey>;
  applications: Map<string, ApplicationRow>;
  plan: Plan;
  totals: Totals;
  unlock: Unlock | null;
  /** What changed since the last time this founder's plan was computed. */
  unlocked: Unlocked[];
  firstPlan: boolean;
  today: string;
}

/**
 * Loads everything for a founder. Only the plan and profile pages pass `updateSnapshot`, so visiting
 * another page never marks "Newly unlocked" as seen.
 */
export async function loadFounder(userId: string, opts: { updateSnapshot?: boolean } = {}): Promise<FounderData> {
  const updateSnapshot = opts.updateSnapshot ?? true;
  const profileRow = await ensureProfile(userId);
  const [groupsRes, opportunities, materialsRes, appsRes, snapRes] = await Promise.all([
    supabase.from('profile_founder_groups').select('groups, prefer_not_to_say').eq('user_id', userId).maybeSingle(),
    fetchOpportunities(),
    supabase.from('materials').select('material_key').eq('user_id', userId),
    supabase.from('applications').select('id, opportunity_id, status, amount_won, updated_at').eq('user_id', userId),
    supabase.from('plan_snapshots').select('statuses').eq('user_id', userId).maybeSingle(),
  ]);
  for (const r of [groupsRes, materialsRes, appsRes, snapRes]) if (r.error) throw r.error;
  const groups = (groupsRes.data as GroupsRow | null) ?? null;
  const profile = toFounderProfile(profileRow, groups);
  const today = todayEastern();
  const plan = buildPlan(opportunities, profile, today);
  const statuses = planStatuses(plan);
  const before = (snapRes.data?.statuses as Record<string, PlanGroup> | undefined) ?? null;
  const unlocked = before ? newlyUnlocked(before, statuses) : [];
  if (!updateSnapshot) {
    // Read-only view of the plan.
  } else if (!before) {
    // Insert, not upsert: if two loads race, only the one that creates the first snapshot records the event.
    const first = await supabase.from('plan_snapshots').insert({ user_id: userId, statuses });
    if (!first.error) void track('plan_generated', { school: profile.school, sector: profile.sector });
  } else if (JSON.stringify(before) !== JSON.stringify(statuses)) {
    await supabase.from('plan_snapshots').update({ statuses, computed_at: new Date().toISOString() }).eq('user_id', userId);
  }
  return {
    profileRow, groups, profile, opportunities,
    materials: new Set((materialsRes.data ?? []).map((m) => m.material_key as MaterialKey)),
    applications: new Map((appsRes.data as ApplicationRow[] ?? []).map((a) => [a.opportunity_id, a])),
    plan, totals: computeTotals(plan), unlock: nextUnlock(opportunities, profile, today), unlocked: updateSnapshot ? unlocked : [],
    firstPlan: updateSnapshot && !before, today,
  };
}

export function useFounder(userId: string | undefined, opts: { updateSnapshot?: boolean } = {}) {
  const [data, setData] = useState<FounderData | null>(null);
  const [error, setError] = useState('');
  const updateSnapshot = opts.updateSnapshot ?? true;
  const reload = useCallback(async () => {
    if (!userId) return;
    try { setData(await loadFounder(userId, { updateSnapshot })); setError(''); } catch (e) { setError((e as Error).message); }
  }, [userId, updateSnapshot]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, error, reload, setData };
}

/** Saves an opportunity to the founder's applications (status "planning"), or leaves an existing one alone. */
export async function saveToApplications(userId: string, opportunityId: string): Promise<void> {
  const { error } = await supabase.from('applications').insert({ user_id: userId, opportunity_id: opportunityId, status: 'planning' });
  if (error && error.code !== '23505') throw error;
}
