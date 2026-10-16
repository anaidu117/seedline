// Admin CSV import (spec section 10).
// mode "preview": validate every row, report reasons, and show diffs for slugs that already exist.
// mode "commit": import valid rows. Existing slugs are only overwritten when listed in `overwrite`.
import { diffRow, validateCsv } from '../../../shared/csv/csv.ts';
import { json, preflight, requireAdmin, serviceClient } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'Use POST.' }, 405);
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  let body: { csv?: string; mode?: string; overwrite?: string[] };
  try { body = await req.json(); } catch { return json(req, { error: 'Send JSON with csv and mode.' }, 400); }
  if (typeof body.csv !== 'string' || !['preview', 'commit'].includes(body.mode ?? '')) {
    return json(req, { error: 'Send JSON with csv (text) and mode ("preview" or "commit").' }, 400);
  }
  if (body.csv.length > 5_000_000) return json(req, { error: 'The file is larger than 5 MB. Split it into smaller files.' }, 413);

  const parsed = validateCsv(body.csv);
  if (parsed.headerErrors.length) return json(req, { headerErrors: parsed.headerErrors, rows: [] });

  const db = serviceClient();
  const slugs = parsed.rows.filter((r) => r.ok).map((r) => r.slug);
  const { data: existingRows, error } = slugs.length
    ? await db.from('opportunities').select('*').in('slug', slugs)
    : { data: [], error: null };
  if (error) return json(req, { error: error.message }, 500);
  const existing = new Map((existingRows ?? []).map((r) => [r.slug as string, r as Record<string, unknown>]));

  if (body.mode === 'preview') {
    return json(req, {
      headerErrors: [],
      rows: parsed.rows.map((r) => r.ok
        ? { line: r.line, slug: r.slug, ok: true, exists: existing.has(r.slug), diff: existing.has(r.slug) ? diffRow(existing.get(r.slug)!, r.row.opportunity) : [] }
        : { line: r.line, slug: r.slug, ok: false, errors: r.errors }),
    });
  }

  const overwrite = new Set(body.overwrite ?? []);
  const report = { imported: [] as string[], updated: [] as string[], skipped: [] as string[], rejected: [] as { line: number; slug: string; errors: string[] }[] };
  for (const r of parsed.rows) {
    if (!r.ok) { report.rejected.push({ line: r.line, slug: r.slug, errors: r.errors }); continue; }
    if (existing.has(r.slug) && !overwrite.has(r.slug)) { report.skipped.push(r.slug); continue; }
    const res = await db.rpc('admin_import_opportunity', { p_row: r.row.opportunity, p_notes: r.row.research_notes, p_overwrite: overwrite.has(r.slug) });
    if (res.error) { report.rejected.push({ line: r.line, slug: r.slug, errors: [res.error.message] }); continue; }
    if (res.data === 'inserted') report.imported.push(r.slug);
    else if (res.data === 'updated') report.updated.push(r.slug);
    else report.skipped.push(r.slug);
  }
  return json(req, report);
});
