import { describe, expect, it } from 'vitest';
import content from '../data/pack/content.json';
import sources from '../data/pack/sources.json';
import { buildCatalog } from '../src/data/fromPack';
import { parseSpecies, type Species } from '../src/data/schema';
import { positionAt } from '../src/motion/interpolate';

const catalog = buildCatalog(content, sources);

describe('species files', () => {
  const species = catalog.species;

  it('matches the index and parses every population', () => {
    expect(species.length).toBe(47);
    expect(catalog.index.species.map((entry) => entry.id)).toEqual(species.map((item) => item.id));
  });

  it('gives every positioned month a status and a source', () => {
    species.forEach((item) => {
      const entry = catalog.index.species.find((candidate) => candidate.id === item.id);
      expect(entry?.colour).toBe(item.colour);
      expect(entry?.bbox).toEqual(item.bbox);
      item.tracks.forEach((track) => {
        expect(track.fixes.length).toBeGreaterThan(0);
        track.fixes.forEach((fix) => {
          expect(['observed', 'representative']).toContain(fix.status);
          expect(fix.source.length).toBeGreaterThan(0);
          expect(item.provenance.some((source) => source.id === fix.source)).toBe(true);
        });
      });
    });
  });

  it('keeps the tern in the Southern Ocean in January and moves the wildebeest between day 30 and day 200', () => {
    const tern = species.find((item) => item.id === 'arctic-tern') as Species;
    const herd = species.find((item) => item.id === 'blue-wildebeest') as Species;
    const january = sampleOn(tern, 15);
    expect(january?.lat).toBeLessThan(-50);
    const early = sampleOn(herd, 30);
    const later = sampleOn(herd, 200);
    expect(early && later).toBeTruthy();
    expect(Math.abs((early?.lat ?? 0) - (later?.lat ?? 0))).toBeGreaterThan(0.4);
  });

  it('rejects a point with no status', () => {
    const broken = structuredClone(species[0]) as Species;
    delete (broken.tracks[0].fixes[0] as { status?: string }).status;
    expect(() => parseSpecies(broken)).toThrow(/status/);
  });

  it('rejects a leg longer than 170 degrees', () => {
    const broken = structuredClone(species[0]) as Species;
    const donor = broken.tracks[0].fixes[0];
    broken.tracks = [
      {
        id: 'too-far',
        loop: false,
        fixes: [
          { ...donor, t: 10, lat: 0, lng: 0 },
          { ...donor, t: 40, lat: 0, lng: 179 },
        ],
      },
    ];
    expect(() => parseSpecies(broken)).toThrow(/170/);
  });
});

function sampleOn(species: Species, day: number) {
  for (const track of species.tracks) {
    const sample = positionAt(track.fixes, day, track.loop, track.id);
    if (sample) return sample;
  }
  return null;
}
