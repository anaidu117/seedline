export const DISCLAIMER = 'Information only, not legal or investment advice. Always confirm details with the organizer.';

export function Disclaimer({ className = '' }: { className?: string }) {
  return <p className={`text-[length:var(--text-meta)] text-muted ${className}`}>{DISCLAIMER}</p>;
}
