import { describe, expect, it } from 'vitest';
import { framePublishKey, shouldPublishFrame } from '../src/ui/framePublish';

describe('paused frame publish', () => {
  it('skips a paused frame when the day and providers are unchanged', () => {
    const key = framePublishKey(['blue-wildebeest'], 'all', ['blue-wildebeest:year']);
    const published = { key, day: 15 };
    expect(shouldPublishFrame(published, { key, day: 15.2, playing: false })).toBe(false);
  });

  it('publishes again when providers arrive after a frame was skipped', () => {
    const empty = framePublishKey(['blue-wildebeest'], 'all', []);
    const published = { key: empty, day: 15 };
    expect(shouldPublishFrame(published, { key: empty, day: 15.2, playing: false })).toBe(false);
    const ready = framePublishKey(['blue-wildebeest'], 'all', ['blue-wildebeest:year']);
    expect(shouldPublishFrame(published, { key: ready, day: 15.2, playing: false })).toBe(true);
  });

  it('publishes a playing frame when only the fractional day changes', () => {
    const key = framePublishKey(['blue-wildebeest'], 'all', ['blue-wildebeest:year']);
    const published = { key, day: 15 };
    expect(shouldPublishFrame(published, { key, day: 15.2, playing: true })).toBe(true);
  });
});
