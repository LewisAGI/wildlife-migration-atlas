import { arcRadians } from '../geo';
import type { Waypoint } from '../types';

/** Reserved for a future simulation. Nothing emits this in Phase 1. */
export const POINT_STATUSES = ['observed', 'representative', 'interpolated', 'simulated'] as const;
export type PointStatus = (typeof POINT_STATUSES)[number];

/** `representative` is the stored status for an estimated month. `no-data` has no coordinates. */
export const MONTH_STATUSES = ['observed', 'representative', 'no-data'] as const;
export type MonthStatus = (typeof MONTH_STATUSES)[number];

export const MIGRATION_TYPES = ['loop', 'oneWay', 'multigenerational', 'multiRoute', 'partial', 'local', 'nomadic'] as const;
export type MigrationType = (typeof MIGRATION_TYPES)[number];

/** Great-circle hops longer than this make `slerp` unstable near the antipode. */
export const MAX_LEG_DEGREES = 170;
const MAX_LEG_RADIANS = (MAX_LEG_DEGREES * Math.PI) / 180;

export interface Provenance {
  id: string;
  source: string;
  licence: string;
  url: string;
}

export interface Fix extends Waypoint {
  /** Day of year, 0 = 1 January, in [0, 365). */
  t: number;
  status: PointStatus;
  uncertaintyKm: number;
  /** Provenance id. Every point names its source. */
  source: string;
  /** Coast-following points from the previous fix to this one. Not timed. */
  via?: Waypoint[];
  /** Median falls between groups. The halo is the interquartile spread. */
  dispersed?: boolean;
  /** Generation wave colour. Falls back to the species colour. */
  colour?: string;
  generation?: string;
}

export interface MonthPoint {
  /** 0 = January. */
  month: number;
  name: string;
  /** Day of year the month is drawn on. */
  day: number;
  status: MonthStatus;
  lat: number | null;
  lng: number | null;
  region: string;
  dispersed: boolean;
  nFixes: number | null;
  nIndividuals: number | null;
  uncertaintyKm: number | null;
  method: string;
  note: string;
  source: string;
}

export interface TagTemperature {
  month: number;
  medianC: number;
  n: number;
}

export interface Track {
  id: string;
  branch?: string;
  generation?: string;
  /** False for a one-way or single-generation leg that should vanish outside its dates. */
  loop: boolean;
  fixes: Fix[];
}

export interface SpeciesEvent extends Waypoint {
  day: number;
  kind: string;
  label: string;
  text: string;
}

export interface Place extends Waypoint {
  id: string;
  name: string;
}

export interface Species {
  id: string;
  names: { common: string; scientific: string };
  population: string;
  colour: string;
  migrationType: MigrationType;
  /** [west, south, east, north] */
  bbox: [number, number, number, number];
  range: string;
  distance: string;
  timing: string;
  summary: string;
  uncertaintyNote: string;
  /** Compact name for icon labels. */
  shortName: string;
  months: MonthPoint[];
  iucn: string | null;
  threats: string | null;
  /** Tag or near-body sensor, not air or water temperature. */
  temperature: TagTemperature[];
  temperatureNote: string;
  /** Set only when a paper cites an annual distance we can scale by the day. */
  citedKm: number | null;
  /** Short dataset licence, for example `CC BY-NC 4.0`. */
  datasetLicence: string | null;
  evidence: string;
  tracks: Track[];
  events: SpeciesEvent[];
  places: Place[];
  provenance: Provenance[];
}

export interface SpeciesIndexEntry {
  id: string;
  names: { common: string; scientific: string };
  colour: string;
  bbox: [number, number, number, number];
}

export interface SpeciesIndex {
  species: SpeciesIndexEntry[];
}

export function parseSpecies(value: unknown): Species {
  const errors = speciesErrors(value);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  return value as Species;
}

export function parseIndex(value: unknown): SpeciesIndex {
  const errors = indexErrors(value);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  return value as SpeciesIndex;
}

function speciesErrors(value: unknown): string[] {
  const errors: string[] = [];
  const record = asRecord(value, 'species', errors);
  if (!record) return errors;
  const id = needString(record, 'id', errors);
  needNames(record, errors);
  needString(record, 'population', errors);
  const colour = needString(record, 'colour', errors);
  if (colour && !/^#[0-9a-fA-F]{6}$/.test(colour)) errors.push('colour must be a #rrggbb hex');
  const migrationType = needString(record, 'migrationType', errors);
  if (migrationType && !MIGRATION_TYPES.includes(migrationType as MigrationType)) {
    errors.push(`migrationType must be one of ${MIGRATION_TYPES.join(', ')}`);
  }
  needBBox(record, errors);
  needString(record, 'range', errors);
  needString(record, 'distance', errors);
  needString(record, 'timing', errors);
  needString(record, 'summary', errors);
  needString(record, 'uncertaintyNote', errors);
  needString(record, 'shortName', errors);
  needString(record, 'evidence', errors);
  needString(record, 'temperatureNote', errors);
  const iucn = record.iucn;
  if (iucn != null && (typeof iucn !== 'string' || iucn.trim() === '')) errors.push('species.iucn must be a string or null');
  const threats = record.threats;
  if (threats != null && typeof threats !== 'string') errors.push('species.threats must be a string or null');
  const cited = record.citedKm;
  if (cited != null && (typeof cited !== 'number' || !Number.isFinite(cited) || cited < 0)) {
    errors.push('species.citedKm must be a non-negative number or null');
  }
  const datasetLicence = record.datasetLicence;
  if (datasetLicence != null && typeof datasetLicence !== 'string') errors.push('species.datasetLicence must be a string or null');
  const provenance = needArray(record, 'provenance', errors);
  const provenanceIds = new Set<string>();
  provenance?.forEach((item, index) => {
    const entry = asRecord(item, `provenance[${index}]`, errors);
    if (!entry) return;
    const provenanceId = needString(entry, 'id', errors, `provenance[${index}]`);
    if (provenanceId) provenanceIds.add(provenanceId);
    needString(entry, 'source', errors, `provenance[${index}]`);
    needString(entry, 'licence', errors, `provenance[${index}]`);
    needString(entry, 'url', errors, `provenance[${index}]`);
  });
  const tracks = needArray(record, 'tracks', errors);
  if (tracks && tracks.length === 0) errors.push('tracks must not be empty');
  tracks?.forEach((item, index) => trackErrors(item, index, provenanceIds, errors));
  needArray(record, 'events', errors)?.forEach((item, index) => eventErrors(item, index, errors));
  needArray(record, 'places', errors)?.forEach((item, index) => placeErrors(item, index, errors));
  monthListErrors(record, provenanceIds, errors);
  temperatureErrors(record, errors);
  if (id && record.id !== id) errors.push('id mismatch');
  return errors;
}

function trackErrors(value: unknown, index: number, provenanceIds: Set<string>, errors: string[]): void {
  const prefix = `tracks[${index}]`;
  const record = asRecord(value, prefix, errors);
  if (!record) return;
  needString(record, 'id', errors, prefix);
  if ('branch' in record && record.branch != null) needString(record, 'branch', errors, prefix);
  if ('generation' in record && record.generation != null) needString(record, 'generation', errors, prefix);
  if (typeof record.loop !== 'boolean') errors.push(`${prefix}.loop must be boolean`);
  const fixes = needArray(record, 'fixes', errors, prefix);
  if (fixes && fixes.length < 1) errors.push(`${prefix}.fixes need at least one point`);
  let previous = -1;
  fixes?.forEach((item, fixIndex) => {
    const fixPrefix = `${prefix}.fixes[${fixIndex}]`;
    const fix = asRecord(item, fixPrefix, errors);
    if (!fix) return;
    const t = needNumber(fix, 't', errors, fixPrefix);
    if (t != null && (t < 0 || t >= 365)) errors.push(`${fixPrefix}.t must be in [0, 365)`);
    if (t != null && t <= previous) errors.push(`${fixPrefix}.t must increase`);
    if (t != null) previous = t;
    needLatLng(fix, fixPrefix, errors);
    const status = needString(fix, 'status', errors, fixPrefix);
    if (status && !POINT_STATUSES.includes(status as PointStatus)) {
      errors.push(`${fixPrefix}.status must be one of ${POINT_STATUSES.join(', ')}`);
    }
    const uncertainty = needNumber(fix, 'uncertaintyKm', errors, fixPrefix);
    if (uncertainty != null && uncertainty < 0) errors.push(`${fixPrefix}.uncertaintyKm must be >= 0`);
    const source = needString(fix, 'source', errors, fixPrefix);
    if (source && provenanceIds.size > 0 && !provenanceIds.has(source)) {
      errors.push(`${fixPrefix}.source "${source}" is not in provenance`);
    }
    if ('dispersed' in fix && fix.dispersed != null && typeof fix.dispersed !== 'boolean') {
      errors.push(`${fixPrefix}.dispersed must be boolean`);
    }
    if ('colour' in fix && fix.colour != null) {
      const colour = needString(fix, 'colour', errors, fixPrefix);
      if (colour && !/^#[0-9a-fA-F]{6}$/.test(colour)) errors.push(`${fixPrefix}.colour must be a #rrggbb hex`);
    }
    if ('generation' in fix && fix.generation != null) needString(fix, 'generation', errors, fixPrefix);
    if ('via' in fix && fix.via != null) {
      const via = needArray(fix, 'via', errors, fixPrefix);
      via?.forEach((point, viaIndex) => {
        const viaRecord = asRecord(point, `${fixPrefix}.via[${viaIndex}]`, errors);
        if (viaRecord) needLatLng(viaRecord, `${fixPrefix}.via[${viaIndex}]`, errors);
      });
    }
  });
  const blocked = errors.some((error) => error.startsWith(`${prefix}.`) || error.startsWith(`${prefix} `));
  if (fixes && fixes.length > 0 && !blocked) longLegErrors(fixes, record.loop === true, prefix, errors);
}

function monthListErrors(record: Record<string, unknown>, provenanceIds: Set<string>, errors: string[]): void {
  const months = needArray(record, 'months', errors);
  if (!months) return;
  if (months.length !== 12) errors.push('species.months must list 12 months');
  const seen = new Set<number>();
  months.forEach((item, index) => {
    const prefix = `months[${index}]`;
    const month = asRecord(item, prefix, errors);
    if (!month) return;
    const monthIndex = needNumber(month, 'month', errors, prefix);
    if (monthIndex != null && (monthIndex !== index || monthIndex < 0 || monthIndex > 11)) {
      errors.push(`${prefix}.month must be ${index}`);
    }
    if (monthIndex != null && seen.has(monthIndex)) errors.push(`${prefix}.month is duplicated`);
    if (monthIndex != null) seen.add(monthIndex);
    needString(month, 'name', errors, prefix);
    const day = needNumber(month, 'day', errors, prefix);
    if (day != null && (day < 0 || day >= 365)) errors.push(`${prefix}.day must be in [0, 365)`);
    const status = needString(month, 'status', errors, prefix);
    if (status && !MONTH_STATUSES.includes(status as MonthStatus)) {
      errors.push(`${prefix}.status must be one of ${MONTH_STATUSES.join(', ')}`);
    }
    const lat = month.lat;
    const lng = month.lng;
    const missing = lat == null && lng == null;
    if (missing && status === 'observed') errors.push(`${prefix} observed months need coordinates`);
    if (!missing) {
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        errors.push(`${prefix} lat and lng must both be numbers or both be null`);
      } else {
        needLatLng(month as Record<string, unknown>, prefix, errors);
      }
    }
    if (status === 'no-data' && !missing) errors.push(`${prefix} no-data months have no coordinates`);
    if (typeof month.dispersed !== 'boolean') errors.push(`${prefix}.dispersed must be boolean`);
    if (month.region != null && typeof month.region !== 'string') errors.push(`${prefix}.region must be a string`);
    optionalCount(month, 'nFixes', prefix, errors);
    optionalCount(month, 'nIndividuals', prefix, errors);
    optionalCount(month, 'uncertaintyKm', prefix, errors);
    needString(month, 'method', errors, prefix);
    if (month.note != null && typeof month.note !== 'string') errors.push(`${prefix}.note must be a string`);
    const source = needString(month, 'source', errors, prefix);
    if (source && provenanceIds.size > 0 && !provenanceIds.has(source)) {
      errors.push(`${prefix}.source "${source}" is not in provenance`);
    }
  });
}

function temperatureErrors(record: Record<string, unknown>, errors: string[]): void {
  const temperature = record.temperature;
  if (!Array.isArray(temperature)) {
    errors.push('species.temperature must be an array');
    return;
  }
  temperature.forEach((item, index) => {
    const prefix = `temperature[${index}]`;
    const entry = asRecord(item, prefix, errors);
    if (!entry) return;
    const month = needNumber(entry, 'month', errors, prefix);
    if (month != null && (month < 0 || month > 11)) errors.push(`${prefix}.month must be in 0..11`);
    needNumber(entry, 'medianC', errors, prefix);
    const n = needNumber(entry, 'n', errors, prefix);
    if (n != null && n < 0) errors.push(`${prefix}.n must be >= 0`);
  });
}

function optionalCount(record: Record<string, unknown>, key: string, prefix: string, errors: string[]): void {
  if (!(key in record) || record[key] == null) return;
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    errors.push(`${prefix}.${key} must be a non-negative number or null`);
  }
}

function longLegErrors(fixes: unknown[], loop: boolean, prefix: string, errors: string[]): void {
  const points = fixes.map((item) => {
    const fix = item as Record<string, unknown>;
    const via = Array.isArray(fix.via) ? (fix.via as Waypoint[]) : [];
    return { lat: fix.lat as number, lng: fix.lng as number, via };
  });
  const hop = (from: Waypoint, to: Waypoint, label: string) => {
    if (arcRadians(from, to) > MAX_LEG_RADIANS) errors.push(`${label} is longer than ${MAX_LEG_DEGREES}°`);
  };
  for (let index = 0; index < points.length - 1; index += 1) {
    const path = [points[index], ...points[index + 1].via, points[index + 1]];
    for (let step = 0; step < path.length - 1; step += 1) {
      hop(path[step], path[step + 1], `${prefix}.fixes[${index}]`);
    }
  }
  if (loop && points.length > 1) {
    const path = [points[points.length - 1], ...points[0].via, points[0]];
    for (let step = 0; step < path.length - 1; step += 1) {
      hop(path[step], path[step + 1], `${prefix} wrap`);
    }
  }
}

function eventErrors(value: unknown, index: number, errors: string[]): void {
  const prefix = `events[${index}]`;
  const record = asRecord(value, prefix, errors);
  if (!record) return;
  const day = needNumber(record, 'day', errors, prefix);
  if (day != null && (day < 0 || day >= 365)) errors.push(`${prefix}.day must be in [0, 365)`);
  needLatLng(record, prefix, errors);
  needString(record, 'kind', errors, prefix);
  needString(record, 'label', errors, prefix);
  needString(record, 'text', errors, prefix);
}

function placeErrors(value: unknown, index: number, errors: string[]): void {
  const prefix = `places[${index}]`;
  const record = asRecord(value, prefix, errors);
  if (!record) return;
  needString(record, 'id', errors, prefix);
  needString(record, 'name', errors, prefix);
  needLatLng(record, prefix, errors);
}

function indexErrors(value: unknown): string[] {
  const errors: string[] = [];
  const record = asRecord(value, 'index', errors);
  if (!record) return errors;
  const species = needArray(record, 'species', errors);
  const ids = new Set<string>();
  species?.forEach((item, index) => {
    const prefix = `species[${index}]`;
    const entry = asRecord(item, prefix, errors);
    if (!entry) return;
    const id = needString(entry, 'id', errors, prefix);
    if (id && ids.has(id)) errors.push(`${prefix}.id is duplicated`);
    if (id) ids.add(id);
    needNames(entry, errors, prefix);
    const colour = needString(entry, 'colour', errors, prefix);
    if (colour && !/^#[0-9a-fA-F]{6}$/.test(colour)) errors.push(`${prefix}.colour must be a #rrggbb hex`);
    needBBox(entry, errors, prefix);
  });
  return errors;
}

function needNames(record: Record<string, unknown>, errors: string[], prefix = 'species'): void {
  const names = asRecord(record.names, `${prefix}.names`, errors);
  if (!names) return;
  needString(names, 'common', errors, `${prefix}.names`);
  needString(names, 'scientific', errors, `${prefix}.names`);
}

function needBBox(record: Record<string, unknown>, errors: string[], prefix = 'species'): void {
  const bbox = record.bbox;
  if (!Array.isArray(bbox) || bbox.length !== 4 || bbox.some((item) => typeof item !== 'number' || !Number.isFinite(item))) {
    errors.push(`${prefix}.bbox must be [west, south, east, north]`);
    return;
  }
  const [west, south, east, north] = bbox as number[];
  if (south < -90 || north > 90 || south > north) errors.push(`${prefix}.bbox latitudes are invalid`);
  // East may pass 180 when the route crosses the antimeridian and the box is unwrapped.
  if (west < -180 || east > 540 || east < west) errors.push(`${prefix}.bbox longitudes are invalid`);
}

function needLatLng(record: Record<string, unknown>, prefix: string, errors: string[]): void {
  const lat = needNumber(record, 'lat', errors, prefix);
  const lng = needNumber(record, 'lng', errors, prefix);
  if (lat != null && (lat < -90 || lat > 90)) errors.push(`${prefix}.lat is outside -90..90`);
  if (lng != null && (lng < -180 || lng > 180)) errors.push(`${prefix}.lng is outside -180..180`);
}

function asRecord(value: unknown, label: string, errors: string[]): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    errors.push(`${label} must be an object`);
    return null;
  }
  return value as Record<string, unknown>;
}

function needArray(
  record: Record<string, unknown>,
  key: string,
  errors: string[],
  prefix = 'species',
): unknown[] | null {
  const value = record[key];
  if (!Array.isArray(value)) {
    errors.push(`${prefix}.${key} must be an array`);
    return null;
  }
  return value;
}

function needString(
  record: Record<string, unknown>,
  key: string,
  errors: string[],
  prefix = 'species',
): string | null {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${prefix}.${key} must be a non-empty string`);
    return null;
  }
  return value;
}

function needNumber(
  record: Record<string, unknown>,
  key: string,
  errors: string[],
  prefix = 'species',
): number | null {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${prefix}.${key} must be a finite number`);
    return null;
  }
  return value;
}
