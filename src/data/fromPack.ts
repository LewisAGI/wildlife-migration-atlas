import { MONTH_DAYS, MONTH_NAMES } from './months';
import type {
  Fix,
  MigrationType,
  MonthPoint,
  MonthStatus,
  Provenance,
  Species,
  SpeciesEvent,
  SpeciesIndex,
  TagTemperature,
  Track,
} from './schema';
import { parseSpecies } from './schema';

interface PackMonth {
  month: string;
  region?: string;
  lat?: number | null;
  lng?: number | null;
  status: string;
  nFixes?: number | null;
  nIndividuals?: number | null;
  iqrLat?: number[] | null;
  iqrLon?: number[] | null;
  method?: string;
  uncertainty?: string | null;
  sources?: string[];
}

interface PackTemperature {
  month: string;
  medianC: number;
  n: number;
}

interface PackMonthlyValue {
  month: string;
  value: number;
}

interface PackSpecies {
  id: string;
  commonName: string;
  scientificName: string;
  population: string;
  migrationType: string;
  distance: string | null;
  distanceStatus: string;
  summary: string;
  monthlyPositions: PackMonth[];
  environment: {
    drivers_food?: string | null;
    breeding?: string | null;
    threats?: string | null;
    temperature?: PackTemperature[] | null;
    temperatureNote?: string | null;
    iucnStatus?: string | null;
    iucnNote?: string | null;
    ndviMonthlyMedian?: PackMonthlyValue[] | null;
    grassNitrogenMonthlyMedian?: PackMonthlyValue[] | null;
  };
  evidence?: string;
  inference?: string;
  uncertainty?: string;
  sources: string[];
  dataStatus?: string;
  nonCommercial?: boolean;
  nonCommercialSources?: string[];
}

interface PackSource {
  id: string;
  type?: string;
  doi?: string;
  url?: string;
  title?: string;
  authors?: string[];
  creators?: string[];
  year?: number;
  journal?: string;
  licence?: string;
  nonCommercial?: boolean;
}

interface PackContent {
  species: PackSpecies[];
}

interface PackSources {
  sources: PackSource[];
}

const MIGRATION: Record<string, MigrationType> = {
  loop: 'loop',
  oneway: 'oneWay',
  multigenerational: 'multigenerational',
  multiroute: 'multiRoute',
  partial: 'partial',
  local: 'local',
  nomadic: 'nomadic',
};

const YEAR_LOOP = new Set<MigrationType>(['loop', 'local', 'multigenerational', 'multiRoute']);

const LEAD = [
  'blue-wildebeest',
  'arctic-tern',
  'monarch',
  'humpback-hawaii',
  'humpback-east-australia',
  'honey-buzzard-finland',
  'wildebeest-serengeti-obs',
  'arctic-tern-obs',
  'monarch-sightings',
  'leatherback-south-africa',
  'whale-shark-ningaloo-obs',
  'himalayan-griffon',
];

const COLOUR: Record<string, string> = {
  'blue-wildebeest': '#e2a04a',
  'arctic-tern': '#79c7e8',
  monarch: '#e25b45',
  'humpback-hawaii': '#5ec8c5',
  'humpback-east-australia': '#3d7ee8',
  'honey-buzzard-finland': '#c6a15b',
  'wildebeest-serengeti-obs': '#c4842a',
  'arctic-tern-obs': '#4aa3d8',
  'monarch-sightings': '#d98a3a',
  'leatherback-south-africa': '#6a8f72',
  'leatherback-south-africa-nc': '#3f6b56',
  'whale-shark-ningaloo-obs': '#3aa0b8',
  'himalayan-griffon': '#8d6b4a',
};

const SHORT: Record<string, string> = {
  'blue-wildebeest': 'Blue wildebeest',
  'arctic-tern': 'Arctic tern',
  monarch: 'Monarch butterfly',
  'humpback-hawaii': 'Humpback whale, Hawaii',
  'humpback-east-australia': 'Humpback whale, east Australia',
  'grey-whale': 'Gray whale',
  'bar-tailed-godwit': 'Bar-tailed godwit',
  'bar-tailed-godwit-mb': 'Bar-tailed godwit, tracked',
  'white-stork': 'White stork',
  'white-stork-mb': 'White stork, tracked',
  'barn-swallow': 'Barn swallow',
  'ruby-throated-hummingbird': 'Ruby-throated hummingbird',
  'caribou-porcupine': 'Porcupine caribou',
  'leatherback-turtle': 'Leatherback turtle',
  eel: 'European eel',
  sockeye: 'Sockeye salmon',
  osprey: 'Osprey, Scotland',
  'osprey-north-america': 'Osprey, North America',
  'amur-falcon': 'Amur falcon',
  'whale-shark': 'Whale shark',
  'straw-coloured-fruit-bat': 'Straw-coloured fruit bat, Kasanka',
  'fruit-bat-ghana': 'Straw-coloured fruit bat, Accra',
  'christmas-island-crab': 'Christmas Island red crab',
  saiga: 'Saiga',
  'mongolian-gazelle': 'Mongolian gazelle',
  'wildebeest-kenya-mara': 'Wildebeest, Mara',
  'wildebeest-kenya-athi-kaputiei': 'Wildebeest, Athi-Kaputiei',
  'wildebeest-kenya-amboseli': 'Wildebeest, Amboseli',
  'common-cuckoo': 'Common cuckoo',
  'turkey-vulture': 'Turkey vulture',
  'common-crane-sweden': 'Common crane, Sweden',
  'common-crane-russia': 'Common crane, Russia',
  'alpine-swift': 'Alpine swift',
  'white-fronted-goose': 'White-fronted goose',
  'black-kite-gibraltar': 'Black kite',
  'elk-ya-ha-tinda': 'Elk',
  'zebra-botswana': 'Plains zebra',
  'golden-eagle-hawkwatch': 'Golden eagle',
  'barnacle-goose-greenland': 'Barnacle goose',
  'loggerhead-med': 'Loggerhead turtle',
  'green-turtle-chagos': 'Green turtle',
  'blue-whale-ne-pacific': 'Blue whale',
  'egyptian-vulture': 'Egyptian vulture',
  'steppe-eagle': 'Steppe eagle',
  'montagus-harrier': "Montagu's harrier",
  pronghorn: 'Pronghorn',
  'arctic-tern-obs': 'Arctic tern, tracked',
  'leatherback-south-africa': 'Leatherback, South Africa',
  'leatherback-south-africa-nc': 'Leatherback, South Africa, restricted',
  'humpback-wap': 'Humpback whale, Antarctic Peninsula',
  'whale-shark-ningaloo-obs': 'Whale shark, Ningaloo',
  'sockeye-smolts-otn': 'Sockeye smolts',
  'white-stork-birdmap': 'White stork, BirdMap',
  'osprey-europe-birdmap': 'Osprey, Europe',
  'wildebeest-serengeti-obs': 'Wildebeest, Serengeti tracked',
  'himalayan-griffon': 'Himalayan griffon',
  'monarch-sightings': 'Monarch sightings',
};

const GENERATION: Record<string, string> = {
  overwinter: '#8fbfef',
  spring: '#f0c14a',
  summer: '#7dbe6a',
  super: '#e25b45',
};

const WILDEBEEST_EVENTS: { month: number; kind: string; label: string; text: string }[] = [
  {
    month: 0,
    kind: 'calving',
    label: 'Calving',
    text: 'Calves are born on the southern short-grass plains, roughly January to March.',
  },
  {
    month: 5,
    kind: 'crossing',
    label: 'Grumeti',
    text: 'Herds cross the Grumeti on the way north. The exact crossing shifts with the rain.',
  },
  {
    month: 6,
    kind: 'crossing',
    label: 'Mara River',
    text: 'The Mara crossing, in the dry season, is the best-known hazard on the circuit.',
  },
  {
    month: 10,
    kind: 'return',
    label: 'Short rains',
    text: 'When the short rains reach the south, the herds leave the Mara.',
  },
];

export function buildCatalog(content: PackContent, sourceFile: PackSources): { index: SpeciesIndex; species: Species[] } {
  const sources = new Map(sourceFile.sources.map((source) => [source.id, source]));
  const ordered = orderSpecies(content.species);
  const species = ordered.map((entry, index) => parseSpecies(toSpecies(entry, index, sources)));
  const index: SpeciesIndex = {
    species: species.map((item) => ({
      id: item.id,
      names: { common: item.shortName, scientific: item.names.scientific },
      colour: item.colour,
      bbox: item.bbox,
    })),
  };
  return { index, species };
}

function orderSpecies(species: PackSpecies[]): PackSpecies[] {
  const rank = new Map(LEAD.map((id, index) => [id, index]));
  return [...species].sort((a, b) => {
    const ar = rank.get(a.id) ?? LEAD.length;
    const br = rank.get(b.id) ?? LEAD.length;
    if (ar !== br) return ar - br;
    return a.commonName.localeCompare(b.commonName);
  });
}

function toSpecies(entry: PackSpecies, index: number, sources: Map<string, PackSource>): Species {
  const migrationType = MIGRATION[entry.migrationType];
  if (!migrationType) throw new Error(`${entry.id} has unknown migrationType ${entry.migrationType}`);
  const ndvi = monthlyValues(entry.environment.ndviMonthlyMedian);
  const nitrogen = monthlyValues(entry.environment.grassNitrogenMonthlyMedian);
  const months = entry.monthlyPositions.map((month, monthIndex) =>
    toMonth(entry.id, month, monthIndex, ndvi[monthIndex], nitrogen[monthIndex]),
  );
  const sourceIds = unique([...entry.sources, ...months.map((month) => month.source)]);
  const provenance = sourceIds.map((id) => toProvenance(id, sources));
  const placed = months.filter((month): month is MonthPoint & { lat: number; lng: number } => month.lat != null && month.lng != null);
  const tracks = toTracks(entry.id, migrationType, placed);
  if (tracks.length === 0) throw new Error(`${entry.id} has no positioned months`);
  const colour = COLOUR[entry.id] ?? paletteColour(index);
  const events = eventsFor(entry.id, months);
  const places = placesFor(months);
  const datasetLicence = strictLicence(sourceIds, sources);
  const nonCommercialSources = nonCommercialSourceIds(entry, sourceIds, sources);
  const nonCommercial =
    entry.nonCommercial === true ||
    nonCommercialSources.length > 0 ||
    sourceIds.some((id) => sourceIsNonCommercial(sources.get(id)));
  return {
    id: entry.id,
    names: { common: entry.commonName, scientific: entry.scientificName },
    population: entry.population,
    colour,
    migrationType,
    bbox: bboxOf(placed),
    range: rangeOf(months, entry.population),
    distance: distanceOf(entry),
    timing: entry.environment.breeding || entry.summary,
    summary: entry.summary,
    uncertaintyNote: uncertaintyOf(entry),
    shortName: SHORT[entry.id] ?? entry.commonName.split('(')[0].trim(),
    months,
    iucn: entry.environment.iucnStatus ?? null,
    threats: entry.environment.threats ?? null,
    temperature: temperaturesOf(entry),
    temperatureNote:
      entry.environment.temperatureNote ||
      'No sourced temperature in this dataset. Tag readings, when present, are not air or water temperature.',
    citedKm: entry.id === 'arctic-tern' && entry.distanceStatus === 'cited' ? 70900 : null,
    datasetLicence: nonCommercial ? 'CC BY-NC 4.0' : datasetLicence,
    nonCommercial,
    nonCommercialSources,
    evidence: entry.evidence || entry.summary,
    tracks,
    events,
    places,
    provenance,
  };
}

function toMonth(
  speciesId: string,
  month: PackMonth,
  index: number,
  ndvi: number | null,
  nitrogen: number | null,
): MonthPoint {
  const name = MONTH_NAMES[index];
  if (month.month !== name) throw new Error(`${speciesId} month ${index} is ${month.month}, expected ${name}`);
  const status = month.status as MonthStatus;
  if (status !== 'observed' && status !== 'observed-sightings' && status !== 'representative' && status !== 'no-data') {
    throw new Error(`${speciesId} ${name} has status ${month.status}`);
  }
  const lat = month.lat ?? null;
  const lng = month.lng ?? null;
  const source = month.sources?.[0];
  if (!source) throw new Error(`${speciesId} ${name} has no source`);
  return {
    month: index,
    name,
    day: MONTH_DAYS[index],
    status,
    lat,
    lng,
    region: month.region?.trim() ?? '',
    dispersed: (month.uncertainty ?? '').includes('DISPERSED'),
    nFixes: typeof month.nFixes === 'number' ? month.nFixes : null,
    nIndividuals: typeof month.nIndividuals === 'number' ? month.nIndividuals : null,
    uncertaintyKm: lat == null ? null : uncertaintyKm(month),
    method: month.method || 'No method recorded.',
    note: month.uncertainty ?? '',
    source,
    ndvi,
    nitrogen,
  };
}

function uncertaintyKm(month: PackMonth): number {
  if (
    month.lat != null &&
    month.iqrLat &&
    month.iqrLon &&
    month.iqrLat.length === 2 &&
    month.iqrLon.length === 2
  ) {
    const latKm = Math.abs(month.iqrLat[1] - month.iqrLat[0]) * 111;
    const lonKm = Math.abs(month.iqrLon[1] - month.iqrLon[0]) * 111 * Math.cos((month.lat * Math.PI) / 180);
    return Math.max(15, Math.round(0.5 * Math.hypot(latKm, lonKm)));
  }
  return month.status === 'representative' ? 250 : 80;
}

function toTracks(
  id: string,
  migrationType: MigrationType,
  placed: (MonthPoint & { lat: number; lng: number })[],
): Track[] {
  const groups: (MonthPoint & { lat: number; lng: number })[][] = [];
  placed.forEach((month) => {
    const current = groups[groups.length - 1];
    const previous = current?.[current.length - 1];
    if (previous && month.month === previous.month + 1) current.push(month);
    else groups.push([month]);
  });
  const closeYear = YEAR_LOOP.has(migrationType) && groups.length === 1 && groups[0].length === 12;
  return groups.map((group) => ({
    id: group.length === 12 ? 'year' : `months-${group[0].name.toLowerCase()}`,
    loop: closeYear,
    fixes: group.map((month) => toFix(id, month)),
  }));
}

function toFix(id: string, month: MonthPoint & { lat: number; lng: number }): Fix {
  const generation = id === 'monarch' ? monarchGeneration(month.month) : null;
  return {
    t: month.day,
    lat: month.lat,
    lng: month.lng,
    status: month.status === 'representative' ? 'representative' : 'observed',
    uncertaintyKm: month.uncertaintyKm ?? (month.status === 'representative' ? 250 : 80),
    source: month.source,
    dispersed: month.dispersed || undefined,
    sightings: month.status === 'observed-sightings' || undefined,
    colour: generation ? GENERATION[generation] : undefined,
    generation: generation ?? undefined,
  };
}

function monarchGeneration(month: number): string {
  if (month <= 2 || month === 11) return 'overwinter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'super';
}

function eventsFor(id: string, months: MonthPoint[]): SpeciesEvent[] {
  if (id !== 'blue-wildebeest') return [];
  return WILDEBEEST_EVENTS.flatMap((event) => {
    const month = months[event.month];
    if (month.lat == null || month.lng == null) return [];
    return [
      {
        day: month.day,
        lat: month.lat,
        lng: month.lng,
        kind: event.kind,
        label: event.label,
        text: event.text,
      },
    ];
  });
}

function placesFor(months: MonthPoint[]): Species['places'] {
  const seen = new Set<string>();
  const places: Species['places'] = [];
  months.forEach((month) => {
    if (!month.region || month.lat == null || month.lng == null) return;
    const key = month.region.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    places.push({ id: slug(month.region), name: month.region, lat: month.lat, lng: month.lng });
  });
  return places;
}

function toProvenance(id: string, sources: Map<string, PackSource>): Provenance {
  const source = sources.get(id);
  if (!source) throw new Error(`Missing source ${id}`);
  return {
    id,
    source: cite(source),
    licence: licenceText(source),
    url: source.url || (source.doi ? `https://doi.org/${source.doi}` : 'https://www.movebank.org'),
  };
}

function cite(source: PackSource): string {
  const authors = (source.authors ?? source.creators ?? []).slice(0, 4).join(', ');
  const year = source.year ? ` ${source.year}.` : '';
  const title = source.title ? ` ${source.title}` : '';
  const journal = source.journal ? ` ${source.journal}.` : '';
  const body = `${authors}${year}${title}.${journal}`.replace(/\s+/g, ' ').replaceAll('..', '.').trim();
  return body || source.id;
}

function licenceText(source: PackSource): string {
  if (source.id === 'doi-10-1073-pnas-0909493107') {
    return 'Cited paper, free to read. It is not under an open licence. The representative Arctic tern cites this paper. The tracked entry arctic-tern-obs uses the OBIS-SEAMAP geolocator medians (CC BY-NC 4.0). Raw geolocator rows are not in this repository.';
  }
  const code = shortLicence(source.licence);
  if (source.licence && code) {
    return `${source.licence} (${code}). Monthly medians derived from this public dataset. Raw tracks are not redistributed.`;
  }
  if (source.licence) return source.licence;
  if (source.type === 'encyclopedia') {
    return 'Wikipedia article, CC BY-SA 4.0. Used for names and seasonal context, not as a track.';
  }
  if (source.type === 'journal-article') {
    return 'Cited paper. This atlas does not reproduce the paper’s maps or data files.';
  }
  return 'Cited source.';
}

export function shortLicence(licence: string | undefined): string | null {
  if (!licence) return null;
  const text = licence.toLowerCase();
  if (text.includes('non commercial') || text.includes('non-commercial') || text.includes('by-nc')) return 'CC BY-NC 4.0';
  if (text.includes('cc0') || text.includes('zero') || text.includes('public domain')) return 'CC0';
  if (text.includes('attribution')) return 'CC BY 4.0';
  return null;
}

/** Pack flag, or a licence whose short form contains NC, such as CC BY-NC 4.0. */
export function sourceIsNonCommercial(source: { nonCommercial?: boolean; licence?: string } | undefined): boolean {
  if (!source) return false;
  if (source.nonCommercial === true) return true;
  const code = shortLicence(source.licence);
  return code != null && code.includes('NC');
}

function nonCommercialSourceIds(entry: PackSpecies, sourceIds: string[], sources: Map<string, PackSource>): string[] {
  const listed = (entry.nonCommercialSources ?? []).filter((id) => id.trim().length > 0);
  const triggered = sourceIds.filter((id) => {
    const source = sources.get(id);
    return source?.type === 'dataset' && sourceIsNonCommercial(source);
  });
  return unique([...listed, ...triggered]);
}

function strictLicence(ids: string[], sources: Map<string, PackSource>): string | null {
  let best: string | null = null;
  ids.forEach((id) => {
    const source = sources.get(id);
    if (source?.type !== 'dataset') return;
    const code = shortLicence(source.licence);
    if (code === 'CC BY-NC 4.0') best = code;
    else if (code === 'CC BY 4.0' && best !== 'CC BY-NC 4.0') best = code;
    else if (code === 'CC0' && !best) best = code;
  });
  return best;
}

function temperaturesOf(entry: PackSpecies): TagTemperature[] {
  const rows = entry.environment.temperature ?? [];
  return rows.map((row) => {
    const month = MONTH_NAMES.indexOf(row.month as (typeof MONTH_NAMES)[number]);
    if (month < 0) throw new Error(`${entry.id} temperature month ${row.month}`);
    return { month, medianC: row.medianC, n: row.n };
  });
}

function distanceOf(entry: PackSpecies): string {
  if (entry.id === 'blue-wildebeest') return '800–1,000 km for the circuit. The round changes from year to year.';
  if (entry.distanceStatus === 'computed' && entry.distance?.trim()) {
    const text = entry.distance.trim();
    return /minimum/i.test(text) ? text : `${text} (minimum)`;
  }
  if (entry.distance && entry.distance.trim()) return entry.distance;
  return 'Not computed from these positions.';
}

function monthlyValues(rows: PackMonthlyValue[] | null | undefined): (number | null)[] {
  const values: (number | null)[] = Array.from({ length: 12 }, () => null);
  (rows ?? []).forEach((row) => {
    const month = MONTH_NAMES.indexOf(row.month as (typeof MONTH_NAMES)[number]);
    if (month >= 0 && typeof row.value === 'number') values[month] = row.value;
  });
  return values;
}

function rangeOf(months: MonthPoint[], population: string): string {
  const regions = unique(months.map((month) => month.region).filter((region) => region.length > 0));
  if (regions.length === 0) return population;
  return regions.join(' · ');
}

function uncertaintyOf(entry: PackSpecies): string {
  const parts: string[] = [];
  if (entry.uncertainty) parts.push(entry.uncertainty);
  if (entry.evidence) parts.push(entry.evidence);
  if (entry.inference) parts.push(entry.inference);
  const observed = entry.monthlyPositions.some((month) => month.status === 'observed');
  const sightings = entry.monthlyPositions.some((month) => month.status === 'observed-sightings');
  const estimated = entry.monthlyPositions.some((month) => month.status === 'representative');
  const gaps = entry.monthlyPositions.some((month) => month.status === 'no-data' || month.lat == null);
  if (observed) parts.push('Observed months are pooled medians, not one animal.');
  if (sightings) parts.push('Observed-sightings months are citizen-science medians, not tagged animals.');
  if (estimated) parts.push('Estimated months are representative regions from the cited seasonal cycle, not tracking fixes.');
  if (gaps) parts.push('Months with no position are no-data gaps and are not interpolated across.');
  if (!observed && !sightings) parts.push('Every stored place is representative.');
  return parts.join(' ');
}

function bboxOf(points: { lat: number; lng: number }[]): Species['bbox'] {
  const lats = points.map((point) => point.lat);
  const south = Math.max(-85, Math.min(...lats) - 4);
  const north = Math.min(85, Math.max(...lats) + 4);
  const lngs = [...points.map((point) => point.lng)].sort((a, b) => a - b);
  let maxGap = lngs[0] + 360 - lngs[lngs.length - 1];
  let gapAt = 0;
  for (let index = 1; index < lngs.length; index += 1) {
    const gap = lngs[index] - lngs[index - 1];
    if (gap > maxGap) {
      maxGap = gap;
      gapAt = index;
    }
  }
  const span = lngs[lngs.length - 1] - lngs[0];
  if (span <= 180) {
    return [Math.max(-180, lngs[0] - 4), south, Math.min(180, lngs[lngs.length - 1] + 4), north];
  }
  const west = lngs[gapAt] - 4;
  const eastRaw = lngs[(gapAt - 1 + lngs.length) % lngs.length];
  const east = (eastRaw < lngs[gapAt] ? eastRaw + 360 : eastRaw) + 4;
  return [west, south, east, north];
}

function paletteColour(index: number): string {
  const hue = (index * 137.508) % 360;
  return hslToHex(hue, 58, 62);
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = light - c / 2;
  const channel = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
