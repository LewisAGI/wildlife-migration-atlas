import { describe, expect, it } from 'vitest';
import type { Species } from '../src/data/schema';
import { routeFeatures } from '../src/globe/routes';

describe('route lines', () => {
  it('splits a track that crosses the antimeridian', () => {
    const species = {
      id: 'cross',
      colour: '#79c7e8',
      tracks: [
        {
          id: 'date-line',
          loop: false,
          fixes: [
            { t: 0, lat: 66, lng: 170, status: 'representative', uncertaintyKm: 10, source: 's' },
            { t: 5, lat: 65, lng: -168, status: 'representative', uncertaintyKm: 10, source: 's' },
            { t: 10, lat: 64, lng: -155, status: 'representative', uncertaintyKm: 10, source: 's' },
          ],
        },
      ],
    } as Species;
    const lines = routeFeatures(species);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.properties?.stroke === 1)).toBe(true);
    lines.forEach((line) => {
      const coordinates = line.geometry.coordinates;
      for (let index = 1; index < coordinates.length; index += 1) {
        expect(Math.abs(coordinates[index][0] - coordinates[index - 1][0])).toBeLessThanOrEqual(180);
      }
    });
  });

  it('styles observed, estimated and dispersed months differently', () => {
    const species = {
      id: 'mixed',
      colour: '#e2a04a',
      tracks: [
        {
          id: 'year',
          loop: false,
          fixes: [
            { t: 15, lat: 0, lng: 10, status: 'observed', uncertaintyKm: 20, source: 's' },
            { t: 45, lat: 1, lng: 11, status: 'observed', uncertaintyKm: 20, source: 's' },
            { t: 74, lat: 2, lng: 12, status: 'representative', uncertaintyKm: 200, source: 's' },
            { t: 105, lat: 3, lng: 13, status: 'observed', uncertaintyKm: 400, source: 's', dispersed: true },
          ],
        },
      ],
    } as Species;
    const strokes = routeFeatures(species).map((line) => line.properties?.stroke);
    expect(strokes).toEqual([0, 1, 2]);
  });
});
