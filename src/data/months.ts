export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** Mid-month day of year, matching the fixes the globe interpolates between. */
export const MONTH_DAYS = [15, 45, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349] as const;

export function monthIndexForDay(day: number): number {
  let best = 0;
  let gap = 365;
  MONTH_DAYS.forEach((mark, index) => {
    const distance = Math.min(Math.abs(mark - day), 365 - Math.abs(mark - day));
    if (distance < gap) {
      gap = distance;
      best = index;
    }
  });
  return best;
}

/** Share of a cited annual distance. This is the cited figure scaled by the day, not a measured track. */
export function citedProgressKm(citedKm: number, day: number): number {
  const fraction = Math.min(364, Math.max(0, day)) / 365;
  return Math.round(citedKm * fraction);
}

export function monthWord(status: 'observed' | 'observed-sightings' | 'representative' | 'no-data'): string {
  if (status === 'observed') return 'observed';
  if (status === 'observed-sightings') return 'observed sightings';
  if (status === 'no-data') return 'no data';
  return 'estimated';
}

/** Class token for a month glyph. Sightings stay distinct from tracked observations. */
export function monthGlyph(status: 'observed' | 'observed-sightings' | 'representative' | 'no-data'): string {
  if (status === 'observed-sightings') return 'sightings';
  if (status === 'no-data') return 'no-data';
  if (status === 'representative') return 'estimated';
  return 'observed';
}

/** Line shown on the map while this population is selected. */
export function licenceNotice(shortName: string, datasetLicence: string | null, nonCommercial: boolean): string | null {
  if (nonCommercial) return `${shortName}: CC BY-NC 4.0, not for a paid version`;
  if (datasetLicence) return `${shortName}: ${datasetLicence}`;
  return null;
}

/** Line in the sheet and the comparison. Non-commercial entries say they are not for a paid version. */
export function licenceMark(datasetLicence: string | null, nonCommercial: boolean): string | null {
  if (nonCommercial) return 'CC BY-NC 4.0. Not for a paid version.';
  return datasetLicence;
}
