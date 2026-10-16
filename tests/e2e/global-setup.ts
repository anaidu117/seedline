// Test fixtures only (PLAN.md Q11): the EXAMPLE rows are verified inside the local test database so the
// founder views have something to show, and a local test admin exists. Nothing here touches production.
import { adminClient, withDb } from '../helpers/local.ts';

export const E2E_ADMIN = 'e2e-admin@example.com';

export default async function globalSetup() {
  const db = adminClient();
  await db.from('opportunities').update({ verification_status: 'verified', last_verified_at: new Date().toISOString(), verified_by: 'e2e-fixture' })
    .like('slug', 'example-%').eq('verification_status', 'unverified');
  await withDb((c) => c.query('insert into public.admins (email) values ($1) on conflict do nothing', [E2E_ADMIN]));
}
