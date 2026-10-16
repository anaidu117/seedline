import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. Copy .env.example to .env.');
}

export const supabase = createClient(url, key, {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
});

export const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

/** Calls an Edge Function as the signed-in user (or anonymously). Throws with the function's own error text. */
export async function callFunction<T>(name: string, body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
  if (error) {
    let message = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try { message = (await ctx.json()).error ?? message; } catch { /* keep default */ }
    }
    throw new Error(message);
  }
  return data as T;
}
