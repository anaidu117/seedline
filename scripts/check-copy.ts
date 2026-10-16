// Static copy checks over everything a founder or admin can read, including email templates.
// Fails on: em dashes, UNC names or marks in Seedline's own branding, and percentage strings.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (f === 'node_modules' || f.startsWith('.')) return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = [
  ...walk('src'), ...walk('shared'), ...walk('supabase/functions'), 'index.html', 'public/favicon.svg', 'data/examples.csv', 'supabase/seed.sql',
].filter((f) => /\.(tsx?|html|svg|csv|sql)$/.test(f) && !/\.test\.ts$/.test(f));

const problems: string[] = [];
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const at = `${f}:${i + 1}`;
    if (line.includes('—')) problems.push(`${at} em dash`);
    // UNC appears only as a school option label in the vocabulary (data, not branding).
    // "Carolina blue" is the spec's name for the brand color, used as a color only, so it is not checked.
    if (/\bUNC\b|Tar Heel|Chapel Hill/.test(line) && !f.endsWith('shared/vocab.ts') && !f.endsWith('examples.csv') && !f.endsWith('seed.sql')
        && !f.endsWith('scripts/examples.ts') && !/^\s*(\/\/|\*|\/\*)/.test(line) && !line.includes('--color-carolina')) {
      problems.push(`${at} UNC name or mark: ${line.trim().slice(0, 80)}`);
    }
    if (/['"`>][^'"`<]*\d\s?%[^'"`<]*['"`<]/.test(line) && !/encodeURI|%2F|%25|w-\[|h-\[|translate|calc\(|width="100%"/.test(line)) problems.push(`${at} percentage: ${line.trim().slice(0, 80)}`);
  });
}
// Brand surfaces must not mention UNC at all.
for (const f of ['index.html', 'src/components/Layout.tsx', 'src/pages/Landing.tsx', 'public/favicon.svg', 'supabase/functions/_shared/templates.ts']) {
  if (/\bUNC\b|Tar Heel|University of North Carolina/.test(readFileSync(f, 'utf8'))) problems.push(`${f} mentions UNC in Seedline's branding`);
}
console.log(problems.length ? problems.join('\n') : `check-copy: ${files.length} files clean (no em dashes, no UNC branding, no bare percentages)`);
process.exit(problems.length ? 1 : 0);
