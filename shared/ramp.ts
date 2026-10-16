// The only source of ordinal colors (deadline urgency, materials readiness). Spec section 11.
// Stops: navy, Carolina blue, amber. Never hand-pick a hue for an ordinal value.
const RAMP_STOPS = [[19, 41, 75], [75, 156, 211], [242, 165, 65]]; // navy, Carolina blue, amber
export function ramp(t: number, alpha?: number): string {
  const x = Math.max(0, Math.min(1, t)) * (RAMP_STOPS.length - 1);
  const i = Math.min(RAMP_STOPS.length - 2, Math.floor(x));
  const fr = x - i;
  const c = RAMP_STOPS[i].map((v, k) => Math.round(v + (RAMP_STOPS[i + 1][k] - v) * fr));
  return alpha === undefined ? `rgb(${c.join(',')})` : `rgba(${c.join(',')},${alpha})`;
}

/**
 * Deadline urgency: 0 when 60 or more days away (navy), 1 at or past the deadline (amber).
 * Amber is reserved for deadlines and wins, so only urgency reaches the top of the ramp.
 */
export function urgencyT(daysLeft: number): number {
  return Math.max(0, Math.min(1, 1 - daysLeft / 60));
}

/** Materials readiness uses the lower half of the ramp only: navy (none ready) to Carolina blue (all ready). */
export function readinessT(ready: number, required: number): number {
  return required === 0 ? 0.5 : 0.5 * (ready / required);
}
