// The link preview image exists at exactly 1200 by 630 and index.html points at it.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('link preview', () => {
  it('og-image.png is a 1200 by 630 PNG', () => {
    const b = readFileSync('public/og-image.png');
    expect(b.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect([b.readUInt32BE(16), b.readUInt32BE(20)]).toEqual([1200, 630]);
  });
  it('index.html has absolute og:image and large-image card tags', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('<meta property="og:image" content="%VITE_SITE_URL%/og-image.png" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).not.toContain('\\u2014');
  });
});
