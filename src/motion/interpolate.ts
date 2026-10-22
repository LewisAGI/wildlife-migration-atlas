import type { Fix, PointStatus, Track } from '../data/schema';
import { arcRadians, bearing, interpolateAlong } from '../geo';
import type { Waypoint } from '../types';
import { YEAR_LENGTH } from '../time/yearClock';

export interface PositionSample {
  lat: number;
  lng: number;
  status: PointStatus;
  uncertaintyKm: number;
  trackId: string;
  bearing: number;
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
  if (!segment || segment.duration <= 0) return null;
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
  };
}

function contains(segment: Segment, day: number): boolean {
  if (!segment.wraps) return day >= segment.start.t && day <= segment.end.t;
  return day >= segment.start.t || day <= segment.end.t;
}

function fromFix(fix: Fix, trackId: string, direction: number): PositionSample {
  return {
    lat: fix.lat,
    lng: fix.lng,
    status: fix.status,
    uncertaintyKm: fix.uncertaintyKm,
    trackId,
    bearing: direction,
  };
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
