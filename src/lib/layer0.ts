// Layer 0 answers live in this browser until the founder creates an account, then move into their profile.
import { LAYER0_FIELD_KEYS } from '../../shared/vocab.ts';
import type { FounderProfile } from '../../shared/matching/index.ts';
import { readJson, removeKey, writeJson } from './storage.ts';

const KEY = 'seedline.layer0';
export type Layer0 = Pick<FounderProfile, 'school' | 'student_status' | 'state' | 'city' | 'stage' | 'sector' | 'incorporated'>;

export function readLayer0(): Layer0 | null {
  const v = readJson<Record<string, unknown>>(KEY);
  if (!v) return null;
  // Keep only Layer 0 keys, so nothing else from storage can reach the profile.
  return Object.fromEntries(LAYER0_FIELD_KEYS.filter((k) => k in v).map((k) => [k, v[k]])) as Layer0;
}
export function writeLayer0(v: Layer0): void { writeJson(KEY, v); }
export function clearLayer0(): void { removeKey(KEY); }
