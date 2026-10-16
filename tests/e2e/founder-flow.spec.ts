// The founder flow through the real UI: Layer 0, preview, magic link, plan, milestone, detail,
// materials, answer bank, draft, applications, calendar, share link.
import { expect, test } from '@playwright/test';
import { expectEveryListingHonest, latestLink, uniqueEmail } from './helpers.ts';

test.describe.configure({ mode: 'serial' });

test('a new visitor goes from intake to a full plan and through every founder page', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'laptop', 'The flow runs once; layout is checked on both sizes in the a11y sweep.');
  const email = uniqueEmail('flow');

  // Layer 0, no account
  await page.goto('/');
  await page.getByRole('link', { name: 'Find my funding' }).click();
  await page.getByLabel('Which school are you connected to?').selectOption('unc');
  await page.getByLabel('What is your connection to that school?').selectOption('grad');
  await page.getByLabel('Which state are you based in?').selectOption('NC');
  await page.getByLabel('How far along is your company?').selectOption('prototype');
  await page.getByLabel('Which sector fits best?').selectOption('health_biotech');
  await page.getByRole('radio', { name: 'No' }).check();
  await page.getByRole('button', { name: 'See my matches' }).click();

  // Preview
  await expect(page).toHaveURL(/\/preview$/);
  await expect(page.getByText(/You match \d+ program/)).toBeVisible();
  await expect(page.getByText('You could apply for up to')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your top matches' })).toBeVisible();

  // Magic link
  const since = Date.now();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Email me my plan' }).click();
  await expect(page.getByText('Check your email.')).toBeVisible();
  await page.goto(await latestLink(email, since));
  await page.waitForURL('**/plan');

  // Full plan
  await expect(page.getByText("You're eligible for up to")).toBeVisible();
  await expect(page.getByRole('heading', { name: /Apply now/ })).toBeVisible();
  for (const h of ['Coming up', 'Not ready yet', 'Needs info']) await expect(page.getByRole('heading', { name: new RegExp(h) })).toBeVisible();
  await expect(page.getByText('Information only, not legal or investment advice.').first()).toBeVisible();
  // Every listing on the plan shows past results and founders like you as two separate lines, plus source and last verified.
  await expectEveryListingHonest(page);
  await page.getByRole('button', { name: 'Save to my applications' }).first().click();
  await expect(page.getByRole('link', { name: 'Saved to applications' }).first()).toBeVisible();

  // Milestone that unlocks nothing yet, then the answer that unlocks the state grant
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Ran a first pilot' }).click();
  await expect(page.getByRole('button', { name: /Ran a first pilot/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Incorporated' }).click();
  await expect(page.getByRole('button', { name: /Incorporated/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Which state is your company incorporated in?').selectOption('NC');
  await page.getByRole('button', { name: 'Save company details' }).click();
  await expect(page.getByRole('heading', { name: 'Newly unlocked' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'EXAMPLE: State matching grant' }).first()).toBeVisible();

  // Opportunity detail
  await page.goto('/opportunity/example-campus-seed-grant');
  await expect(page.getByText("You're eligible.")).toBeVisible();
  await expect(page.getByText('Past results, from the organizer')).toBeVisible();
  await expect(page.getByText('Founders like you, from Seedline')).toBeVisible();
  await expect(page.getByText('Not enough data yet.')).toBeVisible();
  await expect(page.getByText(/Last 2 years: \d+ winners/)).toBeVisible();

  // Materials
  await page.goto('/materials');
  await page.locator('#file-one_pager').setInputFiles({ name: 'one-pager.txt', mimeType: 'text/plain', buffer: Buffer.from('EXAMPLE one-pager') });
  await expect(page.getByText('1 of 10 materials added.')).toBeVisible();

  // Answer bank
  await page.goto('/answers');
  await page.locator('#problem-medium').fill('Rural clinics wait weeks for lab results that patients need the same day.');
  await page.getByRole('button', { name: 'Save problem answer' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();

  // Draft
  await page.goto('/draft/example-campus-seed-grant');
  await expect(page.locator('#q-0')).toHaveValue(/Rural clinics/);
  await expect(page.getByText('No answer bank topic matches this question. Write this one yourself.')).toBeVisible();

  // Applications
  await page.goto('/applications');
  await page.getByLabel('Status').first().selectOption('applied');
  await expect(page.getByText('1 applied')).toBeVisible();

  // Public map listings follow the same rule
  await page.goto('/map');
  await expect(page.getByRole('status')).toContainText('program');
  await expectEveryListingHonest(page);

  // Calendar and feed
  await page.goto('/calendar');
  await page.getByRole('button', { name: /feed link/ }).click();
  const feed = await page.locator('#feed').inputValue();
  const ics = await (await fetch(feed)).text();
  expect(ics).toContain('BEGIN:VEVENT');

  // Admin pages are closed to founders
  await page.goto('/admin');
  await expect(page.getByText('This page is only for Seedline admins.', { exact: false })).toBeVisible();
  await page.goto('/admin/metrics');
  await expect(page.getByText('This page is only for Seedline admins.', { exact: false })).toBeVisible();

  // Share link, opened in a fresh browser with no session
  await page.goto('/plan');
  await page.locator('#share-pw').fill('mentor-password');
  await page.getByRole('button', { name: 'Create share link' }).click();
  const url = await page.locator('#share-url').inputValue();
  const viewer = await context.browser()!.newPage();
  await viewer.goto(url.replace(/^https?:\/\/[^/]+/, 'http://localhost:5173'));
  await viewer.getByLabel('Enter the password they gave you').fill('wrong-password');
  await viewer.getByRole('button', { name: 'Open the plan' }).click();
  await expect(viewer.getByText("That password isn't right.")).toBeVisible();
  await viewer.getByLabel('Enter the password they gave you').fill('mentor-password');
  await viewer.getByRole('button', { name: 'Open the plan' }).click();
  await expect(viewer.getByText('Read-only shared plan')).toBeVisible();
  await expect(viewer.getByText('Founder accelerator')).toHaveCount(0);
  await expectEveryListingHonest(viewer);
  await viewer.close();
});
