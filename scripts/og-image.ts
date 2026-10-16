// Renders design/og-image.html to public/og-image.png at exactly 1200 by 630.
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`file://${resolve('design/og-image.html')}`);
await page.evaluate(() => document.fonts.ready);
await page.locator('.card').screenshot({ path: 'public/og-image.png' });
await browser.close();
console.log('wrote public/og-image.png');
