import { useLayoutEffect, useRef } from 'react';
import { formatDay, monthMarks, YEAR_LENGTH } from '../time/yearClock';
import { IconButton } from './IconButton';
import { IconChevron, IconLoop, IconPause, IconPlay, IconPlayback, IconSpeed } from './icons';

export const PLAYBACK_SPEEDS = [
  { label: 'Slow', daysPerSecond: 6, bars: 1 },
  { label: 'Steady', daysPerSecond: 24, bars: 2 },
  { label: 'Fast', daysPerSecond: 60, bars: 3 },
  { label: 'Swift', daysPerSecond: 120, bars: 4 },
] as const;

interface TimeBarProps {
  day: number;
  playing: boolean;
  loop: boolean;
  speed: number;
  playbackOpen: boolean;
  onDay: (day: number) => void;
  onTogglePlay: () => void;
  onStep: (delta: number) => void;
  onSpeed: (daysPerSecond: number) => void;
  onLoop: () => void;
  onTogglePlayback: () => void;
}

export function TimeBar({
  day,
  playing,
  loop,
  speed,
  playbackOpen,
  onDay,
  onTogglePlay,
  onStep,
  onSpeed,
  onLoop,
  onTogglePlayback,
}: TimeBarProps) {
  const label = formatDay(day);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const ticksRef = useRef<HTMLDivElement>(null);
  const monthsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ticks = ticksRef.current;
    const months = monthsRef.current;
    const thumb = buttonRef.current;
    const slider = sliderRef.current;
    if (!ticks || !months || !thumb || !slider) return;
    paintTicks(ticks);
    paintMonths(months);
    placeThumb(thumb, slider);
    separateMonths(months, thumb);
  });

  return (
    <div className="time">
      <div className="thumb-band">
        <button
          type="button"
          id="day-button"
          className="thumb-label"
          ref={buttonRef}
          aria-label={formatDay(day, true)}
          aria-expanded={playbackOpen}
          onClick={onTogglePlayback}
        >
          {label}
        </button>
        <IconButton id="tools-button" className="tools-button" label="Playback" expanded={playbackOpen} onClick={onTogglePlayback}>
          <IconPlayback />
        </IconButton>
      </div>
      <div className="time-row">
        <IconButton label="Previous day" onClick={() => onStep(-1)}>
          <IconChevron direction="left" />
        </IconButton>
        <IconButton id="play" label={playing ? 'Pause' : 'Play'} pressed={playing} onClick={onTogglePlay}>
          {playing ? <IconPause /> : <IconPlay />}
        </IconButton>
        <div className="ruler">
          <div className="ticks" id="ticks" ref={ticksRef} aria-hidden="true" />
          <div className="era-labels" id="month-labels" ref={monthsRef} aria-hidden="true" />
          <input
            id="slider"
            ref={sliderRef}
            type="range"
            min={0}
            max={YEAR_LENGTH - 1}
            step={1}
            value={day}
            aria-label="Day of year"
            aria-valuetext={formatDay(day, true)}
            onChange={(event) => onDay(Number(event.target.value))}
          />
        </div>
        <IconButton label="Next day" onClick={() => onStep(1)}>
          <IconChevron direction="right" />
        </IconButton>
        <IconButton id="playback-button" label="Playback" expanded={playbackOpen} onClick={onTogglePlayback}>
          <IconPlayback />
        </IconButton>
      </div>
      <div id="playback-popout" className="popout" hidden={!playbackOpen}>
        {PLAYBACK_SPEEDS.map((option) => (
          <IconButton
            key={option.label}
            label={option.label}
            pressed={speed === option.daysPerSecond}
            onClick={() => onSpeed(option.daysPerSecond)}
          >
            <IconSpeed bars={option.bars} />
          </IconButton>
        ))}
        <IconButton className="loop-option" label="Loop" pressed={loop} onClick={onLoop}>
          <IconLoop />
        </IconButton>
      </div>
    </div>
  );
}

function paintTicks(ticks: HTMLElement) {
  const width = ticks.clientWidth;
  if (width < 8) return;
  const count = 12;
  ticks.replaceChildren();
  for (let index = 0; index < count; index += 1) {
    const tick = document.createElement('span');
    tick.className = 'tick is-major';
    tick.style.left = `${(index / (count - 1)) * 100}%`;
    ticks.append(tick);
  }
}

function paintMonths(months: HTMLElement) {
  const marks = monthMarks();
  months.replaceChildren();
  marks.forEach((mark) => {
    const node = document.createElement('span');
    node.className = 'month-tick';
    node.dataset.mark = mark.short;
    node.textContent = mark.short;
    const ratio = mark.day / (YEAR_LENGTH - 1);
    node.style.left = `${ratio * 100}%`;
    node.style.transform = ratio <= 0.02 ? 'translateX(0)' : ratio >= 0.98 ? 'translateX(-100%)' : 'translateX(-50%)';
    months.append(node);
  });
}

function placeThumb(thumb: HTMLElement, slider: HTMLInputElement) {
  const band = thumb.parentElement;
  const card = band?.closest<HTMLElement>('.time');
  if (!band || !card) return;
  const ratio = Number(slider.value) / Number(slider.max);
  const sliderRect = slider.getBoundingClientRect();
  const bandRect = band.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  if (bandRect.width < 8 || sliderRect.width < 2) return;
  const center = sliderRect.left + 2 + ratio * (sliderRect.width - 4);
  const half = thumb.getBoundingClientRect().width / 2;
  const tools = document.querySelector<HTMLElement>('#tools-button');
  let minCenter = cardRect.left + half + 2;
  let maxCenter = cardRect.right - half - 2;
  if (tools && tools.offsetParent) {
    const toolsRect = tools.getBoundingClientRect();
    if (toolsRect.width > 2) maxCenter = Math.min(maxCenter, toolsRect.left - half - 5);
  }
  const lo = Math.min(minCenter, maxCenter) - bandRect.left;
  const hi = Math.max(minCenter, maxCenter) - bandRect.left;
  const x = Math.min(Math.max(center - bandRect.left, lo), hi);
  thumb.style.left = `${x}px`;
}

function separateMonths(months: HTMLElement, thumb: HTMLElement) {
  const labels = [...months.querySelectorAll<HTMLElement>('.month-tick')];
  labels.forEach((node) => {
    node.hidden = false;
  });
  const thumbRect = thumb.getBoundingClientRect();
  const hits = (a: DOMRect, b: DOMRect) =>
    a.width > 1 && b.width > 1 && a.left < b.right + 2 && a.right > b.left - 2 && a.top < b.bottom && a.bottom > b.top;
  const kept: HTMLElement[] = [];
  labels.forEach((node) => {
    const rect = node.getBoundingClientRect();
    const blocked = hits(rect, thumbRect) || kept.some((other) => hits(rect, other.getBoundingClientRect()));
    node.hidden = blocked;
    if (!blocked) kept.push(node);
  });
}
