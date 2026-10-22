import type { Fix, PointStatus, Track } from '../data/schema';
import { arcRadians, bearing, interpolateAlong } from '../geo';
import type { Waypoint } from '../types';
import { YEAR_LENGTH } from '../time/yearClock';

/** How a moving point is drawn. Estimated months are stored as `representative`. */
export type DrawMark = 'observed' | 'sightings' | 'estimated' | 'dispersed' | 'interpolated';

/** Which month-to-month style the sample sits on. Dispersed months stay with observed data. */
export type SegmentKind = 'observed' | 'sightings' | 'estimated' | 'dispersed';

export interface PositionSample {
  lat: number;
  lng: number;
  status: PointStatus;
  uncertaintyKm: number;
  trackId: string;
  bearing: number;
  mark: DrawMark;
  segment: SegmentKind;
  /** Generation wave, when the fix names one. */
  colour?: string;
  generation?: string;
}

/**
 * Phase 3 can replace a track provider with a simulation that returns
 * status "simulated". The globe only reads this interface.
 */
export interface PositionProvider {
  readonly id: string;
  positionAt(day: number): PositionSample | null;
}

interface Segment {
  start: Fix;
  end: Fix;
  duration: number;
  path: Waypoint[];
  /** Great-circle length, radians, computed once when the track loads. */
  arc: number;
  wraps: boolean;
}

export function createTrackProvider(track: Track): PositionProvider {
  const segments = prepare(track.fixes, track.loop);
  return {
    id: track.id,
    positionAt(day: number) {
      return positionOnSegments(segments, day, track.id);
    },
  };
}

/** Test helper. Arc lengths are computed once per call. */
export function positionAt(fixes: Fix[], day: number, loop: boolean, trackId = 'track'): PositionSample | null {
  return positionOnSegments(prepare(fixes, loop), day, trackId);
}

function prepare(fixes: Fix[], loop: boolean): Segment[] {
  const ordered = [...fixes].sort((a, b) => a.t - b.t);
  const segments: Segment[] = [];
  const build = (start: Fix, end: Fix, duration: number, via: Waypoint[] | undefined, wraps: boolean) => {
    const path = [{ lat: start.lat, lng: start.lng }, ...(via ?? []), { lat: end.lat, lng: end.lng }];
    segments.push({
      start,
      end,
      duration,
      path,
      arc: pathArc(path),
      wraps,
    });
  };
  if (ordered.length === 1) {
    const only = ordered[0];
    const startT = Math.max(0, only.t - 15);
    const end = { ...only, t: Math.max(startT + 1, Math.min(364, only.t + 15)) };
    const start = { ...only, t: startT };
    build(start, end, end.t - start.t, undefined, false);
    return segments;
  }
  for (let index = 0; index < ordered.length - 1; index += 1) {
    const start = ordered[index];
    const end = ordered[index + 1];
    build(start, end, end.t - start.t, end.via, false);
  }
  if (loop && ordered.length > 1) {
    const start = ordered[ordered.length - 1];
    const end = ordered[0];
    build(start, end, end.t + YEAR_LENGTH - start.t, end.via, true);
  }
  return segments;
}

function pathArc(path: Waypoint[]): number {
  let arc = 0;
  for (let index = 0; index < path.length - 1; index += 1) {
    arc += arcRadians(path[index], path[index + 1]);
  }
  return arc;
}

function positionOnSegments(segments: Segment[], day: number, trackId: string): PositionSample | null {
  const segment = segments.find((item) => contains(item, day));
  if (!segment) return null;
  if (segment.duration <= 0) return fromFix(segment.start, trackId, 0);
  if (segment.arc <= 1e-8) return fromFix(segment.start, trackId, 0);
  const elapsed = segment.wraps && day < segment.start.t ? day + YEAR_LENGTH - segment.start.t : day - segment.start.t;
  if (elapsed <= 1e-6) return fromFix(segment.start, trackId, heading(segment, 0));
  if (segment.duration - elapsed <= 1e-6) return fromFix(segment.end, trackId, heading(segment, 1));
  const fraction = elapsed / segment.duration;
  const point = interpolateAlong(segment.path, fraction);
  const uncertainty =
    segment.start.uncertaintyKm + (segment.end.uncertaintyKm - segment.start.uncertaintyKm) * fraction;
  return {
    lat: point.lat,
    lng: point.lng,
    status: 'interpolated',
    uncertaintyKm: uncertainty,
    trackId,
    bearing: heading(segment, fraction),
    mark: 'interpolated',
    segment: segmentKind(segment.start, segment.end),
    colour: segment.start.colour,
    generation: segment.start.generation,
  };
}

function contains(segment: Segment, day: number): boolean {
  if (!segment.wraps) return day >= segment.start.t && day <= segment.end.t;
  return day >= segment.start.t || day <= segment.end.t;
}

function fromFix(fix: Fix, trackId: string, direction: number): PositionSample {
  const mark = markOf(fix);
  return {
    lat: fix.lat,
    lng: fix.lng,
    status: fix.status,
    uncertaintyKm: fix.uncertaintyKm,
    trackId,
    bearing: direction,
    mark,
    segment: segmentOfMark(mark),
    colour: fix.colour,
    generation: fix.generation,
  };
}

export function markOf(fix: Fix): DrawMark {
  if (fix.dispersed) return 'dispersed';
  if (fix.sightings) return 'sightings';
  if (fix.status === 'observed') return 'observed';
  return 'estimated';
}

export function segmentKind(start: Fix, end: Fix): SegmentKind {
  if (start.dispersed || end.dispersed) return 'dispersed';
  if (start.sightings || end.sightings) return 'sightings';
  if (start.status === 'observed' && end.status === 'observed') return 'observed';
  return 'estimated';
}

function segmentOfMark(mark: DrawMark): SegmentKind {
  if (mark === 'estimated') return 'estimated';
  if (mark === 'dispersed') return 'dispersed';
  if (mark === 'sightings') return 'sightings';
  return 'observed';
}

export type StatusFilter = 'all' | 'observed' | 'estimated';

/** Observed includes dispersed medians. Estimated is the representative months. */
export function sampleVisible(sample: PositionSample, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'observed') return sample.segment !== 'estimated';
  return sample.segment === 'estimated';
}

function heading(segment: Segment, fraction: number): number {
  const clamped = Math.min(1, Math.max(0, fraction));
  const point = interpolateAlong(segment.path, clamped);
  if (clamped >= 0.98) {
    const behind = interpolateAlong(segment.path, Math.max(0, clamped - 0.02));
    return bearing(behind, point);
  }
  const ahead = interpolateAlong(segment.path, Math.min(1, clamped + 0.02));
  return bearing(point, ahead);
}
