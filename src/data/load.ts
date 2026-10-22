import indexJson from '../../data/index.json';
import { parseIndex, parseSpecies, type Species, type SpeciesIndex } from './schema';

const modules = import.meta.glob('../../data/species/*.json', { import: 'default' });

export function loadIndex(): SpeciesIndex {
  return parseIndex(indexJson);
}

/** Adding a species is a JSON file plus an index entry. The globe does not grow a branch for it. */
export async function loadSpecies(id: string): Promise<Species> {
  const key = `../../data/species/${id}.json`;
  const load = modules[key];
  if (!load) throw new Error(`No data file for ${id}`);
  return parseSpecies(await load());
}

export async function loadCatalog(): Promise<{ index: SpeciesIndex; species: Species[] }> {
  const index = loadIndex();
  const species = await Promise.all(index.species.map((entry) => loadSpecies(entry.id)));
  return { index, species };
}
