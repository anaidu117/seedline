# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: founder-flow.spec.ts >> a new visitor goes from intake to a full plan and through every founder page
- Location: tests/e2e/founder-flow.spec.ts:8:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('main article, main li').filter({ has: locator('a[href^="/opportunity/"]') }).first().getByText('Past results, from the organizer:')
Expected: 1
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" locator('main article, main li').filter({ has: locator('a[href^="/opportunity/"]') }).first().getByText('Past results, from the organizer:') with timeout 5000ms
  - waiting for locator('main article, main li').filter({ has: locator('a[href^="/opportunity/"]') }).first().getByText('Past results, from the organizer:')
    14 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- generic [ref=f8e3]:
  - link "Skip to content" [ref=f8e4] [cursor=pointer]:
    - /url: "#main"
  - banner [ref=f8e5]:
    - generic [ref=f8e6]:
      - link "Seedline" [ref=f8e7] [cursor=pointer]:
        - /url: /
      - navigation "Main" [ref=f8e11]:
        - list [ref=f8e12]:
          - listitem [ref=f8e13]:
            - link "Plan" [ref=f8e14] [cursor=pointer]:
              - /url: /plan
          - listitem [ref=f8e15]:
            - link "Calendar" [ref=f8e16] [cursor=pointer]:
              - /url: /calendar
          - listitem [ref=f8e17]:
            - link "Applications" [ref=f8e18] [cursor=pointer]:
              - /url: /applications
          - listitem [ref=f8e19]:
            - link "Materials" [ref=f8e20] [cursor=pointer]:
              - /url: /materials
          - listitem [ref=f8e21]:
            - link "Answers" [ref=f8e22] [cursor=pointer]:
              - /url: /answers
          - listitem [ref=f8e23]:
            - link "Funding map" [ref=f8e24] [cursor=pointer]:
              - /url: /map
          - listitem [ref=f8e25]:
            - link "Profile" [ref=f8e26] [cursor=pointer]:
              - /url: /profile
  - main [ref=f8e27]:
    - generic [ref=f8e28]:
      - generic [ref=f8e29]:
        - heading "Funding map" [level=1] [ref=f8e30]
        - paragraph [ref=f8e31]: Every verified grant, competition, fellowship and program in Seedline. No sign-in needed. Each listing shows where the information came from and when it was last checked.
      - form "Filter programs" [ref=f8e32]:
        - generic [ref=f8e33]:
          - generic [ref=f8e34]: Type
          - combobox "Type" [ref=f8e35]:
            - option "All" [selected]
            - option "University grant"
            - option "Pitch competition"
            - option "State grant"
            - option "Federal grant"
            - option "Fellowship"
            - option "Accelerator"
            - option "Showcase or conference"
        - generic [ref=f8e36]:
          - generic [ref=f8e37]: Geography
          - combobox "Geography" [ref=f8e38]:
            - option "All" [selected]
            - option "Campus"
            - option "Research Triangle"
            - option "North Carolina"
            - option "Southeast"
            - option "National"
        - generic [ref=f8e39]:
          - generic [ref=f8e40]: Sector
          - combobox "Sector" [ref=f8e41]:
            - option "All" [selected]
            - option "Software"
            - option "Fintech"
            - option "Health or biotech"
            - option "Medical devices"
            - option "Deep tech or hardware"
            - option "Energy or climate"
            - option "Consumer"
            - option "Education"
            - option "Social impact"
            - option "Food or agriculture"
            - option "Other"
        - generic [ref=f8e42]:
          - generic [ref=f8e43]: Stage
          - combobox "Stage" [ref=f8e44]:
            - option "All" [selected]
            - option "Idea"
            - option "Prototype"
            - option "Pilot users"
            - option "Revenue"
        - generic [ref=f8e45]:
          - generic [ref=f8e46]: Deadline
          - combobox "Deadline" [ref=f8e47]:
            - option "Any time" [selected]
            - option "Open now"
            - option "Closing in the next 30 days"
            - option "Closing in the next 3 months"
      - status [ref=f8e48]: 5 programs.
      - list [ref=f8e49]:
        - listitem [ref=f8e50]:
          - generic [ref=f8e51]:
            - 'link "EXAMPLE: Campus seed grant" [ref=f8e52] [cursor=pointer]':
              - /url: /opportunity/example-campus-seed-grant
            - generic [ref=f8e53]: Closes in 36 days
          - paragraph [ref=f8e55]: "EXAMPLE: University venture office · University grant · $1,000 to $5,000"
          - paragraph [ref=f8e56]: "Campus: Chapel Hill"
          - paragraph [ref=f8e57]:
            - text: "Source:"
            - link "example.com" [ref=f8e58] [cursor=pointer]:
              - /url: https://example.com/campus-seed-grant
            - text: · Last verified Oct 15, 2026
        - listitem [ref=f8e59]:
          - generic [ref=f8e60]:
            - 'link "EXAMPLE: State matching grant" [ref=f8e61] [cursor=pointer]':
              - /url: /opportunity/example-state-matching-grant
            - generic [ref=f8e62]: Opens Nov 1, 2026
          - paragraph [ref=f8e64]: "EXAMPLE: State economic office · State grant · $10,000 to $50,000"
          - paragraph [ref=f8e65]: "North Carolina: North Carolina"
          - paragraph [ref=f8e66]:
            - text: "Source:"
            - link "example.com" [ref=f8e67] [cursor=pointer]:
              - /url: https://example.com/state-grant
            - text: · Last verified Oct 15, 2026
        - listitem [ref=f8e68]:
          - generic [ref=f8e69]:
            - 'link "EXAMPLE: Founder accelerator" [ref=f8e70] [cursor=pointer]':
              - /url: /opportunity/example-founder-accelerator
            - generic [ref=f8e71]: Opens Jan 15, 2027
          - paragraph [ref=f8e73]:
            - text: "EXAMPLE: Accelerator program · Accelerator · Up to $100,000"
            - generic [ref=f8e74]: Takes equity
          - paragraph [ref=f8e75]: "Southeast: Southeast"
          - paragraph [ref=f8e76]:
            - text: "Source:"
            - link "example.com" [ref=f8e77] [cursor=pointer]:
              - /url: https://example.com/accelerator
            - text: · Last verified Oct 15, 2026
        - listitem [ref=f8e78]:
          - generic [ref=f8e79]:
            - 'link "EXAMPLE: Regional pitch night" [ref=f8e80] [cursor=pointer]':
              - /url: /opportunity/example-regional-pitch-night
            - generic [ref=f8e81]: Opens Feb 1, 2027 (expected)
          - paragraph [ref=f8e83]: "EXAMPLE: Regional founders network · Pitch competition · Up to $10,000"
          - paragraph [ref=f8e84]: "Research Triangle: Durham, Raleigh, Chapel Hill"
          - paragraph [ref=f8e85]:
            - text: "Source:"
            - link "example.com" [ref=f8e86] [cursor=pointer]:
              - /url: https://example.com/pitch-night
            - text: · Last verified Oct 15, 2026
        - listitem [ref=f8e87]:
          - generic [ref=f8e88]:
            - 'link "EXAMPLE: Federal research grant" [ref=f8e89] [cursor=pointer]':
              - /url: /opportunity/example-federal-research-grant
            - generic [ref=f8e90]: Rolling deadline
          - paragraph [ref=f8e91]: "EXAMPLE: Federal agency · Federal grant · Not disclosed"
          - paragraph [ref=f8e92]: National
          - paragraph [ref=f8e93]:
            - text: "Source:"
            - link "example.com" [ref=f8e94] [cursor=pointer]:
              - /url: https://example.com/federal-grant
            - text: · Last verified Oct 15, 2026
      - paragraph [ref=f8e96]:
        - text: Know a program that's missing?
        - link "Submit an opportunity" [ref=f8e97] [cursor=pointer]:
          - /url: /submit
        - text: . Want to know which ones fit you?
        - link "Find my funding" [ref=f8e98] [cursor=pointer]:
          - /url: /start
        - text: .
      - paragraph [ref=f8e99]: Information only, not legal or investment advice. Always confirm details with the organizer.
  - contentinfo [ref=f8e100]:
    - generic [ref=f8e101]:
      - paragraph [ref=f8e102]: Information only, not legal or investment advice. Always confirm details with the organizer.
      - list [ref=f8e103]:
        - listitem [ref=f8e104]:
          - link "Funding map" [ref=f8e105] [cursor=pointer]:
            - /url: /map
        - listitem [ref=f8e106]:
          - link "Submit an opportunity" [ref=f8e107] [cursor=pointer]:
            - /url: /submit
        - listitem [ref=f8e108]:
          - link "Privacy" [ref=f8e109] [cursor=pointer]:
            - /url: /privacy
        - listitem [ref=f8e110]:
          - link "Terms" [ref=f8e111] [cursor=pointer]:
            - /url: /terms
```

# Test source

```ts
  1  | import { expect, type Page } from '@playwright/test';
  2  | 
  3  | const MAILPIT = 'http://127.0.0.1:54324';
  4  | 
  5  | /** Signs in through the real form and the real email in the local inbox. */
  6  | export async function signIn(page: Page, email: string, next = '/plan'): Promise<void> {
  7  |   await page.goto(`/signin?next=${encodeURIComponent(next)}`);
  8  |   const since = Date.now();
  9  |   await page.getByLabel('Email address').fill(email);
  10 |   await page.getByRole('button', { name: /sign-in link/i }).click();
  11 |   await expect(page.getByText('Check your email.')).toBeVisible();
  12 |   const link = await latestLink(email, since);
  13 |   await page.goto(link);
  14 |   await page.waitForURL((u) => u.pathname === next.split('?')[0], { timeout: 15_000 });
  15 | }
  16 | 
  17 | export async function latestLink(email: string, sinceMs: number): Promise<string> {
  18 |   for (let i = 0; i < 30; i++) {
  19 |     const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
  20 |     const msgs = ((await res.json()).messages ?? []) as { ID: string; Created: string }[];
  21 |     const fresh = msgs.find((m) => new Date(m.Created).getTime() >= sinceMs - 2000);
  22 |     if (fresh) {
  23 |       const m = await (await fetch(`${MAILPIT}/api/v1/message/${fresh.ID}`)).json();
  24 |       const href = (m.HTML as string).match(/href="([^"]+)"/)![1].replace(/&amp;/g, '&');
  25 |       return href;
  26 |     }
  27 |     await new Promise((r) => setTimeout(r, 500));
  28 |   }
  29 |   throw new Error(`No sign-in email for ${email}`);
  30 | }
  31 | 
  32 | export function uniqueEmail(tag: string): string {
  33 |   return `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  34 | }
  35 | 
  36 | export const LAYER0 = { school: 'unc', student_status: 'grad', state: 'NC', stage: 'prototype', sector: 'health_biotech', incorporated: false };
  37 | 
  38 | /** Every opportunity listing (card or row) shows both results lines, its source and last-verified date. */
  39 | export async function expectEveryListingHonest(page: Page): Promise<void> {
  40 |   const listings = page.locator('main article, main li').filter({ has: page.locator('a[href^="/opportunity/"]') });
  41 |   const n = await listings.count();
  42 |   expect(n).toBeGreaterThan(0);
  43 |   for (let i = 0; i < n; i++) {
  44 |     const item = listings.nth(i);
> 45 |     await expect(item.getByText('Past results, from the organizer:')).toHaveCount(1);
     |                                                                       ^ Error: expect(locator).toHaveCount(expected) failed
  46 |     await expect(item.getByText('Founders like you, from Seedline:')).toHaveCount(1);
  47 |     await expect(item.getByText(/^Source:/)).toHaveCount(1);
  48 |     await expect(item.getByText(/Last verified|Verification date not recorded/)).toHaveCount(1);
  49 |   }
  50 | }
  51 | 
```