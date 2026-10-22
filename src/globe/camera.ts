import type { Map as MapLibreMap } from 'maplibre-gl';

export type BBox = [number, number, number, number];

export function unionBBox(a: BBox, b: BBox): BBox {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}

/**
 * One ease onto a species bbox. Padding keeps the time bar, the title, and an
 * open sheet out of the framed globe — the same inset idea as the history map.
 */
export function flyToBBox(map: MapLibreMap, bbox: BBox): void {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const padding = framePadding();
  const antimeridian = maxLng > 180 || minLng < -180;
  if (antimeridian) {
    const centerLng = ((((minLng + maxLng) / 2 + 540) % 360) + 360) % 360 - 180;
    map.easeTo({
      center: [centerLng, clampLat((minLat + maxLat) / 2)],
      zoom: zoomForSpan(map, maxLng - minLng, maxLat - minLat, padding),
      padding,
      duration: 800,
    });
    return;
  }
  const camera = map.cameraForBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    { padding, absolutePadding: true, maxZoom: 5.2 },
  );
  if (camera?.center && camera.zoom != null) {
    map.easeTo({
      center: camera.center,
      zoom: Math.max(map.getMinZoom(), camera.zoom - 0.12),
      padding,
      duration: 800,
    });
    return;
  }
  map.easeTo({
    center: [wrapLng((minLng + maxLng) / 2), clampLat((minLat + maxLat) / 2)],
    zoom: Math.max(map.getMinZoom(), 1.6),
    padding,
    duration: 800,
  });
}

export function framePadding(): { top: number; bottom: number; left: number; right: number } {
  const zoom = visible('.zoom');
  const timeEl = document.querySelector('.time');
  const time = timeEl?.classList.contains('is-covered') ? null : visible('.time');
  const wordmark = visible('.wordmark');
  const sheet = visible('.event-sheet');
  const top = Math.max(56, (wordmark ? wordmark.bottom : 40) + 16);
  const right = (zoom?.width ?? 44) + 28;
  if (sheet && sheet.width > 40 && sheet.right < window.innerWidth * 0.7) {
    return {
      top,
      left: sheet.right + 16,
      right,
      bottom: time ? Math.max(24, window.innerHeight - time.top + 16) : 120,
    };
  }
  if (sheet && sheet.width > 40) {
    return {
      top,
      left: 36,
      right,
      bottom: Math.max(24, window.innerHeight - sheet.top + 16),
    };
  }
  return {
    top,
    left: 36,
    right,
    bottom: time ? Math.max(120, window.innerHeight - time.top + 20) : 140,
  };
}

function zoomForSpan(
  map: MapLibreMap,
  lngSpan: number,
  latSpan: number,
  padding: { top: number; bottom: number; left: number; right: number },
): number {
  const width = Math.max(64, map.getContainer().clientWidth - padding.left - padding.right);
  const height = Math.max(64, map.getContainer().clientHeight - padding.top - padding.bottom);
  const world = 512;
  const zoomLng = Math.log2((width * 360) / (Math.max(lngSpan, 1) * world));
  const zoomLat = Math.log2((height * 160) / (Math.max(latSpan, 1) * world));
  return Math.max(map.getMinZoom(), Math.min(5.2, zoomLng, zoomLat));
}

function visible(selector: string): DOMRect | null {
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  return rect;
}

function clampLat(lat: number): number {
  return Math.max(-70, Math.min(70, lat));
}

function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}
