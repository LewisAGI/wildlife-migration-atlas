/** Species, filter, and the providers that can actually place them. */
export function framePublishKey(speciesIds: readonly string[], filter: string, providerIds: readonly string[]): string {
  return `${speciesIds.join(',')}|${filter}|${[...providerIds].sort().join(',')}`;
}

/**
 * A paused day is one geometry. Playing still publishes every fractional day.
 * Provider ids are part of the key so a frame skipped while the catalog was
 * empty is published again once those providers exist.
 */
export function shouldPublishFrame(
  published: { key: string; day: number },
  now: { key: string; day: number; playing: boolean },
): boolean {
  const dayMoved = now.playing ? now.day !== published.day : Math.floor(now.day) !== Math.floor(published.day);
  return dayMoved || now.key !== published.key;
}
