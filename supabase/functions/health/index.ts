// Health check. Also proves Edge Functions can import the shared vocabulary.
import { STAGES, CSV_COLUMNS } from '../../../shared/vocab.ts';

Deno.serve(() =>
  new Response(JSON.stringify({ ok: true, stages: STAGES.length, csvColumns: CSV_COLUMNS.length }), {
    headers: { 'content-type': 'application/json' },
  }),
);
