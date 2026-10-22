/** Representative non-leap year. Day 0 is 1 January; day 364 is 31 December. */
export const YEAR_LENGTH = 365;

export const MONTHS: { name: string; short: string; days: number }[] = [
  { name: 'January', short: 'Jan', days: 31 },
  { name: 'February', short: 'Feb', days: 28 },
  { name: 'March', short: 'Mar', days: 31 },
  { name: 'April', short: 'Apr', days: 30 },
  { name: 'May', short: 'May', days: 31 },
  { name: 'June', short: 'Jun', days: 30 },
  { name: 'July', short: 'Jul', days: 31 },
  { name: 'August', short: 'Aug', days: 31 },
  { name: 'September', short: 'Sep', days: 30 },
  { name: 'October', short: 'Oct', days: 31 },
  { name: 'November', short: 'Nov', days: 30 },
  { name: 'December', short: 'Dec', days: 31 },
];

export interface MonthMark {
  day: number;
  short: string;
}

export function monthMarks(): MonthMark[] {
  let day = 0;
  return MONTHS.map((month) => {
    const mark = { day, short: month.short };
    day += month.days;
    return mark;
  });
}

export function formatDay(day: number, long = false): string {
  let cursor = Math.min(YEAR_LENGTH - 1, Math.max(0, Math.floor(day)));
  for (const month of MONTHS) {
    if (cursor < month.days) {
      const date = cursor + 1;
      return long ? `${date} ${month.name}` : `${date} ${month.short}`;
    }
    cursor -= month.days;
  }
  return long ? '31 December' : '31 Dec';
}

export function wrapDay(day: number): number {
  const wrapped = day % YEAR_LENGTH;
  return wrapped < 0 ? wrapped + YEAR_LENGTH : wrapped;
}

export interface YearClock {
  readonly day: number;
  readonly speed: number;
  readonly loop: boolean;
  readonly playing: boolean;
  subscribe(listener: () => void): () => void;
  setDay(day: number): void;
  setSpeed(daysPerSecond: number): void;
  setLoop(loop: boolean): void;
  play(): void;
  pause(): void;
  toggle(): void;
  step(delta: number): void;
  /** Move the playhead. Listeners fire when the calendar day or playback state changes. */
  advance(ms: number): void;
}

export function createYearClock(initial = 0): YearClock {
  let day = wrapDay(initial);
  let speed = 24;
  let loop = true;
  let playing = false;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((listener) => listener());

  return {
    get day() {
      return day;
    },
    get speed() {
      return speed;
    },
    get loop() {
      return loop;
    },
    get playing() {
      return playing;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setDay(next) {
      day = loop ? wrapDay(next) : clampDay(next);
      emit();
    },
    setSpeed(daysPerSecond) {
      speed = daysPerSecond;
      emit();
    },
    setLoop(next) {
      loop = next;
      emit();
    },
    play() {
      if (playing) return;
      if (!loop && day >= YEAR_LENGTH - 1) return;
      playing = true;
      emit();
    },
    pause() {
      if (!playing) return;
      playing = false;
      emit();
    },
    toggle() {
      if (playing) this.pause();
      else this.play();
    },
    step(delta) {
      const next = day + delta;
      if (!loop && (next >= YEAR_LENGTH || next < 0)) {
        day = clampDay(next);
        if (playing) playing = false;
        emit();
        return;
      }
      day = wrapDay(next);
      emit();
    },
    advance(ms) {
      if (!playing || ms <= 0) return;
      const before = Math.floor(day);
      const next = day + (speed * ms) / 1000;
      if (!loop && next >= YEAR_LENGTH) {
        day = YEAR_LENGTH - 1;
        playing = false;
        emit();
        return;
      }
      day = wrapDay(next);
      if (Math.floor(day) !== before) emit();
    },
  };
}

function clampDay(day: number): number {
  return Math.min(YEAR_LENGTH - 1, Math.max(0, day));
}
