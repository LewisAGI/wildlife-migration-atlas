/** Portrait uses the bottom sheet. Short landscape uses the side sheet. */
export function prefersSheet(): boolean {
  if (window.innerHeight > window.innerWidth) return true;
  return window.innerHeight <= 800 && window.innerWidth <= 1366;
}

export function placeSheet(sheet: HTMLElement): void {
  const margin = 12;
  const gap = 8;
  const wordmark = visible('.wordmark');
  const time = document.querySelector('.time');
  const timeRect = time?.classList.contains('is-covered') ? null : visible('.time');
  const top = Math.round((wordmark ? wordmark.bottom : 40) + gap);
  const side = window.innerWidth > window.innerHeight && window.innerHeight <= 800 && window.innerWidth <= 1366;
  sheet.classList.remove('is-covering');
  if (side) {
    clearSheetChrome();
    const bottomEdge = Math.round((timeRect?.top ?? window.innerHeight - 112) - gap);
    const width = Math.min(360, Math.floor(window.innerWidth * 0.42));
    const height = Math.max(140, bottomEdge - top);
    sheet.style.left = `${margin}px`;
    sheet.style.right = 'auto';
    sheet.style.top = `${top}px`;
    sheet.style.bottom = 'auto';
    sheet.style.width = `${width}px`;
    sheet.style.maxWidth = 'none';
    sheet.style.height = `${height}px`;
    sheet.style.maxHeight = `${height}px`;
    raiseZoomAboveSheet(sheet);
    return;
  }
  const shortPortrait = window.innerHeight > window.innerWidth && window.innerHeight <= 670;
  if (shortPortrait) {
    sheet.classList.add('is-covering');
    document.querySelector('.time')?.classList.add('is-covered');
    document.querySelector('.key-wrap')?.classList.add('is-covered');
    document.querySelector('.maplibregl-ctrl-bottom-right')?.classList.add('is-covered');
  } else {
    clearSheetChrome();
  }
  const controlTop = timeRect && !shortPortrait ? timeRect.top : window.innerHeight - margin;
  const bottom = shortPortrait ? margin : Math.max(margin, window.innerHeight - controlTop + gap);
  const available = window.innerHeight - bottom - top;
  const maxHeight = Math.min(window.innerHeight * 0.46, Math.max(120, available));
  sheet.style.left = `${margin}px`;
  sheet.style.right = `${margin}px`;
  sheet.style.top = 'auto';
  sheet.style.bottom = `${bottom}px`;
  sheet.style.width = 'auto';
  sheet.style.height = 'auto';
  sheet.style.maxWidth = 'none';
  sheet.style.maxHeight = `${Math.floor(maxHeight)}px`;
  raiseZoomAboveSheet(sheet);
}

export function clearSheetChrome(): void {
  document.querySelector('.time')?.classList.remove('is-covered');
  document.querySelector('.key-wrap')?.classList.remove('is-covered');
  document.querySelector('.maplibregl-ctrl-bottom-right')?.classList.remove('is-covered');
  const zoomEl = document.querySelector<HTMLElement>('.zoom');
  if (!zoomEl) return;
  zoomEl.classList.remove('is-raised', 'is-hidden');
  zoomEl.style.top = '';
  zoomEl.style.bottom = '';
  zoomEl.style.transform = '';
}

/** A bottom sheet on a phone runs through the zoom column. Lift the zoom clear of it. */
function raiseZoomAboveSheet(sheet: HTMLElement): void {
  const zoomEl = document.querySelector<HTMLElement>('.zoom');
  const sheetBox = sheet.getBoundingClientRect();
  if (!zoomEl || sheetBox.height < 2) return;
  const zoom = zoomEl.getBoundingClientRect();
  const overlaps = zoom.top < sheetBox.bottom - 1 && zoom.bottom > sheetBox.top - 1 && zoom.height > 2;
  if (!overlaps) return;
  const wordmark = document.querySelector('.wordmark')?.getBoundingClientRect();
  const topLimit = (wordmark && wordmark.height > 2 ? wordmark.bottom : 40) + 8;
  const nextTop = sheetBox.top - 8 - zoom.height;
  if (nextTop < topLimit) {
    zoomEl.classList.add('is-hidden');
    zoomEl.classList.remove('is-raised');
    zoomEl.style.transform = 'none';
    zoomEl.style.top = '-200px';
    zoomEl.style.bottom = 'auto';
    return;
  }
  zoomEl.classList.remove('is-hidden');
  zoomEl.classList.add('is-raised');
  zoomEl.style.transform = 'none';
  zoomEl.style.top = `${Math.round(nextTop)}px`;
  zoomEl.style.bottom = 'auto';
}

function visible(selector: string): DOMRect | null {
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  return rect;
}
