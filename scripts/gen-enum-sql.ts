// Prints the CREATE TYPE statements for every database enum, generated from shared/vocab.ts.
// Used to write supabase/migrations/*_enums.sql. tests/db/enums-match-vocab.test.ts checks the result.
import { DB_ENUMS } from '../shared/vocab.ts';

const lines = Object.entries(DB_ENUMS).map(
  ([name, values]) => `create type public.${name} as enum (${values.map((v) => `'${v}'`).join(', ')});`,
);
console.log(lines.join('\n'));
