export const NOT_DISCLOSED = 'Not disclosed';
export const NOT_ENOUGH_DATA = 'Not enough data yet';

export function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** "Up to $10,000", "$5,000 to $10,000", or "Not disclosed". Never zero for an unknown amount. */
export function amountLine(min: number | null | undefined, max: number | null | undefined): string {
  if (max == null && min == null) return NOT_DISCLOSED;
  if (max == null) return `From ${formatUsd(min!)}`;
  if (min == null || min === max) return `Up to ${formatUsd(max)}`;
  return `${formatUsd(min)} to ${formatUsd(max)}`;
}
