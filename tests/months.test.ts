import { describe, expect, it } from 'vitest';
import { licenceMark, monthGlyph } from '../src/data/months';

describe('month glyphs', () => {
  it('gives citizen-science sightings their own glyph', () => {
    expect(monthGlyph('observed-sightings')).toBe('sightings');
    expect(monthGlyph('observed')).toBe('observed');
    expect(monthGlyph('representative')).toBe('estimated');
    expect(monthGlyph('no-data')).toBe('no-data');
  });
});

describe('licence mark', () => {
  it('says a non-commercial entry is not for a paid version', () => {
    expect(licenceMark('CC0', true)).toBe('CC BY-NC 4.0. Not for a paid version.');
    expect(licenceMark('CC BY 4.0', false)).toBe('CC BY 4.0');
    expect(licenceMark(null, false)).toBeNull();
  });
});
