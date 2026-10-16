# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y.spec.ts >> founder pages
- Location: tests/e2e/a11y.spec.ts:132:1

# Error details

```
Error: [
  {
    "path": "/plan",
    "overflow": 0,
    "small": [
      "text on navy shape: \"Your funding plan\"",
      "text on navy shape: \"You're eligible for up to\"",
      "text on navy shape: \"$15,000\""
    ],
    "focus": [],
    "contrast": [],
    "copy": []
  },
  {
    "path": "/materials",
    "overflow": 0,
    "small": [
      "text on navy shape: \"Upload or link each material o\""
    ],
    "focus": [],
    "contrast": [],
    "copy": []
  },
  {
    "path": "/answers",
    "overflow": 0,
    "small": [
      "text on navy shape: \"Answer bank\"",
      "text on navy shape: \"Write each answer once in up t\""
    ],
    "focus": [],
    "contrast": [],
    "copy": []
  },
  {
    "path": "/applications",
    "overflow": 0,
    "small": [
      "text on navy shape: \"Track where each application s\""
    ],
    "focus": [],
    "contrast": [],
    "copy": []
  },
  {
    "path": "/claim/example-campus-seed-grant",
    "overflow": 0,
    "small": [
      "text on navy shape: \"EXAMPLE: Campus seed grant\""
    ],
    "focus": [],
    "contrast": [],
    "copy": []
  }
]

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 55

- Array []
+ Array [
+   Object {
+     "contrast": Array [],
+     "copy": Array [],
+     "focus": Array [],
+     "overflow": 0,
+     "path": "/plan",
+     "small": Array [
+       "text on navy shape: \"Your funding plan\"",
+       "text on navy shape: \"You're eligible for up to\"",
+       "text on navy shape: \"$15,000\"",
+     ],
+   },
+   Object {
+     "contrast": Array [],
+     "copy": Array [],
+     "focus": Array [],
+     "overflow": 0,
+     "path": "/materials",
+     "small": Array [
+       "text on navy shape: \"Upload or link each material o\"",
+     ],
+   },
+   Object {
+     "contrast": Array [],
+     "copy": Array [],
+     "focus": Array [],
+     "overflow": 0,
+     "path": "/answers",
+     "small": Array [
+       "text on navy shape: \"Answer bank\"",
+       "text on navy shape: \"Write each answer once in up t\"",
+     ],
+   },
+   Object {
+     "contrast": Array [],
+     "copy": Array [],
+     "focus": Array [],
+     "overflow": 0,
+     "path": "/applications",
+     "small": Array [
+       "text on navy shape: \"Track where each application s\"",
+     ],
+   },
+   Object {
+     "contrast": Array [],
+     "copy": Array [],
+     "focus": Array [],
+     "overflow": 0,
+     "path": "/claim/example-campus-seed-grant",
+     "small": Array [
+       "text on navy shape: \"EXAMPLE: Campus seed grant\"",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [ref=f10e3]:
  - link "Skip to content" [ref=f10e4] [cursor=pointer]:
    - /url: "#main"
  - banner [ref=f10e5]:
    - generic [ref=f10e6]:
      - link "Seedline" [ref=f10e7] [cursor=pointer]:
        - /url: /
      - button "Menu" [ref=f10e11] [cursor=pointer]
  - main [ref=f10e12]:
    - generic [ref=f10e13]:
      - generic [ref=f10e15]:
        - 'heading "Claim EXAMPLE: Campus seed grant" [level=1] [ref=f10e16]'
        - paragraph [ref=f10e17]: If you run this program, claim the listing to keep it accurate. We review every claim. Once approved, you can edit this listing and it shows a Verified by organizer badge.
      - generic [ref=f10e18]:
        - generic [ref=f10e19]:
          - generic [ref=f10e20]: Your organization
          - textbox "Your organization" [ref=f10e21]
        - generic [ref=f10e22]:
          - generic [ref=f10e23]: Your role
          - textbox "Your role" [ref=f10e24]
        - generic [ref=f10e25]:
          - generic [ref=f10e26]: How can we confirm you run it? (optional)
          - textbox "How can we confirm you run it? (optional)" [ref=f10e27]
          - generic [ref=f10e28]: For example, a staff page that lists you, or an email address at the organizer's domain.
        - button "Send my claim" [ref=f10e30] [cursor=pointer]
  - contentinfo [ref=f10e31]:
    - generic [ref=f10e32]:
      - paragraph [ref=f10e33]: Information only, not legal or investment advice. Always confirm details with the organizer.
      - list [ref=f10e34]:
        - listitem [ref=f10e35]:
          - link "Funding map" [ref=f10e36] [cursor=pointer]:
            - /url: /map
        - listitem [ref=f10e37]:
          - link "Submit an opportunity" [ref=f10e38] [cursor=pointer]:
            - /url: /submit
        - listitem [ref=f10e39]:
          - link "Privacy" [ref=f10e40] [cursor=pointer]:
            - /url: /privacy
        - listitem [ref=f10e41]:
          - link "Terms" [ref=f10e42] [cursor=pointer]:
            - /url: /terms
```

# Test source

```ts
  21  |     for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
  22  |       const r = el.getBoundingClientRect();
  23  |       const style = getComputedStyle(el);
  24  |       if (r.width === 0 || r.height === 0 || style.visibility === 'hidden' || el.closest('[aria-hidden=true]') || el.classList.contains('sr-only')) continue;
  25  |       if (el.closest('iframe')) continue;
  26  |       // Exempt only links inside a sentence: the enclosing block has meaningfully more text than the link.
  27  |       const block = el.closest('p, li, dd, td, span.field-hint');
  28  |       const inline = el.tagName === 'A' && style.display === 'inline' && !!block
  29  |         && (block.textContent ?? '').trim().length > (el.textContent ?? '').trim().length + 15;
  30  |       if (inline) continue;
  31  |       // Checkboxes and radios count by their label, which is the tap target.
  32  |       const target = (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') && el.closest('label')) || el;
  33  |       const tr = target.getBoundingClientRect();
  34  |       if (tr.height < 44 || tr.width < 24) small.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || (el as HTMLInputElement).name || el.id).trim().slice(0, 40)}" ${Math.round(tr.width)}x${Math.round(tr.height)}`);
  35  |     }
  36  |     // Text on a brand block must never sit on top of the navy shape (navy text on navy is invisible).
  37  |     const shapeHits: string[] = [];
  38  |     for (const block of Array.from(document.querySelectorAll('.brand-block'))) {
  39  |       const navyShapes = Array.from(block.querySelectorAll<HTMLElement>(':scope > .shape'))
  40  |         .filter((s) => getComputedStyle(s).display !== 'none' && getComputedStyle(s).backgroundColor === 'rgb(19, 41, 75)')
  41  |         .map((s) => s.getBoundingClientRect());
  42  |       const walker = document.createTreeWalker(block.querySelector('.block-content')!, NodeFilter.SHOW_TEXT);
  43  |       while (walker.nextNode()) {
  44  |         const node = walker.currentNode as Text;
  45  |         if (!node.textContent?.trim()) continue;
  46  |         const range = document.createRange();
  47  |         range.selectNodeContents(node);
  48  |         const host = node.parentElement!;
  49  |         // White text (buttons, money chips) is readable on navy; only navy text is at risk.
  50  |         if (getComputedStyle(host).color !== 'rgb(19, 41, 75)') continue;
  51  |         // Text on its own opaque surface (a white card inside the block) is not on the shape.
  52  |         let covered = false;
  53  |         for (let el: HTMLElement | null = host; el && el !== block; el = el.parentElement) {
  54  |           const bg = getComputedStyle(el).backgroundColor;
  55  |           if (bg !== 'rgba(0, 0, 0, 0)' && !/,\s*0(\.\d+)?\)$/.test(bg)) { covered = true; break; }
  56  |         }
  57  |         if (covered) continue;
  58  |         for (const r of Array.from(range.getClientRects())) {
  59  |           for (const sh of navyShapes) {
  60  |             // Inset the circle's box so only real overlap with the round part counts.
  61  |             const cx = sh.left + sh.width / 2, cy = sh.top + sh.height / 2, rad = sh.width / 2;
  62  |             const nx = Math.max(r.left, Math.min(cx, r.right)), ny = Math.max(r.top, Math.min(cy, r.bottom));
  63  |             if ((nx - cx) ** 2 + (ny - cy) ** 2 < rad * rad) shapeHits.push(node.textContent.trim().slice(0, 30));
  64  |           }
  65  |         }
  66  |       }
  67  |     }
  68  |     return { overflow, small: [...small, ...shapeHits.map((t) => `text on navy shape: "${t}"`)], noFocus: [] };
  69  |   });
  70  | }
  71  | 
  72  | /** Tabs through the page and checks every focused element shows an outline or ring. */
  73  | async function focusCheck(page: Page, max = 40): Promise<string[]> {
  74  |   const missing: string[] = [];
  75  |   await page.locator('body').click({ position: { x: 1, y: 1 } });
  76  |   for (let i = 0; i < max; i++) {
  77  |     await page.keyboard.press('Tab');
  78  |     const info = await page.evaluate(() => {
  79  |       const el = document.activeElement as HTMLElement | null;
  80  |       if (!el || el === document.body) return null;
  81  |       // Cloudflare's Turnstile widget draws its own focus state inside its frame; we cannot style it.
  82  |       if (el.closest('[data-third-party]')) return { visible: true, label: 'third-party' };
  83  |       const s = getComputedStyle(el);
  84  |       const visible = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || (s.boxShadow && s.boxShadow !== 'none');
  85  |       return { visible, label: `${el.tagName.toLowerCase()} ${(el.textContent || el.id).trim().slice(0, 30)}` };
  86  |     });
  87  |     if (!info) break;
  88  |     if (!info.visible) missing.push(info.label);
  89  |   }
  90  |   return [...new Set(missing)];
  91  | }
  92  | 
  93  | async function check(page: Page, path: string) {
  94  |   await page.goto(path);
  95  |   // Not "networkidle": Turnstile keeps a connection open on /submit.
  96  |   await page.waitForLoadState('load');
  97  |   await page.waitForTimeout(1200);
  98  |   const r = await measure(page);
  99  |   const focus = await focusCheck(page);
  100 |   const axe = await new AxeBuilder({ page }).withRules(['color-contrast']).exclude('iframe').analyze();
  101 |   const contrast = axe.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(' ')}: ${n.any[0]?.message ?? ''}`));
  102 |   // Copy rules on the rendered text: no em dashes, no bare percentages, no all-caps labels, no uppercase styling.
  103 |   const copy = await page.evaluate(() => {
  104 |     const text = document.body.innerText;
  105 |     const out: string[] = [];
  106 |     if (text.includes('\u2014')) out.push('em dash');
  107 |     const pct = text.match(/\d+(\.\d+)?\s?%/g);
  108 |     if (pct) out.push(`percentage: ${pct.join(', ')}`);
  109 |     // "EXAMPLE" is the spec's required prefix for fake seed data, and acronyms like LGBTQ or JSON are words, not labels.
  110 |     const caps = (text.match(/\b[A-Z]{4,}\b/g) ?? []).filter((w) => !['EXAMPLE', 'SBIR', 'STTR', 'LGBTQ', 'JSON', 'README', 'HTTPS'].includes(w));
  111 |     if (caps.length) out.push(`all caps: ${[...new Set(caps)].join(', ')}`);
  112 |     const upper = Array.from(document.querySelectorAll<HTMLElement>('body *')).filter((e) => getComputedStyle(e).textTransform === 'uppercase' && e.innerText.trim());
  113 |     if (upper.length) out.push(`text-transform uppercase on ${upper.length} element(s)`);
  114 |     return out;
  115 |   });
  116 |   return { path, overflow: r.overflow, small: r.small, focus, contrast, copy };
  117 | }
  118 | 
  119 | function assertClean(results: Awaited<ReturnType<typeof check>>[]) {
  120 |   const problems = results.filter((r) => r.overflow > 0 || r.small.length || r.focus.length || r.contrast.length || r.copy.length);
> 121 |   expect(problems, JSON.stringify(problems, null, 2)).toEqual([]);
      |                                                       ^ Error: [
  122 | }
  123 | 
  124 | test('public pages', async ({ page }) => {
  125 |   await page.goto('/');
  126 |   await page.evaluate((l) => localStorage.setItem('seedline.layer0', JSON.stringify(l)), LAYER0);
  127 |   const results = [];
  128 |   for (const p of PUBLIC) results.push(await check(page, p));
  129 |   assertClean(results);
  130 | });
  131 | 
  132 | test('founder pages', async ({ page }) => {
  133 |   await page.goto('/');
  134 |   await page.evaluate((l) => localStorage.setItem('seedline.layer0', JSON.stringify(l)), LAYER0);
  135 |   await signIn(page, uniqueEmail('a11y'), '/plan');
  136 |   const results = [];
  137 |   for (const p of FOUNDER) results.push(await check(page, p));
  138 |   assertClean(results);
  139 | });
  140 | 
  141 | test('admin pages', async ({ page }) => {
  142 |   await signIn(page, E2E_ADMIN, '/admin');
  143 |   const results = [];
  144 |   for (const p of ADMIN) results.push(await check(page, p));
  145 |   assertClean(results);
  146 | });
  147 | 
```