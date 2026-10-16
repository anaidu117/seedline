// Measures WCAG contrast for every text color pair the UI uses. Fails (exit 1) under 4.5:1 for text
// and under 3:1 for form control borders. Tokens are read from src/styles/index.css, not retyped.
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/index.css', 'utf8');
const tokens: Record<string, string> = {};
for (const m of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) tokens[m[1]] = m[2];

function lum(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// [foreground, background, minimum, where it is used]
const PAIRS: [string, string, number, string][] = [
  ['navy', 'bg', 4.5, 'body text'], ['navy', 'surface', 4.5, 'text on gray sections'],
  ['navy', 'blue-tint', 4.5, 'plan total band, active nav'], ['navy', 'carolina', 4.5, 'primary buttons'], ['navy', 'carolina-hover', 4.5, 'primary buttons on hover'], ['bg', 'navy', 4.5, 'white text on navy buttons and money-award chips'],
  ['navy', 'amber', 4.5, 'deadline fill chips'], ['navy', 'amber-tint', 4.5, 'text on deadline chips'],
  ['muted', 'bg', 4.5, 'secondary text'], ['muted', 'surface', 4.5, 'secondary text on gray'],
  ['muted', 'blue-tint', 4.5, 'secondary text on the total band'],
  ['link', 'bg', 4.5, 'links'], ['link', 'surface', 4.5, 'links on gray'], ['link', 'blue-tint', 4.5, 'links on the total band'],
  ['amber-ink', 'bg', 4.5, 'deadline text'], ['amber-ink', 'amber-tint', 4.5, 'deadline chip text'],
  ['error', 'bg', 4.5, 'form errors'], ['error', 'error-tint', 4.5, 'error banners'],
  ['line-strong', 'bg', 3, 'form field borders'], ['link', 'bg', 3, 'focus ring'], ['link', 'carolina', 1, 'focus ring on primary buttons (offset gap is white)'],
];

let failed = 0;
for (const [fg, bgName, min, where] of PAIRS) {
  if (!tokens[fg] || !tokens[bgName]) { console.error(`missing token ${fg} or ${bgName}`); failed++; continue; }
  const r = contrast(tokens[fg], tokens[bgName]);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  (min ${min})  ${fg} on ${bgName}  ${where}`);
}
console.log(failed ? `\n${failed} pair(s) below minimum` : `\nAll ${PAIRS.length} pairs meet their minimum`);
process.exit(failed ? 1 : 0);
