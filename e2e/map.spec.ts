import { expect, type Page, test } from '@playwright/test';

declare global {
  interface Window {
    __atlas: {
      map: {
        getZoom: () => number;
        getProjection: () => { type: string };
        isMoving: () => boolean;
        isSourceLoaded: (id: string) => boolean;
        project: (lngLat: [number, number]) => { x: number; y: number };
        getCenter: () => { lng: number; lat: number };
      };
      positions: { speciesId: string; trackId: string; lat: number; lng: number }[];
      routePoint: (speciesId: string) => { lng: number; lat: number } | null;
    };
  }
}

const APP_ORIGIN = 'http://127.0.0.1:4173';
let faults: string[] = [];

test.beforeEach(async ({ page }) => {
  faults = [];
  page.on('pageerror', (error) => faults.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (ignorableConsole(text)) return;
    faults.push(`console: ${text}`);
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (!isAppAsset(url)) return;
    faults.push(`http ${response.status()}: ${url}`);
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!isAppAsset(url)) return;
    faults.push(`failed: ${url} ${request.failure()?.errorText ?? ''}`);
  });
  await page.goto('/');
  await page.locator('#app[data-ready="true"]').waitFor();
  await page.waitForFunction(() => window.__atlas.map.getProjection().type === 'globe');
  await page.waitForFunction(() => window.__atlas.map.isSourceLoaded('land'));
  await page.waitForFunction(() => !window.__atlas.map.isMoving());
});

test.afterEach(() => {
  expect(faults, faults.join('\n')).toEqual([]);
});

test('globe, land, and icon labels', async ({ page }) => {
  await expect(page.locator('#map canvas')).toBeVisible();
  await expect(page.locator('#app')).toHaveAttribute('data-projection', 'globe');
  await expect(page.locator('.maplibregl-ctrl-attrib')).toBeVisible();
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('NASA Blue Marble');
  await expectNoHorizontalScroll(page);
  const attributionClear = await page.evaluate(() => {
    const attrib = document.querySelector('.maplibregl-ctrl-attrib')?.getBoundingClientRect();
    const time = document.querySelector('.time')?.getBoundingClientRect();
    if (!attrib || !time) return false;
    return attrib.bottom <= time.top + 1;
  });
  expect(attributionClear).toBe(true);
  for (const name of ['Play', 'Zoom in', 'Zoom out', 'Species', 'Playback', 'Previous day', 'Next day']) {
    const button = page.getByRole('button', { name, exact: true });
    await expect(button).toHaveAttribute('aria-label', name);
    await expect(button).toHaveAttribute('title', name);
  }
  const boxes = await page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      if (!rect) return null;
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    };
    return { zoom: box('.zoom'), time: box('.time'), species: box('.key-wrap') };
  });
  expect(boxes.zoom && boxes.time && boxes.species).toBeTruthy();
  expect(overlaps(boxes.zoom!, boxes.time!)).toBe(false);
  expect(overlaps(boxes.zoom!, boxes.species!)).toBe(false);
  expect(overlaps(boxes.time!, boxes.species!)).toBe(false);
});

test('scrubber, keyboard, play, and loop', async ({ page }) => {
  await page.locator('#slider').fill('20');
  await expect.poll(() => dayOf(page)).toBe(20);
  await dragSlider(page, 0.72);
  await expect.poll(() => dayOf(page)).toBeGreaterThan(100);

  await page.locator('#slider').fill('40');
  await page.locator('#app').focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => dayOf(page)).toBe(41);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => dayOf(page)).toBe(40);

  await page.locator('#slider').fill('10');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => dayOf(page)).toBeGreaterThan(12);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-playing', '0');

  await page.getByRole('button', { name: 'Playback' }).click();
  await expect(page.getByRole('button', { name: 'Loop' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await page.locator('#slider').fill('360');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => dayOf(page)).toBeLessThan(40);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
});

test('markers move, tern winters south, compare and the info sheet', async ({ page }, testInfo) => {
  await page.locator('#slider').fill('30');
  const early = await herd(page);
  await page.locator('#slider').fill('200');
  const later = await herd(page);
  expect(Math.abs(early.lat - later.lat) + Math.abs(early.lng - later.lng)).toBeGreaterThan(0.4);

  await page.getByRole('button', { name: 'Species' }).click();
  await page.getByRole('button', { name: 'Arctic tern' }).click();
  await page.locator('#slider').fill('15');
  await expect.poll(async () => ternLats(page)).toEqual(expect.arrayContaining([expect.any(Number)]));
  const lats = await ternLats(page);
  expect(lats.length).toBe(2);
  lats.forEach((lat) => expect(lat).toBeLessThan(-50));

  const before = await centerOf(page);
  await page.getByRole('button', { name: 'Species' }).click();
  await page.getByRole('button', { name: 'Wildebeest' }).click();
  await expect.poll(async () => {
    const center = await centerOf(page);
    return Math.abs(center.lng - before.lng) > 4 || Math.abs(center.zoom - before.zoom) > 0.4;
  }).toBe(true);
  await page.waitForFunction(() => !window.__atlas.map.isMoving());

  await page.getByRole('button', { name: 'Species' }).click();
  await page.getByRole('button', { name: 'Compare' }).click();
  await expect.poll(async () => idsOf(page)).toEqual(expect.arrayContaining(['wildebeest', 'arctic-tern']));

  await page.locator('#slider').fill('15');
  await page.waitForFunction(() => !window.__atlas.map.isMoving());
  await clickSpecies(page, 'wildebeest');
  const sheet = testInfo.project.name !== 'desktop';
  const card = sheet ? page.locator('.event-sheet') : page.locator('.maplibregl-popup');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Wildebeest');
  await expect(card.locator('.approx-mark')).toHaveText('approximate');
  await page.locator(sheet ? '.sheet-close' : '.maplibregl-popup-close-button').click();
  await expect(card).toHaveCount(0);

  await clickRoute(page, 'wildebeest');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Connochaetes taurinus');
});

async function dayOf(page: Page): Promise<number> {
  const value = await page.locator('#app').getAttribute('data-day');
  return Number(value);
}

async function herd(page: Page): Promise<{ lat: number; lng: number }> {
  return page.evaluate(() => {
    const position = window.__atlas.positions.find((item) => item.speciesId === 'wildebeest');
    if (!position) throw new Error('missing wildebeest');
    return { lat: position.lat, lng: position.lng };
  });
}

async function ternLats(page: Page): Promise<number[]> {
  return page.evaluate(() =>
    window.__atlas.positions.filter((item) => item.speciesId === 'arctic-tern').map((item) => item.lat),
  );
}

async function idsOf(page: Page): Promise<string[]> {
  return page.evaluate(() => [...new Set(window.__atlas.positions.map((item) => item.speciesId))]);
}

async function centerOf(page: Page): Promise<{ lng: number; lat: number; zoom: number }> {
  return page.evaluate(() => {
    const center = window.__atlas.map.getCenter();
    return { lng: center.lng, lat: center.lat, zoom: window.__atlas.map.getZoom() };
  });
}

async function dragSlider(page: Page, fraction: number) {
  const slider = page.locator('#slider');
  const box = await slider.boundingBox();
  if (!box) throw new Error('missing slider');
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 6, y);
  await page.mouse.down();
  await page.mouse.move(box.x + Math.max(8, box.width * fraction), y, { steps: 10 });
  await page.mouse.up();
}

async function clickSpecies(page: Page, speciesId: string) {
  const target = await page.evaluate((id) => {
    const position = window.__atlas.positions.find((item) => item.speciesId === id);
    if (!position) return null;
    const map = window.__atlas.map as Window['__atlas']['map'] & {
      queryRenderedFeatures: (point: [number, number], options: { layers: string[] }) => unknown[];
    };
    const origin = map.project([position.lng, position.lat]);
    const canvas = document.querySelector('#map canvas');
    const layer = `marker-${id}`;
    for (let dy = -28; dy <= 28; dy += 4) {
      for (let dx = -28; dx <= 28; dx += 4) {
        const x = origin.x + dx;
        const y = origin.y + dy;
        const top = document.elementFromPoint(x, y);
        if (top !== canvas) continue;
        if (map.queryRenderedFeatures([x, y], { layers: [layer] }).length > 0) return { x, y, pin: null as string | null };
      }
    }
    const top = document.elementFromPoint(origin.x, origin.y);
    const pin = top instanceof Element ? top.closest('.pin') : null;
    return { x: origin.x, y: origin.y, pin: pin?.getAttribute('aria-label') ?? null };
  }, speciesId);
  if (!target) throw new Error(`missing ${speciesId}`);
  if (target.pin) {
    await page.getByRole('button', { name: target.pin, exact: true }).click();
    return;
  }
  await page.locator('#map canvas').click({ position: { x: target.x, y: target.y } });
}

async function clickRoute(page: Page, speciesId: string) {
  const point = await page.evaluate((id) => {
    const route = window.__atlas.routePoint(id);
    if (!route) return null;
    const map = window.__atlas.map as Window['__atlas']['map'] & {
      queryRenderedFeatures: (point: [number, number], options: { layers: string[] }) => unknown[];
    };
    const origin = map.project([route.lng, route.lat]);
    const canvas = document.querySelector('#map canvas');
    const layer = `route-hit-${id}`;
    for (let dy = -48; dy <= 48; dy += 4) {
      for (let dx = -48; dx <= 48; dx += 4) {
        const x = origin.x + dx;
        const y = origin.y + dy;
        if (document.elementFromPoint(x, y) !== canvas) continue;
        if (map.queryRenderedFeatures([x, y], { layers: [layer] }).length > 0) return { x, y };
      }
    }
    return null;
  }, speciesId);
  if (!point) throw new Error(`missing route ${speciesId}`);
  await page.locator('#map canvas').click({ position: point });
}

async function expectNoHorizontalScroll(page: Page) {
  const widths = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth + 1);
}

function overlaps(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number },
): boolean {
  return a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
}

function isAppAsset(url: string): boolean {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

function ignorableConsole(text: string): boolean {
  if (/Worker failed to load/i.test(text)) return false;
  if (/gibs\.earthdata\.nasa\.gov/i.test(text)) return true;
  return /^Failed to load resource: /i.test(text) && !/127\.0\.0\.1|\/assets\//.test(text);
}
