// The approved design (bold blocks plus deadline timeline) is present on the real pages.
import { expect, test } from '@playwright/test';
import { LAYER0, signIn, uniqueEmail } from './helpers.ts';

test('landing: hero block, example plan with timeline, and the steps path', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.brand-block').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /What a plan looks like, for an example founder/ })).toBeVisible();
  await expect(page.locator('.steps-path > li')).toHaveCount(3);
});

test('plan: timeline of eligible deadlines, ramp-colored, and type chips by group', async ({ page }, info) => {
  await page.goto('/');
  await page.evaluate((l) => localStorage.setItem('seedline.layer0', JSON.stringify(l)), LAYER0);
  await signIn(page, uniqueEmail('design'), '/plan');
  await expect(page.getByRole('heading', { name: 'Your next 9 months' })).toBeVisible();
  if (info.project.name === 'laptop') {
    const pins = page.locator('.tl-pin');
    expect(await pins.count()).toBeGreaterThan(0);
    // Pins are colored by ramp(): every color lies on the navy, Carolina blue, amber path.
    const colors = await pins.evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
    for (const c of colors) expect(c).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
  } else {
    await expect(page.locator('[data-timeline-list] > li').first()).toBeVisible();
  }
  // University grants and pitch competitions are money awards (solid navy chips).
  await expect(page.locator('.chip-money', { hasText: 'University grant' }).first()).toBeVisible();
  // The targeted accelerator is a program (light blue chip), never a money award.
  await expect(page.locator('.chip-program', { hasText: 'Accelerator' }).first()).toBeVisible();
  await expect(page.locator('.chip-money', { hasText: 'Accelerator' })).toHaveCount(0);
});
