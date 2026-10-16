import { describe, expect, it } from 'vitest';
import { ramp, readinessT, urgencyT } from './ramp.ts';

describe('ramp', () => {
  it('returns the three stops from spec section 11', () => {
    expect(ramp(0)).toBe('rgb(19,41,75)');
    expect(ramp(0.5)).toBe('rgb(75,156,211)');
    expect(ramp(1)).toBe('rgb(242,165,65)');
  });
  it('clamps out-of-range input', () => {
    expect(ramp(-1)).toBe('rgb(19,41,75)');
    expect(ramp(2)).toBe('rgb(242,165,65)');
  });
  it('supports alpha', () => {
    expect(ramp(0, 0.2)).toBe('rgba(19,41,75,0.2)');
  });
  it('maps urgency and readiness into the ramp', () => {
    expect(urgencyT(60)).toBe(0);
    expect(urgencyT(0)).toBe(1);
    expect(readinessT(4, 4)).toBe(0.5);
    expect(readinessT(0, 4)).toBe(0);
  });
});
