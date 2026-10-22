import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseIndex, parseSpecies, type Species } from '../src/data/schema';
import { positionAt } from '../src/motion/interpolate';

const dataDir = path.join(process.cwd(), 'data');

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

describe('species files', () => {
  const index = parseIndex(readJson(path.join(dataDir, 'index.json')));
  const files = readdirSync(path.join(dataDir, 'species')).filter((name) => name.endsWith('.json'));
  const species = files.map((name) => parseSpecies(readJson(path.join(dataDir, 'species', name))));

  it('matches the index and parses every file', () => {
    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(index.species.map((entry) => entry.id).sort()).toEqual(species.map((item) => item.id).sort());
  });

  it('gives every point a status and a source, and labels literature routes representative', () => {
    species.forEach((item) => {
      const entry = index.species.find((candidate) => candidate.id === item.id);
      expect(entry?.colour).toBe(item.colour);
      expect(entry?.bbox).toEqual(item.bbox);
      expect(item.uncertaintyNote.toLowerCase()).toContain('representative');
      item.tracks.forEach((track) => {
        expect(track.fixes.length).toBeGreaterThan(1);
        track.fixes.forEach((fix) => {
          expect(fix.status).toBe('representative');
          expect(fix.source.length).toBeGreaterThan(0);
          expect(item.provenance.some((source) => source.id === fix.source)).toBe(true);
        });
      });
    });
  });

  it('keeps the tern in the Southern Ocean in January and moves the wildebeest between day 30 and day 200', () => {
    const tern = species.find((item) => item.id === 'arctic-tern') as Species;
    const herd = species.find((item) => item.id === 'wildebeest') as Species;
    tern.tracks.forEach((track) => {
      const january = positionAt(track.fixes, 15, track.loop, track.id);
      expect(january?.lat).toBeLessThan(-50);
    });
    const early = positionAt(herd.tracks[0].fixes, 30, true);
    const later = positionAt(herd.tracks[0].fixes, 200, true);
    expect(early && later).toBeTruthy();
    expect(Math.abs((early?.lat ?? 0) - (later?.lat ?? 0))).toBeGreaterThan(0.4);
  });

  it('rejects a point with no status', () => {
    const broken = structuredClone(species[0]) as Species;
    delete (broken.tracks[0].fixes[0] as { status?: string }).status;
    expect(() => parseSpecies(broken)).toThrow(/status/);
  });
});
