// "Founders like you" counts for many listings in one call. Aggregates only; the database
// returns nothing for a listing below 10 reports.
import { useEffect, useState } from 'react';
import type { Sector, Stage } from '../../shared/vocab.ts';
import { supabase } from './supabase.ts';

export type FlyCounts = { reported: number; won: number };
/** 'signin' when the viewer has no profile to compare with; a Map once loaded; undefined while loading. */
export type FlyState = Map<string, FlyCounts> | 'signin' | undefined;

export function useFoundersLikeYou(ids: string[], who: { stage?: Stage | null; sector?: Sector | null } | null): FlyState {
  const [state, setState] = useState<FlyState>(undefined);
  const key = ids.join(',');
  useEffect(() => {
    if (!who) { setState('signin'); return; }
    if (!who.stage || !who.sector || ids.length === 0) { setState(new Map()); return; }
    let active = true;
    supabase.rpc('founders_like_you_many', { opps: ids, p_stage: who.stage, p_sector: who.sector }).then(({ data }) => {
      if (active) setState(new Map((data ?? []).map((r: FlyCounts & { opportunity_id: string }) => [r.opportunity_id, r])));
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, who?.stage, who?.sector, who === null]);
  return state;
}

/** The value one card should show. */
export function flyFor(state: FlyState, id: string | undefined): FlyCounts | null | undefined | 'signin' {
  if (state === undefined || state === 'signin') return state;
  return id ? state.get(id) ?? null : null;
}
