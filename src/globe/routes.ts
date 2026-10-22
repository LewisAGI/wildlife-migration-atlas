import type { Feature, LineString } from 'geojson';
import type { Species, Track } from '../data/schema';
import { pathCoordinates } from '../geo';
import type { Waypoint } from '../types';

export interface RoutePoint {
  lng: number;
  lat: number;
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

export function routeFeatures(species: Species): Feature<LineString>[] {
  const features: Feature<LineString>[] = [];
  species.tracks.forEach((track) => {
    const dashed = track.fixes.some((fix) => fix.status !== 'observed') ? 1 : 0;
    pathCoordinates(trackWaypoints(track)).forEach((coordinates) => {
      features.push({
        type: 'Feature',
        properties: {
          role: 'line',
          speciesId: species.id,
          trackId: track.id,
          colour: species.colour,
          dashed,
        },
        geometry: { type: 'LineString', coordinates },
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
