import { describe, expect, it } from 'vitest';
import {
  clampLatitude,
  displayPositions,
  distanceKm,
  isValidLngLat,
  placementsFor,
  spreadOverlaps,
  SPREAD_SEPARATION_PX,
} from '../src/spread';

describe('distance and coordinates', () => {
  it('measures a short north-south leg in kilometres', () => {
    const km = distanceKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(km).toBeGreaterThan(110);
    expect(km).toBeLessThan(112);
  });

  it('rejects latitudes outside the pole', () => {
    expect(isValidLngLat(91, 0)).toBe(false);
    expect(isValidLngLat(-68, -40)).toBe(true);
    expect(clampLatitude(-90.1176)).toBe(-90);
  });
});

describe('displayPositions', () => {
  it('keeps an isolated pin on its coordinates', () => {
    const shown = displayPositions([{ id: 'mara', lat: -1.5, lng: 35 }]);
    expect(shown.get('mara')).toEqual({ lat: -1.5, lng: 35, offsetX: 0, offsetY: 0 });
  });

  it('separates two pins on the same crossing in screen pixels', () => {
    const shown = displayPositions([
      { id: 'a', lat: -1.5, lng: 35 },
      { id: 'b', lat: -1.5, lng: 35.01 },
    ]);
    const a = shown.get('a')!;
    const b = shown.get('b')!;
    expect(a.lat).toBe(-1.5);
    expect(b.lng).toBe(35.01);
    expect(Math.hypot(a.offsetX - b.offsetX, a.offsetY - b.offsetY)).toBeGreaterThanOrEqual(SPREAD_SEPARATION_PX - 0.01);
  });

  it('clamps a latitude that would fall outside the pole', () => {
    const shown = displayPositions([{ id: 'past-pole', lat: -90.1176, lng: 0 }]);
    expect(shown.get('past-pole')!.lat).toBe(-90);
    expect(isValidLngLat(shown.get('past-pole')!.lat, shown.get('past-pole')!.lng)).toBe(true);
  });
});

describe('spreadOverlaps', () => {
  it('separates pins within one dot and leaves distant pins', () => {
    const close = spreadOverlaps([
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 10, y: 0 },
    ]);
    const a = close.get('a')!;
    const b = close.get('b')!;
    expect(Math.hypot(10 + b.x - a.x, b.y - a.y)).toBeGreaterThanOrEqual(SPREAD_SEPARATION_PX - 0.01);
    const far = spreadOverlaps([
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 80, y: 0 },
    ]);
    expect(far.get('a')).toEqual({ x: 0, y: 0 });
    expect(far.get('b')).toEqual({ x: 0, y: 0 });
  });
});

describe('placementsFor', () => {
  it('skips one bad pin and still places the others', () => {
    const { kept, skipped } = placementsFor([
      { id: 'mara', lat: -1.5, lng: 35 },
      { id: 'bad-pin', lat: -90.1176, lng: 0 },
    ]);
    expect(skipped.map((event) => event.id)).toEqual(['bad-pin']);
    expect(kept.map((event) => event.id)).toEqual(['mara']);
    expect(isValidLngLat(kept[0].lat, kept[0].lng)).toBe(true);
  });
});
