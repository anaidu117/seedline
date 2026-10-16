import { expect, type Page } from '@playwright/test';

const MAILPIT = 'http://127.0.0.1:54324';

/** Signs in through the real form and the real email in the local inbox. */
export async function signIn(page: Page, email: string, next = '/plan'): Promise<void> {
  await page.goto(`/signin?next=${encodeURIComponent(next)}`);
  const since = Date.now();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: /sign-in link/i }).click();
  await expect(page.getByText('Check your email.')).toBeVisible();
  const link = await latestLink(email, since);
  await page.goto(link);
  await page.waitForURL((u) => u.pathname === next.split('?')[0], { timeout: 15_000 });
}

export async function latestLink(email: string, sinceMs: number): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const msgs = ((await res.json()).messages ?? []) as { ID: string; Created: string }[];
    const fresh = msgs.find((m) => new Date(m.Created).getTime() >= sinceMs - 2000);
    if (fresh) {
      const m = await (await fetch(`${MAILPIT}/api/v1/message/${fresh.ID}`)).json();
      const href = (m.HTML as string).match(/href="([^"]+)"/)![1].replace(/&amp;/g, '&');
      return href;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No sign-in email for ${email}`);
}

export function uniqueEmail(tag: string): string {
  return `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
}

export const LAYER0 = { school: 'unc', student_status: 'grad', state: 'NC', stage: 'prototype', sector: 'health_biotech', incorporated: false };
