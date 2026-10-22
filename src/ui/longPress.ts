/** Hover tips are CSS. A long press reveals the same label on touch. */
export function bindLongPress(): () => void {
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
    document.querySelectorAll('.is-long-tip').forEach((node) => node.classList.remove('is-long-tip'));
  };
  const down = (event: PointerEvent) => {
    clear();
    const element = event.target instanceof Element ? event.target : null;
    const tipHost = element?.closest<HTMLElement>('[data-tip]');
    const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (tipHost && (!fineHover || event.pointerType === 'touch')) {
      pressTimer = setTimeout(() => tipHost.classList.add('is-long-tip'), 500);
    }
  };
  document.addEventListener('pointerdown', down);
  document.addEventListener('pointerup', clear);
  document.addEventListener('pointercancel', clear);
  return () => {
    clear();
    document.removeEventListener('pointerdown', down);
    document.removeEventListener('pointerup', clear);
    document.removeEventListener('pointercancel', clear);
  };
}
