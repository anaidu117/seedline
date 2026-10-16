// Internal metrics only (spec 7.5). Writes one row to public.events. No third-party analytics.
import type { EventName, School, Sector } from '../../shared/vocab.ts';
import { supabase } from './supabase.ts';
import { readJson, safeSession, writeJson } from './storage.ts';

const ANON_KEY = 'seedline.anon_id';

/** A random ID for this browser, used only to count visitors who start intake (PLAN.md Q17). */
export function anonId(): string {
  let id = readJson<string>(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
    writeJson(ANON_KEY, id);
  }
  return id;
}

/** Records an event. `once` keys dedupe within this browser tab session. Failures never block the founder. */
export async function track(name: EventName, props: { school?: School | null; sector?: Sector | null } = {}, opts: { once?: string } = {}): Promise<void> {
  const session = safeSession();
  if (opts.once) {
    if (readJson<boolean>(`seedline.once.${opts.once}`, session)) return;
    writeJson(`seedline.once.${opts.once}`, true, session);
  }
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id ?? null;
  await supabase.from('events').insert({
    name,
    user_id: userId,
    anon_id: userId ? null : anonId(),
    school: props.school ?? null,
    sector: props.sector ?? null,
  });
}
