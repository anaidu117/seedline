// Database rows to the matching engine's founder profile. Used by the app and by Edge Functions.
import { PROFILE_FIELD_KEYS, type FounderGroup } from './vocab.ts';
import type { FounderProfile } from './matching/types.ts';

export interface GroupsRow { groups: FounderGroup[]; prefer_not_to_say: boolean }

/** Founder groups count only when answered and not "prefer not to say". */
export function toFounderProfile(p: Record<string, unknown>, g: GroupsRow | null, opts: { includeGroups?: boolean } = {}): FounderProfile {
  const out: Record<string, unknown> = {};
  for (const k of PROFILE_FIELD_KEYS) if (k !== 'founder_groups') out[k] = p[k] ?? undefined;
  out.milestones = (p.milestones as string[] | undefined) ?? [];
  out.founder_groups = opts.includeGroups !== false && g && !g.prefer_not_to_say ? g.groups : undefined;
  return out as FounderProfile;
}
