import { useEffect, useMemo, useRef, useState } from 'react';
import { loadCatalog } from '../data/load';
import type { Species } from '../data/schema';
import { createGlobe, type GlobeController } from '../globe/createGlobe';
import type { PickHit } from '../globe/labels';
import type { FramePosition } from '../globe/markers';
import { createTrackProvider, type PositionProvider, type PositionSample } from '../motion/interpolate';
import { createYearClock, type YearClock } from '../time/yearClock';
import { IconButton } from './IconButton';
import { IconMinus, IconPlus } from './icons';
import { InfoSheet } from './InfoSheet';
import { bindLongPress } from './longPress';
import { SpeciesPopout } from './SpeciesPopout';
import { TimeBar } from './TimeBar';

export function App() {
  const clockRef = useRef<YearClock | null>(null);
  if (!clockRef.current) clockRef.current = createYearClock(15);
  const clock = clockRef.current;
  const mapNode = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeController | null>(null);
  const visibleRef = useRef<Species[]>([]);
  const providersRef = useRef<Map<string, PositionProvider>>(new Map());

  const [catalog, setCatalog] = useState<Species[]>([]);
  const [selectedId, setSelectedId] = useState('wildebeest');
  const [compare, setCompare] = useState(false);
  const [day, setDay] = useState(() => Math.floor(clock.day));
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(clock.loop);
  const [speed, setSpeed] = useState(clock.speed);
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [playbackOpen, setPlaybackOpen] = useState(false);
  const [info, setInfo] = useState<PickHit | null>(null);
  const [snapshot, setSnapshot] = useState<FramePosition[]>([]);
  const openRef = useRef({ species: false, playback: false });
  openRef.current = { species: speciesOpen, playback: playbackOpen };

  const providers = useMemo(() => {
    const map = new Map<string, PositionProvider>();
    catalog.forEach((item) => {
      item.tracks.forEach((track) => map.set(`${item.id}:${track.id}`, createTrackProvider(track)));
    });
    return map;
  }, [catalog]);
  providersRef.current = providers;

  const visible = compare ? catalog : catalog.filter((item) => item.id === selectedId);
  visibleRef.current = visible;
  const visibleKey = visible.map((item) => item.id).join(',');

  useEffect(() => {
    let cancel = false;
    loadCatalog()
      .then((result) => {
        if (!cancel) setCatalog(result.species);
      })
      .catch((error: unknown) => {
        console.error(error);
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => bindLongPress(), []);

  useEffect(() => {
    const node = mapNode.current;
    const root = document.querySelector<HTMLElement>('#app');
    if (!node || !root) return;
    const globe = createGlobe(node, root);
    globeRef.current = globe;
    window.__atlas = {
      map: globe.map,
      positions: [],
      routePoint: (id) => globe.routePoint(id),
    };
    globe.onPick((hit) => {
      setSpeciesOpen(false);
      setPlaybackOpen(false);
      setInfo(hit);
    });
    return () => {
      globe.destroy();
      globeRef.current = null;
      delete window.__atlas;
    };
  }, []);

  useEffect(() => {
    globeRef.current?.setSpecies(visibleRef.current, providersRef.current);
    globeRef.current?.setSelected(selectedId);
  }, [visibleKey, providers, selectedId]);

  useEffect(() => {
    const item = catalog.find((entry) => entry.id === selectedId);
    if (!item) return;
    globeRef.current?.flyTo(item.bbox);
  }, [catalog, selectedId]);

  useEffect(() => {
    return clock.subscribe(() => {
      setPlaying(clock.playing);
      setLoop(clock.loop);
      setSpeed(clock.speed);
      setDay(Math.floor(clock.day));
    });
  }, [clock]);

  useEffect(() => {
    let last = performance.now();
    let frame = 0;
    let shown = -1;
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      clock.advance(dt);
      const dayNow = clock.day;
      const positions: FramePosition[] = [];
      visibleRef.current.forEach((item) => {
        item.tracks.forEach((track) => {
          const sample = providersRef.current.get(`${item.id}:${track.id}`)?.positionAt(dayNow);
          if (!sample) return;
          positions.push({ ...sample, speciesId: item.id, colour: item.colour });
        });
      });
      globeRef.current?.setFrame(positions, dayNow);
      const root = document.querySelector<HTMLElement>('#app');
      if (root) {
        root.dataset.day = String(Math.floor(dayNow));
        root.dataset.playing = clock.playing ? '1' : '0';
        if (positions.length > 0) {
          void globeRef.current?.ready.then(() => {
            root.dataset.ready = 'true';
          });
        }
      }
      if (window.__atlas) window.__atlas.positions = positions;
      const next = Math.floor(dayNow);
      if (positions.length > 0 && next !== shown) {
        shown = next;
        setSnapshot(positions);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [clock]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      if (!element?.closest('#play')) clock.pause();
      if (!element) return;
      if (openRef.current.species && !element.closest('#species-panel, #species-button')) setSpeciesOpen(false);
      if (
        openRef.current.playback &&
        !element.closest('#playback-popout, #playback-button, #tools-button, #day-button')
      ) {
        setPlaybackOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        clock.pause();
        clock.step(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        clock.pause();
        clock.step(-1);
      } else if (event.key === 'Escape') {
        setSpeciesOpen(false);
        setPlaybackOpen(false);
        setInfo(null);
      }
    };
    const onWheel = () => clock.pause();
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
    };
  }, [clock]);

  useEffect(() => {
    if (info && !visibleRef.current.some((item) => item.id === info.speciesId)) setInfo(null);
  }, [visibleKey, info]);

  const selected = catalog.find((item) => item.id === info?.speciesId) ?? null;
  const sample: PositionSample | null =
    (info && snapshot.find((item) => item.speciesId === info.speciesId && (info.trackId === '' || item.trackId === info.trackId))) ||
    null;
  const anchor = anchorFor(info, selected, sample);

  return (
    <>
      <div id="map" ref={mapNode} />
      <p className="wordmark">Wildlife migration atlas</p>
      <div className="zoom">
        <IconButton label="Zoom in" onClick={() => globeRef.current?.zoomIn()}>
          <IconPlus />
        </IconButton>
        <IconButton label="Zoom out" onClick={() => globeRef.current?.zoomOut()}>
          <IconMinus />
        </IconButton>
      </div>
      <SpeciesPopout
        species={catalog}
        selectedId={selectedId}
        compare={compare}
        open={speciesOpen}
        onToggle={() => {
          setPlaybackOpen(false);
          setSpeciesOpen((open) => !open);
        }}
        onSelect={(id) => {
          setSelectedId(id);
          setSpeciesOpen(false);
          setInfo(null);
        }}
        onCompare={() => setCompare((value) => !value)}
      />
      <TimeBar
        day={day}
        playing={playing}
        loop={loop}
        speed={speed}
        playbackOpen={playbackOpen}
        onDay={(next) => {
          clock.pause();
          clock.setDay(next);
        }}
        onTogglePlay={() => {
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            clock.pause();
            clock.step(1);
            return;
          }
          clock.toggle();
        }}
        onStep={(delta) => {
          clock.pause();
          clock.step(delta);
        }}
        onSpeed={(daysPerSecond) => clock.setSpeed(daysPerSecond)}
        onLoop={() => clock.setLoop(!clock.loop)}
        onTogglePlayback={() => {
          setSpeciesOpen(false);
          setPlaybackOpen((open) => !open);
        }}
      />
      {selected && info && anchor && globeRef.current && (
        <InfoSheet
          map={globeRef.current.map}
          species={selected}
          trackId={info.trackId}
          eventId={info.eventId}
          day={day}
          anchor={anchor}
          sample={sample}
          onClose={() => setInfo(null)}
        />
      )}
    </>
  );
}

function anchorFor(
  info: PickHit | null,
  species: Species | null,
  sample: PositionSample | null,
): { lat: number; lng: number } | null {
  if (!info || !species) return null;
  if (info.kind === 'event' && info.eventId) {
    const event = species.events.find((item) => `${species.id}-${item.kind}-${item.day}` === info.eventId);
    if (event) return { lat: event.lat, lng: event.lng };
  }
  if (sample) return { lat: sample.lat, lng: sample.lng };
  return { lat: info.lat, lng: info.lng };
}
