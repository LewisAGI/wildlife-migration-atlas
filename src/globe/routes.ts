import type { Feature, LineString } from 'geojson';
import type { Fix, Species, Track } from '../data/schema';
import { pathCoordinates } from '../geo';
import { segmentKind, type StatusFilter } from '../motion/interpolate';
import type { Waypoint } from '../types';

export interface RoutePoint {
  lng: number;
  lat: number;
}

/** 0 solid observed, 1 dashed estimated, 2 dotted dispersed, 3 dash-dot sightings. */
export function segmentStroke(start: Fix, end: Fix): 0 | 1 | 2 | 3 {
  const kind = segmentKind(start, end);
  if (kind === 'dispersed') return 2;
  if (kind === 'sightings') return 3;
  if (kind === 'observed') return 0;
  return 1;
}

export function strokeVisible(stroke: 0 | 1 | 2 | 3, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'observed') return stroke !== 1;
  return stroke === 1;
}

/** Ordered waypoints, including the return to the first fix when the track loops. */
export function trackWaypoints(track: Track): Waypoint[] {
  const ordered = [...track.fixes].sort((a, b) => a.t - b.t);
  const points: Waypoint[] = [];
  const push = (point: Waypoint) => {
    const last = points[points.length - 1];
    if (last && last.lat === point.lat && last.lng === point.lng) return;
    points.push({ lat: point.lat, lng: point.lng });
  };
  ordered.forEach((fix, index) => {
    if (index > 0) (fix.via ?? []).forEach(push);
    push(fix);
  });
  if (track.loop && ordered.length > 1) {
    (ordered[0].via ?? []).forEach(push);
    push(ordered[0]);
  }
  return points;
}

export function routeFeatures(species: Species, filter: StatusFilter = 'all'): Feature<LineString>[] {
  const features: Feature<LineString>[] = [];
  species.tracks.forEach((track) => {
    const ordered = [...track.fixes].sort((a, b) => a.t - b.t);
    const pairs: [Fix, Fix][] = [];
    for (let index = 0; index < ordered.length - 1; index += 1) pairs.push([ordered[index], ordered[index + 1]]);
    if (track.loop && ordered.length > 1) pairs.push([ordered[ordered.length - 1], ordered[0]]);
    pairs.forEach(([start, end]) => {
      const stroke = segmentStroke(start, end);
      if (!strokeVisible(stroke, filter)) return;
      const path = [{ lat: start.lat, lng: start.lng }, ...(end.via ?? []), { lat: end.lat, lng: end.lng }];
      pathCoordinates(path).forEach((coordinates) => {
        features.push({
          type: 'Feature',
          properties: {
            role: 'line',
            speciesId: species.id,
            trackId: track.id,
            colour: start.colour ?? species.colour,
            stroke,
          },
          geometry: { type: 'LineString', coordinates },
        });
      });
    });
  });
  return features;
}

export function routeSample(species: Species): RoutePoint | null {
  const track = species.tracks[0];
  if (!track) return null;
  const line = trackWaypoints(track);
  const point = line[Math.floor(line.length / 2)] ?? line[0];
  if (!point) return null;
  return { lng: point.lng, lat: point.lat };
}
