import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import type { Species } from '../data/schema';
import { pathCoordinates } from '../geo';
import type { PositionProvider, PositionSample, StatusFilter } from '../motion/interpolate';
import type { Waypoint } from '../types';
import { wrapDay } from '../time/yearClock';
import { routeFeatures } from './routes';

export interface FramePosition extends PositionSample {
  speciesId: string;
  colour: string;
}

const TRAIL_DAYS = 18;

export function frameCollection(
  species: Species[],
  positions: FramePosition[],
  providers: Map<string, PositionProvider>,
  day: number,
  filter: StatusFilter = 'all',
): FeatureCollection {
  const features: Feature[] = [];
  species.forEach((item) => {
    features.push(...routeFeatures(item, filter));
    item.tracks.forEach((track) => {
      const provider = providers.get(`${item.id}:${track.id}`);
      if (!provider) return;
      trailParts(provider, day, track.loop).forEach((part) => {
        pathCoordinates(part).forEach((coordinates) => {
          features.push({
            type: 'Feature',
            properties: { role: 'trail', speciesId: item.id, trackId: track.id, colour: item.colour },
            geometry: { type: 'LineString', coordinates } satisfies LineString,
          });
        });
      });
    });
  });
  positions.forEach((position) => {
    features.push(pointFeature(position, 'marker'));
    features.push(pointFeature(position, 'head'));
  });
  return { type: 'FeatureCollection', features };
}

function pointFeature(position: FramePosition, role: 'marker' | 'head'): Feature<Point> {
  return {
    type: 'Feature',
    properties: {
      role,
      speciesId: position.speciesId,
      trackId: position.trackId,
      colour: position.colour,
      status: position.status,
      mark: position.mark,
      uncertaintyKm: position.uncertaintyKm,
      bearing: position.bearing,
      arrow: `arrow-${position.speciesId}`,
    },
    geometry: { type: 'Point', coordinates: [position.lng, position.lat] },
  };
}

function trailParts(provider: PositionProvider, day: number, loop: boolean): Waypoint[][] {
  const parts: Waypoint[][] = [];
  let current: Waypoint[] = [];
  for (let ago = TRAIL_DAYS; ago >= 0; ago -= 1) {
    const sampleDay = loop ? wrapDay(day - ago) : day - ago;
    const sample = sampleDay < 0 ? null : provider.positionAt(sampleDay);
    if (!sample) {
      if (current.length > 1) parts.push(current);
      current = [];
      continue;
    }
    current.push({ lat: sample.lat, lng: sample.lng });
  }
  if (current.length > 1) parts.push(current);
  return parts;
}
