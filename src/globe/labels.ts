// Place labels and event pins. Collision and the pin markup come from the history map.
import { Marker, type Map as MapLibreMap } from 'maplibre-gl';
import type { Species } from '../data/schema';
import { LABEL_MIN_ZOOM, visibleLabelIds, type LabelBox } from '../labels';
import { placementsFor, spreadOverlaps } from '../spread';

export interface PickHit {
  speciesId: string;
  trackId: string;
  kind: 'marker' | 'route' | 'event';
  eventId?: string;
  lat: number;
  lng: number;
}

interface Drawn {
  id: string;
  speciesId: string;
  element: HTMLElement;
  label: HTMLElement | null;
  marker: Marker;
  lat: number;
}

export function createOverlays(map: MapLibreMap, onPick: (hit: PickHit) => void) {
  let drawn: Drawn[] = [];
  let selectedId = '';

  const refresh = () => {
    const zoom = map.getZoom();
    const boxes: LabelBox[] = [];
    const ordered = [...drawn].sort((a, b) => {
      if (a.speciesId === selectedId && b.speciesId !== selectedId) return -1;
      if (b.speciesId === selectedId && a.speciesId !== selectedId) return 1;
      return a.id < b.id ? -1 : 1;
    });
    ordered.forEach((item) => {
      const label = item.label ?? item.element;
      const polar = Math.abs(item.lat) >= 66;
      if (zoom < (polar ? 1.6 : LABEL_MIN_ZOOM)) {
        label.classList.remove('is-on');
        return;
      }
      if (item.element.classList.contains('maplibregl-marker-covered')) {
        label.classList.remove('is-on');
        return;
      }
      label.classList.add('is-on');
      const rect = label.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) {
        label.classList.remove('is-on');
        return;
      }
      boxes.push({ id: item.id, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
    });
    const visible = visibleLabelIds(boxes);
    drawn.forEach((item) => {
      const label = item.label ?? item.element;
      label.classList.toggle('is-on', visible.has(item.id));
    });
    spreadPins();
  };

  const spreadPins = () => {
    const pins = drawn.filter((item) => item.element.classList.contains('pin'));
    const points = pins.flatMap((pin) => {
      const rect = pin.element.getBoundingClientRect();
      if (rect.width < 2) return [];
      const current = pin.marker.getOffset();
      return [{ id: pin.id, x: rect.left + rect.width / 2 - current.x, y: rect.top + rect.height / 2 - current.y }];
    });
    const extra = spreadOverlaps(points);
    pins.forEach((pin) => {
      const add = extra.get(pin.id) ?? { x: 0, y: 0 };
      const current = pin.marker.getOffset();
      if (Math.abs(current.x - add.x) < 0.5 && Math.abs(current.y - add.y) < 0.5) return;
      pin.marker.setOffset([add.x, add.y]);
    });
  };

  map.on('move', refresh);
  map.on('zoom', refresh);
  map.on('idle', refresh);

  return {
    setSelected(id: string) {
      selectedId = id;
      refresh();
    },
    setSpecies(species: Species[]) {
      drawn.forEach((item) => item.marker.remove());
      drawn = [];
      const events = species.flatMap((item) =>
        item.events.map((event) => ({
          id: `${item.id}-${event.kind}-${event.day}`,
          speciesId: item.id,
          title: event.label,
          eventId: `${item.id}-${event.kind}-${event.day}`,
          lat: event.lat,
          lng: event.lng,
          colour: item.colour,
        })),
      );
      const { kept } = placementsFor(events);
      kept.forEach((event) => {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = 'pin';
        element.dataset.id = event.id;
        element.setAttribute('aria-label', event.title);
        element.style.setProperty('--pin', event.colour);
        element.innerHTML = `<span class="dot"></span><span class="pin-label"></span>`;
        const label = element.querySelector('.pin-label') as HTMLElement;
        label.textContent = event.title;
        element.addEventListener('click', (click) => {
          click.stopPropagation();
          onPick({
            speciesId: event.speciesId,
            trackId: '',
            kind: 'event',
            eventId: event.eventId,
            lat: event.lat,
            lng: event.lng,
          });
        });
        const marker = new Marker({ element, anchor: 'center', opacityWhenCovered: 0, offset: [event.offsetX, event.offsetY] })
          .setLngLat([event.lng, event.lat])
          .addTo(map);
        drawn.push({ id: event.id, speciesId: event.speciesId, element, label, marker, lat: event.lat });
      });
      species.forEach((item) => {
        item.places.forEach((place) => {
          const element = document.createElement('span');
          element.className = 'place-label';
          element.dataset.id = place.id;
          element.textContent = place.name;
          const marker = new Marker({ element, anchor: 'top', opacityWhenCovered: 0, offset: [0, 6] })
            .setLngLat([place.lng, place.lat])
            .addTo(map);
          drawn.push({
            id: `${item.id}-${place.id}`,
            speciesId: item.id,
            element,
            label: null,
            marker,
            lat: place.lat,
          });
        });
      });
      refresh();
    },
    destroy() {
      drawn.forEach((item) => item.marker.remove());
      drawn = [];
    },
  };
}
