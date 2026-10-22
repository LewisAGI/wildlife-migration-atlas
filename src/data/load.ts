import content from '../../data/pack/content.json';
import sources from '../../data/pack/sources.json';
import { buildCatalog } from './fromPack';
import type { Species, SpeciesIndex } from './schema';

const catalog = buildCatalog(content, sources);

export function loadIndex(): SpeciesIndex {
  return catalog.index;
}

/** The globe reads the v2 pack. Adding a population means extending that pack, not a new code path. */
export async function loadSpecies(id: string): Promise<Species> {
  const species = catalog.species.find((item) => item.id === id);
  if (!species) throw new Error(`No data file for ${id}`);
  return species;
}

export async function loadCatalog(): Promise<{ index: SpeciesIndex; species: Species[] }> {
  return catalog;
}
