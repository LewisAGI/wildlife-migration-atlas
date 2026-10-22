import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import content from '../data/pack/content.json';
import sources from '../data/pack/sources.json';
import { buildCatalog } from '../src/data/fromPack';
import { positionAt } from '../src/motion/interpolate';
import { routeFeatures } from '../src/globe/routes';

const catalog = buildCatalog(content, sources);

describe('v3 pack', () => {
  it('loads 58 populations', () => {
    expect(catalog.species).toHaveLength(58);
    expect(catalog.index.species).toHaveLength(58);
    expect(new Set(catalog.species.map((item) => item.id)).size).toBe(58);
    expect(new Set(catalog.species.map((item) => item.shortName)).size).toBe(58);
  });

  it('keeps observed, sightings, estimated and no-data months distinct', () => {
    const counts = { observed: 0, 'observed-sightings': 0, representative: 0, 'no-data': 0 };
    catalog.species.forEach((item) => {
      expect(item.months).toHaveLength(12);
      item.months.forEach((month) => {
        counts[month.status] += 1;
        if (month.status === 'no-data') expect(month.lat).toBeNull();
        if (month.status === 'observed' || month.status === 'observed-sightings') expect(month.lat).not.toBeNull();
      });
    });
    expect(counts).toEqual({ observed: 370, 'observed-sightings': 12, representative: 250, 'no-data': 64 });
  });

  it('styles monarch sightings apart from tracked months and labels computed distances as minimums', () => {
    const sightings = catalog.species.find((item) => item.id === 'monarch-sightings');
    expect(sightings?.months.every((month) => month.status === 'observed-sightings')).toBe(true);
    expect(sightings?.tracks.flatMap((track) => track.fixes).every((fix) => fix.sightings)).toBe(true);
    expect(routeFeatures(sightings!).every((line) => line.properties?.stroke === 3)).toBe(true);
    const computed = catalog.species.filter((item) => /minimum/i.test(item.distance));
    expect(computed.length).toBeGreaterThan(30);
    expect(catalog.species.find((item) => item.id === 'wildebeest-serengeti-obs')?.distance).toMatch(/minimum/i);
    expect(catalog.species.find((item) => item.id === 'himalayan-griffon')?.distance).toMatch(/minimum/i);
  });

  it('shows CC BY-NC for every non-commercial entry and keeps Serengeti NDVI on the months', () => {
    const restricted = catalog.species.filter((item) => item.nonCommercial);
    expect(restricted.map((item) => item.id).sort()).toEqual([
      'arctic-tern-obs',
      'humpback-wap',
      'leatherback-south-africa-nc',
      'monarch-sightings',
      'osprey-europe-birdmap',
      'white-stork-birdmap',
    ]);
    restricted.forEach((item) => expect(item.datasetLicence).toBe('CC BY-NC 4.0'));
    const herd = catalog.species.find((item) => item.id === 'wildebeest-serengeti-obs');
    expect(herd?.months[0].ndvi).toBeCloseTo(0.485);
    expect(herd?.months[0].nitrogen).toBeCloseTo(1.276);
    expect(herd?.months.every((month) => month.ndvi != null)).toBe(true);
    const licences = readFileSync(new URL('../data/LICENSES.md', import.meta.url), 'utf8');
    expect(licences).toMatch(/paid version/i);
    expect(licences).toMatch(/nonCommercial/);
  });

  it('labels the honey buzzard dataset CC BY-NC 4.0', () => {
    const buzzard = catalog.species.find((item) => item.id === 'honey-buzzard-finland');
    expect(buzzard?.datasetLicence).toBe('CC BY-NC 4.0');
    const dataset = buzzard?.provenance.find((item) => item.id === 'movebank-10-5441-001-1-335');
    expect(dataset?.licence).toContain('CC BY-NC 4.0');
    expect(dataset?.licence.toLowerCase()).toContain('non commercial');
  });

  it('says the tern paper is free to read and gives the wildebeest circuit as 800–1,000 km', () => {
    const tern = catalog.species.find((item) => item.id === 'arctic-tern');
    const paper = tern?.provenance.find((item) => item.id === 'doi-10-1073-pnas-0909493107');
    expect(paper?.licence).toContain('free to read');
    expect(paper?.licence.toLowerCase()).not.toContain('open access');
    expect(tern?.citedKm).toBe(70900);
    const herd = catalog.species.find((item) => item.id === 'blue-wildebeest');
    expect(herd?.distance).toContain('800–1,000 km');
  });

  it('draws monarch generations as separate colours and leaves the September humpback gap empty', () => {
    const monarch = catalog.species.find((item) => item.id === 'monarch');
    const colours = new Set(monarch?.tracks.flatMap((track) => track.fixes.map((fix) => fix.colour)));
    expect(colours.size).toBe(4);
    const strokes = routeFeatures(monarch!).map((line) => line.properties?.stroke);
    expect(strokes.every((stroke) => stroke === 1)).toBe(true);
    const whales = catalog.species.find((item) => item.id === 'humpback-east-australia');
    expect(whales?.months[8].status).toBe('no-data');
    expect(whales?.tracks.every((track) => positionAt(track.fixes, 258, track.loop, track.id) == null)).toBe(true);
    const hawaii = catalog.species.find((item) => item.id === 'humpback-hawaii');
    expect(hawaii?.names.scientific).toBe(whales?.names.scientific);
  });

  it('does not close one-way life cycles', () => {
    for (const id of ['eel', 'sockeye']) {
      const species = catalog.species.find((item) => item.id === id);
      expect(species?.migrationType).toBe('oneWay');
      expect(species?.tracks.every((track) => track.loop === false)).toBe(true);
    }
  });
});

describe('review follow-ups', () => {
  it('gives event pins a 44px hit area and keeps short pin labels on one line', () => {
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.pin::before\s*\{[^}]*inset:\s*-6px/);
    expect(css).toMatch(/\.pin-label\s*\{[^}]*white-space:\s*nowrap/);
    expect(css).toMatch(/\.month-option\.is-sightings/);
  });

  it('pins the pages workflow and splits maplibre into its own chunk', () => {
    const workflow = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
    expect(workflow).toMatch(/permissions:\s+contents:\s+read/);
    expect(workflow).not.toMatch(/uses:\s+actions\/checkout@v/);
    expect(workflow).not.toMatch(/uses:\s+actions\/setup-node@v/);
    expect(workflow).toContain('actions/checkout@11d5960a326750d5838078e36cf38b85af677262');
    expect(workflow).toContain('actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020');
    const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
    expect(vite).toContain('manualChunks');
    expect(vite).toContain('maplibre');
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    expect(readme).toMatch(/HOHM bridge/i);
    expect(readme).toMatch(/remove the deploy jobs/i);
  });
});
