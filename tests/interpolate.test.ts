import { describe, expect, it } from 'vitest';
import type { Fix } from '../src/data/schema';
import { slerp } from '../src/geo';
import { positionAt } from '../src/motion/interpolate';
import { distanceKm } from '../src/spread';

function fix(t: number, lat: number, lng: number, via?: { lat: number; lng: number }[]): Fix {
  return { t, lat, lng, status: 'observed', uncertaintyKm: 10, source: 's', via };
}

describe('positionAt', () => {
  const leg = [fix(0, 10, 0), fix(10, 10, 80)];

  it('returns the fix itself when the day lands on it', () => {
    const at = positionAt(leg, 0, false);
    expect(at).toMatchObject({ lat: 10, lng: 0, status: 'observed' });
    const end = positionAt(leg, 10, false);
    expect(end).toMatchObject({ lat: 10, lng: 80, status: 'observed' });
  });

  it('puts the time midpoint on the great circle', () => {
    const mid = positionAt(leg, 5, false);
    const curve = slerp(leg[0], leg[1], 0.5);
    expect(mid?.status).toBe('interpolated');
    expect(mid?.lat).toBeCloseTo(curve.lat, 5);
    expect(mid?.lng).toBeCloseTo(curve.lng, 5);
  });

  it('hides a one-way track outside its dates and wraps a loop from December to January', () => {
    const year = [fix(20, 0, 10), fix(340, 0, -10)];
    expect(positionAt(year, 0, false)).toBeNull();
    const wrapped = positionAt(year, 0, true);
    expect(wrapped).not.toBeNull();
    expect(wrapped?.status).toBe('interpolated');
    const atFix = positionAt(year, 340, true);
    expect(atFix).toMatchObject({ lat: 0, lng: -10, status: 'observed' });
  });

  it('moves faster on a short timed leg than on a long one', () => {
    const fixes = [fix(0, 0, 0), fix(10, 0, 40), fix(110, 0, 42)];
    const speed = (t: number) => {
      const a = positionAt(fixes, t, false);
      const b = positionAt(fixes, t + 1, false);
      if (!a || !b) throw new Error('missing sample');
      return distanceKm(a, b);
    };
    expect(speed(2)).toBeGreaterThan(speed(50) * 5);
  });

  it('spends the timed leg along coast-following waypoints, by arc length', () => {
    const fixes = [fix(0, 0, 0), fix(10, 0, 10, [{ lat: 30, lng: 5 }])];
    const mid = positionAt(fixes, 5, false);
    expect(mid?.lat).toBeGreaterThan(8);
    expect(mid?.status).toBe('interpolated');
  });
});
