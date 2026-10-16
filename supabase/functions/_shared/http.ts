// Shared helpers for Edge Functions: CORS, JSON responses, clients, auth checks.
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';
const ALLOWED_ORIGINS = new Set([SITE_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8788']);

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : SITE_URL,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'content-type': 'application/json' } });
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: cors(req) }) : null;
}

/** Service-role client. Bypasses RLS, so only use it after checking who is asking. */
export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** A client acting as the caller, so RLS and is_admin() see their identity. */
export function callerClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function callerUser(req: Request): Promise<User | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await serviceClient().auth.getUser(token);
  if (error || !data.user) return null;
  // Only confirmed email addresses count as an identity (admins, share invites, claims).
  if (!data.user.email_confirmed_at) return null;
  return data.user;
}

/** Returns the admin user, or a 403 response. */
export async function requireAdmin(req: Request): Promise<User | Response> {
  const user = await callerUser(req);
  if (!user) return json(req, { error: 'Sign in first.' }, 401);
  const { data, error } = await callerClient(req).rpc('is_admin');
  if (error || data !== true) return json(req, { error: 'This is only available to Seedline admins.' }, 403);
  return user;
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The caller's IP as seen by the platform, hashed before it is stored anywhere. */
export function callerIp(req: Request): string {
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

/**
 * Fixed-window rate limit stored in public.rate_limits. Returns true when the request is allowed.
 * Keys are hashed so raw IPs and emails are never stored.
 */
export async function rateLimit(bucket: string, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const db = serviceClient();
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000).toISOString();
  const keyHash = await sha256Hex(`${bucket}:${key}`);
  const { data, error } = await db.rpc('bump_rate_limit', { p_bucket: bucket, p_key_hash: keyHash, p_window_start: windowStart });
  if (error) throw error;
  return (data as number) <= limit;
}
