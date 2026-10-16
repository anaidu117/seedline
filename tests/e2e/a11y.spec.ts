// Measured accessibility and mobile checks on every route, at 375px and at laptop width:
// no horizontal overflow, tap targets of at least 44px, visible focus, and axe color contrast.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { E2E_ADMIN } from './global-setup.ts';
import { LAYER0, signIn, uniqueEmail } from './helpers.ts';

const PUBLIC = ['/', '/start', '/preview', '/map', '/submit', '/privacy', '/terms', '/signin', '/opportunity/example-campus-seed-grant', '/not-a-page', '/checkin?t=bad', '/unsubscribe?t=bad', '/share/' + '0'.repeat(48)];
const FOUNDER = ['/plan', '/profile', '/materials', '/answers', '/draft/example-campus-seed-grant', '/applications', '/calendar', '/claim/example-campus-seed-grant'];
const ADMIN = ['/admin', '/admin/import', '/admin/verification', '/admin/staleness', '/admin/submissions', '/admin/claims', '/admin/metrics', '/admin/opportunities/new'];

interface Report { overflow: number; small: string[]; noFocus: string[] }

/** Interactive elements under 44px, ignoring links inside running text (WCAG 2.5.8 inline exception). */
async function measure(page: Page): Promise<Report> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw;
    const small: string[] = [];
    const sel = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [tabindex]:not([tabindex="-1"])';
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || style.visibility === 'hidden' || el.closest('[aria-hidden=true]') || el.classList.contains('sr-only')) continue;
      if (el.closest('iframe')) continue;
      // Exempt only links inside a sentence: the enclosing block has meaningfully more text than the link.
      const block = el.closest('p, li, dd, td, span.field-hint');
      const inline = el.tagName === 'A' && style.display === 'inline' && !!block
        && (block.textContent ?? '').trim().length > (el.textContent ?? '').trim().length + 15;
      if (inline) continue;
      // Checkboxes and radios count by their label, which is the tap target.
      const target = (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') && el.closest('label')) || el;
      const tr = target.getBoundingClientRect();
      if (tr.height < 44 || tr.width < 24) small.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || (el as HTMLInputElement).name || el.id).trim().slice(0, 40)}" ${Math.round(tr.width)}x${Math.round(tr.height)}`);
    }
    return { overflow, small, noFocus: [] };
  });
}

/** Tabs through the page and checks every focused element shows an outline or ring. */
async function focusCheck(page: Page, max = 40): Promise<string[]> {
  const missing: string[] = [];
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      // Cloudflare's Turnstile widget draws its own focus state inside its frame; we cannot style it.
      if (el.closest('[data-third-party]')) return { visible: true, label: 'third-party' };
      const s = getComputedStyle(el);
      const visible = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || (s.boxShadow && s.boxShadow !== 'none');
      return { visible, label: `${el.tagName.toLowerCase()} ${(el.textContent || el.id).trim().slice(0, 30)}` };
    });
    if (!info) break;
    if (!info.visible) missing.push(info.label);
  }
  return [...new Set(missing)];
}

async function check(page: Page, path: string) {
  await page.goto(path);
  // Not "networkidle": Turnstile keeps a connection open on /submit.
  await page.waitForLoadState('load');
  await page.waitForTimeout(1200);
  const r = await measure(page);
  const focus = await focusCheck(page);
  const axe = await new AxeBuilder({ page }).withRules(['color-contrast']).exclude('iframe').analyze();
  const contrast = axe.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(' ')}: ${n.any[0]?.message ?? ''}`));
  // Copy rules on the rendered text: no em dashes, no bare percentages, no all-caps labels, no uppercase styling.
  const copy = await page.evaluate(() => {
    const text = document.body.innerText;
    const out: string[] = [];
    if (text.includes('\u2014')) out.push('em dash');
    const pct = text.match(/\d+(\.\d+)?\s?%/g);
    if (pct) out.push(`percentage: ${pct.join(', ')}`);
    // "EXAMPLE" is the spec's required prefix for fake seed data, and acronyms like LGBTQ or JSON are words, not labels.
    const caps = (text.match(/\b[A-Z]{4,}\b/g) ?? []).filter((w) => !['EXAMPLE', 'SBIR', 'STTR', 'LGBTQ', 'JSON', 'README', 'HTTPS'].includes(w));
    if (caps.length) out.push(`all caps: ${[...new Set(caps)].join(', ')}`);
    const upper = Array.from(document.querySelectorAll<HTMLElement>('body *')).filter((e) => getComputedStyle(e).textTransform === 'uppercase' && e.innerText.trim());
    if (upper.length) out.push(`text-transform uppercase on ${upper.length} element(s)`);
    return out;
  });
  return { path, overflow: r.overflow, small: r.small, focus, contrast, copy };
}

function assertClean(results: Awaited<ReturnType<typeof check>>[]) {
  const problems = results.filter((r) => r.overflow > 0 || r.small.length || r.focus.length || r.contrast.length || r.copy.length);
  expect(problems, JSON.stringify(problems, null, 2)).toEqual([]);
}

test('public pages', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((l) => localStorage.setItem('seedline.layer0', JSON.stringify(l)), LAYER0);
  const results = [];
  for (const p of PUBLIC) results.push(await check(page, p));
  assertClean(results);
});

test('founder pages', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((l) => localStorage.setItem('seedline.layer0', JSON.stringify(l)), LAYER0);
  await signIn(page, uniqueEmail('a11y'), '/plan');
  const results = [];
  for (const p of FOUNDER) results.push(await check(page, p));
  assertClean(results);
});

test('admin pages', async ({ page }) => {
  await signIn(page, E2E_ADMIN, '/admin');
  const results = [];
  for (const p of ADMIN) results.push(await check(page, p));
  assertClean(results);
});
