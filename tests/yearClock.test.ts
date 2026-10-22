import { describe, expect, it } from 'vitest';
import { createYearClock, formatDay, YEAR_LENGTH } from '../src/time/yearClock';

describe('year clock', () => {
  it('names 1 January and 31 December', () => {
    expect(formatDay(0)).toBe('1 Jan');
    expect(formatDay(YEAR_LENGTH - 1)).toBe('31 Dec');
    expect(formatDay(31)).toBe('1 Feb');
  });

  it('steps a day and wraps December into January when looping', () => {
    const clock = createYearClock(10);
    clock.step(1);
    expect(clock.day).toBe(11);
    clock.setDay(364);
    clock.step(1);
    expect(clock.day).toBe(0);
  });

  it('stops at the last day when loop is off', () => {
    const clock = createYearClock(360);
    clock.setLoop(false);
    clock.play();
    clock.advance(1000);
    expect(clock.playing).toBe(false);
    expect(Math.floor(clock.day)).toBe(YEAR_LENGTH - 1);
  });

  it('wraps playback from December into January', () => {
    const clock = createYearClock(360);
    clock.setSpeed(24);
    clock.setLoop(true);
    clock.play();
    clock.advance(1000);
    expect(clock.playing).toBe(true);
    expect(Math.floor(clock.day)).toBeLessThan(30);
  });
});
