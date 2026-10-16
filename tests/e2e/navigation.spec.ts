// Navigation fixes from the audit: sign-in-aware nav, Escape closes the mobile menu,
// and map results start near the top on phones.
import { expect, test } from '@playwright/test';
import { E2E_ADMIN } from './global-setup.ts';
import { signIn, uniqueEmail } from './helpers.ts';

test('visitors see public links only; founders see their pages; admins also see Admin', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile';
  const nav = page.getByRole('navigation', { name: 'Main' });
  const openMenu = async () => { if (mobile) await page.getByRole('button', { name: 'Menu' }).click(); };

  await page.goto('/');
  await openMenu();
  await expect(nav.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Plan' })).toHaveCount(0);

  await signIn(page, uniqueEmail('nav'), '/plan');
  await openMenu();
  await expect(nav.getByRole('link', { name: 'Plan' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Admin' })).toHaveCount(0);

  await page.evaluate(() => localStorage.clear());
  await signIn(page, E2E_ADMIN, '/plan');
  await openMenu();
  await expect(nav.getByRole('link', { name: 'Admin' })).toBeVisible();
});

test('Escape closes the mobile menu and returns focus to the button', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'The menu button only exists on small screens.');
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Menu' });
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toBeFocused();
});

test('map filters fold away on phones so results start in the first screen', async ({ page }, info) => {
  await page.goto('/map');
  await expect(page.getByRole('status')).toContainText('program');
  const sector = page.getByLabel('Sector');
  if (info.project.name === 'mobile') {
    await expect(sector).toBeHidden();
    const top = await page.getByRole('status').boundingBox();
    expect(top!.y).toBeLessThan(812);
    await page.getByText('Filters').click();
    await expect(sector).toBeVisible();
  } else {
    await expect(sector).toBeVisible();
  }
});
