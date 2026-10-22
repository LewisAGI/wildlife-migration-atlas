import { buildCatalog } from './fromPack';
import type { Species, SpeciesIndex } from './schema';

let catalogPromise: Promise<{ index: SpeciesIndex; species: Species[] }> | null = null;

/** The globe reads the v3 pack. Adding a population means extending that pack, not a new code path. */
export function loadCatalog(): Promise<{ index: SpeciesIndex; species: Species[] }> {
  catalogPromise ??= Promise.all([
    import('../../data/pack/content.json'),
    import('../../data/pack/sources.json'),
  ]).then(([content, sources]) => buildCatalog(content.default, sources.default));
  return catalogPromise;
}

export async function loadIndex(): Promise<SpeciesIndex> {
  return (await loadCatalog()).index;
}

export async function loadSpecies(id: string): Promise<Species> {
  const species = (await loadCatalog()).species.find((item) => item.id === id);
  if (!species) throw new Error(`No data file for ${id}`);
  return species;
}
