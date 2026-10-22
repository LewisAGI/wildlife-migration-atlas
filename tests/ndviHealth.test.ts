import { describe, expect, it } from 'vitest';
import { noteNdviFailure, noteNdviSuccess } from '../src/globe/ndviHealth';

describe('NDVI tile health', () => {
  it('clears the degraded flag once a tile decodes', () => {
    const failed = noteNdviFailure({ loaded: 0, degraded: false }, 404);
    expect(failed).toEqual({ loaded: 0, degraded: true });
    expect(noteNdviSuccess(failed)).toEqual({ loaded: 1, degraded: false });
  });

  it('sets the degraded flag when every tile is a 404 and nothing has decoded', () => {
    const first = noteNdviFailure({ loaded: 0, degraded: false }, 404);
    const second = noteNdviFailure(first, 404);
    expect(second.degraded).toBe(true);
    expect(second.loaded).toBe(0);
  });

  it('does not degrade on a 404 after a tile has decoded', () => {
    const loaded = noteNdviSuccess({ loaded: 0, degraded: false });
    expect(noteNdviFailure(loaded, 404)).toEqual(loaded);
  });

  it('leaves CORS status 0 to the map error event', () => {
    const health = { loaded: 0, degraded: false };
    expect(noteNdviFailure(health, 0)).toBe(health);
  });
});
