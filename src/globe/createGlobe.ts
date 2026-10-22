import {
  GeoJSONSource,
  Map as MapLibreMap,
  setWorkerUrl,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { Species } from '../data/schema';
import type { PositionProvider, StatusFilter } from '../motion/interpolate';
import { flyToBBox, type BBox } from './camera';
import { createOverlays, type PickHit } from './labels';
import { frameCollection, type FramePosition } from './markers';
import { routeSample } from './routes';
import { mapStyle } from './style';

// Vite does not emit MapLibre's worker unless the URL is set. Without it the
// production build 404s and neither land nor route lines draw.
setWorkerUrl(workerUrl);

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

export interface GlobeController {
  map: MapLibreMap;
  ready: Promise<void>;
  setSpecies(species: Species[], providers: Map<string, PositionProvider>): void;
  setFrame(positions: FramePosition[], day: number): void;
  setSelected(speciesId: string): void;
  setFilter(filter: StatusFilter): void;
  setOverlay(month: number | null): void;
  setNotice(parts: string[]): void;
  setThreats(on: boolean): void;
  flyTo(bbox: BBox): void;
  zoomIn(): void;
  zoomOut(): void;
  routePoint(speciesId: string): { lng: number; lat: number } | null;
  onPick(handler: (hit: PickHit | null) => void): void;
  onOverlayTile(listener: (degraded: boolean) => void): void;
  destroy(): void;
}

export function createGlobe(container: HTMLElement, root: HTMLElement): GlobeController {
  const map = new MapLibreMap({
    container,
    style: mapStyle(),
    center: [16, 6],
    zoom: container.clientWidth < 700 ? 0.85 : 1.35,
    minZoom: 0.6,
    maxZoom: 8,
    maxPitch: 0,
    pitchWithRotate: false,
    dragRotate: true,
    touchPitch: false,
    attributionControl: { compact: true, customAttribution: 'NASA Blue Marble · Natural Earth' },
    maplibreLogo: false,
    fadeDuration: 0,
  });

  let landRepainted = false;
  map.on('sourcedata', (event) => {
    if (landRepainted || event.sourceId !== 'land' || !event.isSourceLoaded) return;
    landRepainted = true;
    map.triggerRepaint();
    root.dataset.landRepaint = '1';
  });
  let overlayDegraded = false;
  let overlayTileListener: (degraded: boolean) => void = () => {};
  const setOverlayDegraded = (degraded: boolean) => {
    if (overlayDegraded === degraded) return;
    overlayDegraded = degraded;
    if (degraded) root.dataset.overlayTile = 'degraded';
    else delete root.dataset.overlayTile;
    overlayTileListener(degraded);
  };
  map.on('error', (event) => {
    const detail = event as unknown as { sourceId?: string; tile?: unknown };
    if (!detail.sourceId && !detail.tile) return;
    // A missing or CORS-blocked tile must not take the rest of the globe down.
    map.triggerRepaint();
    root.dataset.tileRepaint = '1';
    // Land and Blue Marble are also GIBS. Only the NDVI source is the vegetation overlay.
    if (detail.sourceId === 'ndvi') setOverlayDegraded(true);
  });
  map.on('sourcedata', (event) => {
    if (event.sourceId !== 'ndvi') return;
    const tile = (event as { tile?: { state?: string } }).tile;
    if (tile?.state === 'loaded') setOverlayDegraded(false);
  });

  const ready = new Promise<void>((resolve) => {
    let started = false;
    const setup = () => {
      if (started) return;
      started = true;
      map.setProjection({ type: 'globe' });
      root.dataset.projection = 'globe';
      if (!map.getSource('ndvi')) {
        map.addSource('ndvi', {
          type: 'raster',
          tiles: [ndviTiles(0)],
          tileSize: 256,
          maxzoom: 7,
          attribution: 'MODIS Terra NDVI',
        });
        map.addLayer({
          id: 'ndvi',
          type: 'raster',
          source: 'ndvi',
          layout: { visibility: 'none' },
          paint: { 'raster-opacity': 0.78 },
        });
      }
      map.setSky({
        'sky-color': '#070b12',
        'horizon-color': '#8ec5ff',
        'sky-horizon-blend': 0.36,
        'atmosphere-blend': 0.92,
      });
      resolve();
    };
    map.on('style.load', setup);
    if (map.isStyleLoaded()) setup();
  });

  let pickHandler: (hit: PickHit | null) => void = () => {};
  let species: Species[] = [];
  let providers = new Map<string, PositionProvider>();
  let positions: FramePosition[] = [];
  let day = 0;
  let statusFilter: StatusFilter = 'all';
  let overlayMonth: number | null = null;
  let appliedOverlay: number | null | undefined;
  let notice: string[] = [];
  const sourceIds = new Set<string>();

  const overlays = createOverlays(map, (hit) => pickHandler(hit));

  const paint = () => {
    species.forEach((item) => ensureSpecies(item));
    species.forEach((item) => {
      const source = map.getSource(sourceId(item.id)) as GeoJSONSource | undefined;
      const mine = positions.filter((position) => position.speciesId === item.id);
      source?.setData(frameCollection([item], mine, providers, day, statusFilter));
    });
  };
  // setFrame arrives once per animation frame. Collapse that burst into one
  // geometry update, including the frames that arrive before the style loads.
  let paintQueued = false;
  const schedulePaint = () => {
    if (paintQueued) return;
    paintQueued = true;
    void ready.then(() => {
      paintQueued = false;
      paint();
    });
  };

  const ensureSpecies = (item: Species) => {
    const id = sourceId(item.id);
    if (sourceIds.has(id)) return;
    if (map.getSource(id)) {
      sourceIds.add(id);
      return;
    }
    addArrow(map, item.id, item.colour);
    map.addSource(id, { type: 'geojson', data: EMPTY });
    map.addLayer({
      id: `route-hit-${item.id}`,
      type: 'line',
      source: id,
      filter: ['==', ['get', 'role'], 'line'],
      paint: { 'line-color': ['get', 'colour'], 'line-width': 14, 'line-opacity': 0.16 },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
    map.addLayer({
      id: `route-dash-${item.id}`,
      type: 'line',
      source: id,
      filter: ['all', ['==', ['get', 'role'], 'line'], ['==', ['get', 'stroke'], 1]],
      paint: {
        'line-color': ['get', 'colour'],
        'line-width': 2.2,
        'line-dasharray': [1.4, 1.6],
        'line-opacity': 0.9,
      },
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
    });
    map.addLayer({
      id: `route-sight-${item.id}`,
      type: 'line',
      source: id,
      filter: ['all', ['==', ['get', 'role'], 'line'], ['==', ['get', 'stroke'], 3]],
      paint: {
        'line-color': ['get', 'colour'],
        'line-width': 2.2,
        'line-dasharray': [1.6, 1.1, 0.35, 1.1],
        'line-opacity': 0.9,
      },
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
    });
    map.addLayer({
      id: `route-dot-${item.id}`,
      type: 'line',
      source: id,
      filter: ['all', ['==', ['get', 'role'], 'line'], ['==', ['get', 'stroke'], 2]],
      paint: {
        'line-color': ['get', 'colour'],
        'line-width': 2,
        'line-dasharray': [0.2, 1.8],
        'line-opacity': 0.55,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
    map.addLayer({
      id: `route-solid-${item.id}`,
      type: 'line',
      source: id,
      filter: ['all', ['==', ['get', 'role'], 'line'], ['==', ['get', 'stroke'], 0]],
      paint: { 'line-color': ['get', 'colour'], 'line-width': 2.6, 'line-opacity': 0.95 },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
    map.addLayer({
      id: `trail-${item.id}`,
      type: 'line',
      source: id,
      filter: ['==', ['get', 'role'], 'trail'],
      paint: { 'line-color': ['get', 'colour'], 'line-width': 3.4, 'line-opacity': 0.95 },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
    map.addLayer({
      id: `halo-${item.id}`,
      type: 'circle',
      source: id,
      filter: ['==', ['get', 'role'], 'marker'],
      paint: {
        'circle-color': ['get', 'colour'],
        'circle-radius': ['interpolate', ['linear'], ['get', 'uncertaintyKm'], 80, 9, 500, 22, 1500, 36],
        'circle-opacity': ['match', ['get', 'mark'], 'dispersed', 0.28, 'estimated', 0.12, 0.18],
        'circle-blur': 0.65,
      },
    });
    map.addLayer({
      id: `marker-${item.id}`,
      type: 'circle',
      source: id,
      filter: ['==', ['get', 'role'], 'marker'],
      paint: {
        'circle-color': ['get', 'colour'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0.6, 6, 4, 10],
        'circle-opacity': [
          'match',
          ['get', 'mark'],
          'observed',
          0.95,
          'sightings',
          0.12,
          'estimated',
          0.08,
          'dispersed',
          0.2,
          'interpolated',
          0.38,
          0.6,
        ],
        'circle-stroke-color': '#f4efe6',
        'circle-stroke-width': ['match', ['get', 'mark'], 'sightings', 2.6, 'estimated', 2.4, 'dispersed', 2.2, 1.5],
        'circle-stroke-opacity': ['match', ['get', 'mark'], 'sightings', 0.95, 'observed', 0.35, 'estimated', 0.95, 'dispersed', 0.85, 0.45],
        'circle-blur': ['match', ['get', 'mark'], 'observed', 0, 'interpolated', 0.35, 0.05],
      },
    });
    map.addLayer({
      id: `head-${item.id}`,
      type: 'symbol',
      source: id,
      filter: ['==', ['get', 'role'], 'head'],
      layout: {
        'icon-image': ['get', 'arrow'],
        'icon-size': 0.72,
        'icon-rotate': ['get', 'bearing'],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    });
    sourceIds.add(id);
  };

  const dropMissing = (next: Species[]) => {
    const keep = new Set(next.map((item) => sourceId(item.id)));
    [...sourceIds].forEach((id) => {
      if (keep.has(id)) return;
      const speciesId = id.replace('species-', '');
      speciesLayerIds(speciesId).forEach((layerId) => {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
      });
      if (map.getSource(id)) map.removeSource(id);
      if (!map.getSource(id)) sourceIds.delete(id);
    });
  };

  const onClick = (event: MapLayerMouseEvent) => {
    const target = event.originalEvent.target;
    // A pin or an open card sits in the canvas container. Its click already
    // selected the species; treating it as an empty-map click clears the card.
    if (target instanceof Element && target.closest('.pin, .maplibregl-popup, .event-sheet')) return;
    const layers = [...sourceIds].flatMap((id) => {
      const speciesId = id.replace('species-', '');
      return [`marker-${speciesId}`, `route-hit-${speciesId}`, `head-${speciesId}`];
    });
    const present = layers.filter((id) => map.getLayer(id));
    if (present.length === 0) {
      pickHandler(null);
      return;
    }
    const hits = map.queryRenderedFeatures(event.point, { layers: present });
    const feature = hits[0];
    const props = feature?.properties;
    if (!props?.speciesId) {
      pickHandler(null);
      return;
    }
    const kind = props.role === 'line' ? 'route' : 'marker';
    pickHandler({
      speciesId: String(props.speciesId),
      trackId: String(props.trackId ?? ''),
      kind,
      lat: event.lngLat.lat,
      lng: event.lngLat.lng,
    });
  };
  map.on('click', onClick);

  const paintNotice = () => {
    const parts = [...notice];
    if (overlayMonth != null) parts.push('MODIS Terra NDVI, monthly observed composite, 2023');
    const text = parts.length ? ` · ${parts.join(' · ')}` : '';
    const inner = map.getContainer().querySelector('.maplibregl-ctrl-attrib-inner');
    if (!inner) return;
    let extra = inner.querySelector('.atlas-notice');
    if (!extra) {
      extra = document.createElement('span');
      extra.className = 'atlas-notice';
      inner.append(extra);
    }
    extra.textContent = text;
  };
  // Source attribution refreshes rewrite the control and drop the notice.
  map.on('idle', paintNotice);
  map.on('sourcedata', paintNotice);
  map.on('styledata', paintNotice);

  window.addEventListener('resize', () => map.resize());

  return {
    map,
    ready,
    setSpecies(next, nextProviders) {
      species = next;
      providers = nextProviders;
      void ready.then(() => {
        dropMissing(next);
        overlays.setSpecies(next);
        paint();
      });
    },
    setFrame(next, nextDay) {
      positions = next;
      day = nextDay;
      schedulePaint();
    },
    setSelected(speciesId) {
      overlays.setSelected(speciesId);
    },
    setFilter(filter) {
      statusFilter = filter;
      schedulePaint();
    },
    setOverlay(month) {
      const changed = month !== appliedOverlay;
      appliedOverlay = month;
      overlayMonth = month;
      root.dataset.overlay = month == null ? 'off' : 'ndvi';
      if (month == null) setOverlayDegraded(false);
      void ready.then(() => {
        if (!map.getLayer('ndvi')) return;
        map.setLayoutProperty('ndvi', 'visibility', month == null ? 'none' : 'visible');
        if (month != null && changed) {
          const source = map.getSource('ndvi') as { setTiles?: (tiles: string[]) => void } | undefined;
          source?.setTiles?.([ndviTiles(month)]);
        }
        paintNotice();
      });
    },
    setNotice(parts) {
      notice = parts;
      paintNotice();
    },
    setThreats(on) {
      overlays.setThreats(on);
    },
    flyTo(bbox) {
      void ready.then(() => flyToBBox(map, bbox));
    },
    zoomIn() {
      map.zoomIn({ duration: 200 });
    },
    zoomOut() {
      map.zoomOut({ duration: 200 });
    },
    routePoint(speciesId) {
      const item = species.find((entry) => entry.id === speciesId);
      return item ? routeSample(item) : null;
    },
    onPick(handler) {
      pickHandler = handler;
    },
    onOverlayTile(listener) {
      overlayTileListener = listener;
      if (overlayDegraded) listener(true);
    },
    destroy() {
      overlays.destroy();
      map.remove();
    },
  };
}

function sourceId(speciesId: string): string {
  return `species-${speciesId}`;
}

function speciesLayerIds(speciesId: string): string[] {
  return [
    `route-hit-${speciesId}`,
    `route-dash-${speciesId}`,
    `route-sight-${speciesId}`,
    `route-dot-${speciesId}`,
    `route-solid-${speciesId}`,
    `trail-${speciesId}`,
    `halo-${speciesId}`,
    `marker-${speciesId}`,
    `head-${speciesId}`,
  ];
}

/** Observed monthly NDVI for 2023. Not a climatology, and not stored in this repo. */
function ndviTiles(month: number): string {
  const mm = String(month + 1).padStart(2, '0');
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_L3_NDVI_Monthly/default/2023-${mm}-01/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`;
}

function addArrow(map: MapLibreMap, speciesId: string, colour: string) {
  const name = `arrow-${speciesId}`;
  if (map.hasImage(name)) return;
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 40;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, 40, 40);
  context.beginPath();
  context.moveTo(20, 3);
  context.lineTo(36, 36);
  context.lineTo(20, 26);
  context.lineTo(4, 36);
  context.closePath();
  context.fillStyle = colour;
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = '#070b12';
  context.stroke();
  const image = context.getImageData(0, 0, 40, 40);
  map.addImage(name, image, { pixelRatio: 2 });
}

declare global {
  interface Window {
    __atlas?: {
      map: MapLibreMap;
      positions: FramePosition[];
      routePoint: (speciesId: string) => { lng: number; lat: number } | null;
    };
  }
}
