// Writes dist/_headers with security headers and a Content Security Policy built
// from the external origins actually referenced by the built files.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
// Vite reads .env itself; this script runs after it, so load the same file for VITE_SUPABASE_URL.
for (const f of ['.env', '.env.production']) {
  try { process.loadEnvFile(f); } catch { /* file is optional */ }
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(DIST).filter((f) => /\.(html|js|css)$/.test(f));
const origins = new Set<string>();
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/https:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi)) origins.add(m[0].toLowerCase());
}

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
const supabaseOrigin = supabaseUrl.startsWith('http') ? new URL(supabaseUrl).origin : '';

// Known origins and the directive each belongs to. Anything found in the build
// that is not listed here fails the build so it gets reviewed, not silently allowed.
const KNOWN: Record<string, string[]> = {
  'https://fonts.googleapis.com': ['style-src'],
  'https://fonts.gstatic.com': ['font-src'],
  'https://challenges.cloudflare.com': ['script-src', 'frame-src', 'connect-src'],
};
const IGNORED = [
  // Documentation and namespace URLs that appear in library source but are never fetched.
  /^https:\/\/(www\.)?(w3\.org|reactjs\.org|react\.dev|github\.com|developer\.mozilla\.org|supabase\.(com|io)|tailwindcss\.com|example\.com|calendar\.google\.com|wicg\.github\.io|html\.spec\.whatwg\.org|fb\.me|vite\.dev|vitejs\.dev|reactrouter\.com|remix\.run|tc39\.es|bit\.ly|jwt\.io)$/,
];

const directives: Record<string, Set<string>> = {
  'default-src': new Set(["'self'"]),
  'script-src': new Set(["'self'"]),
  'style-src': new Set(["'self'"]),
  'font-src': new Set(["'self'"]),
  'img-src': new Set(["'self'", 'data:']),
  'connect-src': new Set(["'self'"]),
  'frame-src': new Set(),
  'frame-ancestors': new Set(["'none'"]),
  'base-uri': new Set(["'self'"]),
  'form-action': new Set(["'self'"]),
  'object-src': new Set(["'none'"]),
};
if (supabaseOrigin) {
  directives['connect-src'].add(supabaseOrigin);
  directives['img-src'].add(supabaseOrigin);
}

const unreviewed: string[] = [];
for (const o of [...origins].sort()) {
  if (o === supabaseOrigin) continue;
  if (KNOWN[o]) { for (const d of KNOWN[o]) directives[d].add(o); continue; }
  if (IGNORED.some((r) => r.test(o))) continue;
  unreviewed.push(o);
}
if (unreviewed.length) {
  console.error(`build-headers: unreviewed external origins found in dist: ${unreviewed.join(', ')}`);
  process.exit(1);
}

const csp = Object.entries(directives)
  .filter(([, v]) => v.size > 0)
  .map(([k, v]) => `${k} ${[...v].join(' ')}`)
  .join('; ');

const headers = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: ${csp}
`;
writeFileSync(join(DIST, '_headers'), headers);
console.log(`build-headers: wrote dist/_headers from ${files.length} files`);
console.log(`  external origins found: ${[...origins].sort().join(', ') || 'none'}`);
console.log(`  CSP: ${csp}`);
