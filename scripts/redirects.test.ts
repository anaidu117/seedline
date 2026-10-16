// Every route in src/routes.tsx must be served by public/_redirects, or it would get a 404 in production.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routes = readFileSync('src/routes.tsx', 'utf8');
const rules = readFileSync('public/_redirects', 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split(/\s+/)[0]);

function served(path: string): boolean {
  return path === '/' || rules.some((r) => (r.endsWith('/*') ? path.startsWith(r.slice(0, -1)) : r === path));
}

describe('_redirects', () => {
  it('serves every top-level route in the router', () => {
    const top = [...routes.matchAll(/path: '(\/[^']*)'/g)].map((m) => m[1].replace(/:[a-z]+/g, 'x'));
    expect(top.length).toBeGreaterThan(15);
    for (const p of top) expect(served(p), p).toBe(true);
  });
  it('serves admin child routes', () => {
    const children = [...routes.matchAll(/path: '([a-z][^']*)'/g)].map((m) => `/admin/${m[1].replace(/:[a-z]+/g, 'x')}`);
    for (const p of children) expect(served(p), p).toBe(true);
  });
  it('has no catch-all, so unknown paths get a real 404', () => {
    expect(rules).not.toContain('/*');
  });
});
