// Helpers for tests that run against the local Supabase stack (npx supabase start).
import { execSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import pg from 'pg';

let cached: Record<string, string> | undefined;

/** Reads the local stack's URLs and keys from `supabase status`. These are local demo keys, not secrets. */
export function localEnv(): Record<string, string> {
  if (cached) return cached;
  const out = execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  cached = Object.fromEntries(
    out.split('\n').filter((l) => l.includes('=')).map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
    }),
  );
  return cached;
}

export function adminClient(): SupabaseClient {
  const env = localEnv();
  return createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function anonClient(): SupabaseClient {
  const env = localEnv();
  return createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function uniqueEmail(tag: string): string {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.seedline.local`;
}

/** Creates a user and signs them in through the same email OTP path a magic link uses. */
export async function signedInUser(tag: string): Promise<{ client: SupabaseClient; id: string; email: string }> {
  const email = uniqueEmail(tag);
  const admin = adminClient();
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) throw created.error;
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (link.error) throw link.error;
  const client = anonClient();
  const verified = await client.auth.verifyOtp({ email, token: link.data.properties.email_otp, type: 'email' });
  if (verified.error) throw verified.error;
  return { client, id: created.data.user.id, email };
}

export async function withDb<T>(fn: (db: pg.Client) => Promise<T>): Promise<T> {
  const db = new pg.Client({ connectionString: localEnv().DB_URL });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

/** Inserts an opportunity directly (as postgres) and returns its id. */
export async function insertOpportunity(overrides: Record<string, unknown> = {}): Promise<{ id: string; slug: string }> {
  const slug = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const row = {
    slug, name: `Test listing ${slug}`, organizer: 'Test organizer', type: 'pitch_competition',
    geography_level: 'national', deadline_type: 'fixed', source_url: 'https://example.com/source',
    verification_status: 'verified', ...overrides,
  };
  const { data, error } = await adminClient().from('opportunities').insert(row).select('id, slug').single();
  if (error) throw error;
  return data;
}

/** Calls a local Edge Function, retrying briefly while `supabase functions serve` boots the worker. */
export async function callFunction(name: string, opts: { token?: string; body?: unknown; method?: string; query?: string } = {}): Promise<Response> {
  const env = localEnv();
  const url = `${env.API_URL}/functions/v1/${name}${opts.query ?? ''}`;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        method: opts.method ?? (opts.body === undefined ? 'GET' : 'POST'),
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${opts.token ?? env.ANON_KEY}`,
          origin: 'http://localhost:5173',
        },
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        redirect: 'manual',
      });
      if (res.status === 503 && attempt < 10) { await new Promise((r) => setTimeout(r, 1000)); continue; }
      return res;
    } catch (e) {
      if (attempt >= 10) throw e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

export async function signedInAdmin(tag = 'admin'): Promise<{ client: SupabaseClient; id: string; email: string; token: string }> {
  const u = await signedInUser(tag);
  await withDb((db) => db.query('insert into public.admins (email) values ($1) on conflict do nothing', [u.email]));
  const { data } = await u.client.auth.getSession();
  return { ...u, token: data.session!.access_token };
}

export async function tokenOf(client: SupabaseClient): Promise<string> {
  const { data } = await client.auth.getSession();
  return data.session!.access_token;
}
