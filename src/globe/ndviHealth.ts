export interface NdviHealth {
  loaded: number;
  degraded: boolean;
}

/** A decoded NDVI texture. Clears the degraded flag. */
export function noteNdviSuccess(health: NdviHealth): NdviHealth {
  return { loaded: health.loaded + 1, degraded: false };
}

/**
 * MapLibre does not emit a source error for HTTP 404; it tries the parent tile.
 * When nothing has decoded, a 404 still means the overlay has no tiles.
 * Status 0 is a CORS failure and is reported on the map error event instead.
 */
export function noteNdviFailure(health: NdviHealth, status: number | undefined): NdviHealth {
  if (status === 404 && health.loaded === 0) return { loaded: 0, degraded: true };
  return health;
}

export function ndviErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error == null || !('status' in error)) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}
