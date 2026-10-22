import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Popup, type Map as MapLibreMap } from 'maplibre-gl';
import type { Species, SpeciesEvent } from '../data/schema';
import type { PositionSample } from '../motion/interpolate';
import { formatDay, YEAR_LENGTH } from '../time/yearClock';
import { clearSheetChrome, placeSheet, prefersSheet } from './sheetLayout';

interface InfoSheetProps {
  map: MapLibreMap;
  species: Species;
  trackId: string;
  eventId?: string;
  day: number;
  anchor: { lat: number; lng: number };
  sample: PositionSample | null;
  onClose: () => void;
}

export function InfoSheet(props: InfoSheetProps) {
  const [sheet, setSheet] = useState(() => prefersSheet());
  useEffect(() => {
    const onResize = () => setSheet(prefersSheet());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const body = <SpeciesBody {...props} />;
  if (sheet) {
    return <BottomSheet onClose={props.onClose}>{body}</BottomSheet>;
  }
  return (
    <DesktopPopup map={props.map} lng={props.anchor.lng} lat={props.anchor.lat} onClose={props.onClose}>
      {body}
    </DesktopPopup>
  );
}

function SpeciesBody({ species, trackId, eventId, day, sample }: InfoSheetProps) {
  const track = species.tracks.find((item) => item.id === trackId) ?? species.tracks[0];
  const event = chosenEvent(species, day, eventId);
  const status = sample?.status ?? 'representative';
  return (
    <div className="sheet-copy" data-species={species.id}>
      <h2 className="popup-title">{species.names.common}</h2>
      <p className="popup-latin">{species.names.scientific}</p>
      <p className="popup-place">
        {species.population}
        {track?.branch ? ` · ${track.branch}` : ''}
      </p>
      <p className="popup-date">{formatDay(day, true)}</p>
      <p className="popup-status">
        {statusLabel(status)}
        {status !== 'observed' && <span className="approx-mark">approximate</span>}
      </p>
      <p className="popup-summary">{species.summary}</p>
      <dl className="popup-facts">
        <div>
          <dt>Range</dt>
          <dd>{species.range}</dd>
        </div>
        <div>
          <dt>Distance</dt>
          <dd>{species.distance}</dd>
        </div>
        <div>
          <dt>Timing</dt>
          <dd>{species.timing}</dd>
        </div>
      </dl>
      {event && <p className="popup-event">{event.text}</p>}
      <p className="popup-note">{species.uncertaintyNote}</p>
      <ul className="sources">
        {species.provenance.map((item) => (
          <li key={item.id}>
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.source}
            </a>
            {' · '}
            {item.licence}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BottomSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const place = () => placeSheet(node);
    place();
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('resize', place);
      clearSheetChrome();
    };
  }, []);
  return (
    <div ref={ref} className="event-sheet" role="dialog" aria-label="Species">
      <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <div className="sheet-body">{children}</div>
    </div>
  );
}

function DesktopPopup({
  map,
  lng,
  lat,
  onClose,
  children,
}: {
  map: MapLibreMap;
  lng: number;
  lat: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const popupRef = useRef<Popup | null>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = document.createElement('div');
    let suppress = false;
    const popup = new Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '320px',
      className: 'event-popup',
      offset: 18,
      anchor: 'bottom',
      focusAfterOpen: false,
    })
      .setLngLat([lng, lat])
      .setDOMContent(element)
      .addTo(map);
    popup.on('close', () => {
      if (!suppress) onCloseRef.current();
    });
    popupRef.current = popup;
    setHost(element);
    return () => {
      suppress = true;
      popupRef.current = null;
      popup.remove();
      setHost(null);
    };
    // The popup is anchored once; later days only move it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    popupRef.current?.setLngLat([lng, lat]);
  }, [lng, lat]);

  useLayoutEffect(() => {
    const element = popupRef.current?.getElement();
    if (!element) return;
    element.style.marginLeft = '0px';
    element.style.marginTop = '0px';
    const rect = element.getBoundingClientRect();
    const margin = 12;
    let dx = 0;
    let dy = 0;
    if (rect.right > window.innerWidth - margin) dx = window.innerWidth - margin - rect.right;
    if (rect.left + dx < margin) dx = margin - rect.left;
    if (rect.height > window.innerHeight - margin * 2) dy = margin - rect.top;
    else {
      if (rect.top < margin) dy = margin - rect.top;
      if (rect.bottom + dy > window.innerHeight - margin) dy = window.innerHeight - margin - rect.bottom;
    }
    element.style.marginLeft = `${dx}px`;
    element.style.marginTop = `${dy}px`;
  });

  if (!host) return null;
  return createPortal(children, host);
}

function chosenEvent(species: Species, day: number, eventId?: string): SpeciesEvent | null {
  if (eventId) {
    const picked = species.events.find((event) => `${species.id}-${event.kind}-${event.day}` === eventId);
    if (picked) return picked;
  }
  let best: SpeciesEvent | null = null;
  let bestGap = 16;
  species.events.forEach((event) => {
    const gap = Math.min(Math.abs(event.day - day), YEAR_LENGTH - Math.abs(event.day - day));
    if (gap < bestGap) {
      best = event;
      bestGap = gap;
    }
  });
  return best;
}

function statusLabel(status: string): string {
  if (status === 'observed') return 'Observed';
  if (status === 'interpolated') return 'Interpolated';
  if (status === 'simulated') return 'Simulated';
  return 'Representative';
}
