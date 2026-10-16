import { valueLabel, type VerificationStatus } from '../../../shared/vocab.ts';
import { supabase } from '../../lib/supabase.ts';

export function VerificationChip({ status }: { status: VerificationStatus }) {
  const cls = status === 'unverified' ? 'bg-error-tint text-error' : 'bg-blue-tint text-navy';
  return <span className={`chip ${cls}`}>{valueLabel(status)}</span>;
}

/**
 * "Mark verified" (spec section 10): sets verification_status, last_verified_at and verified_by.
 * A listing verified by its organizer keeps that badge; reviewing an organizer edit clears the flag.
 */
export async function markVerified(id: string, current: VerificationStatus, adminEmail: string): Promise<void> {
  const { error } = await supabase.from('opportunities').update({
    verification_status: current === 'organizer_verified' ? 'organizer_verified' : 'verified',
    last_verified_at: new Date().toISOString(),
    verified_by: adminEmail,
    organizer_edited_at: null,
  }).eq('id', id);
  if (error) throw error;
}
