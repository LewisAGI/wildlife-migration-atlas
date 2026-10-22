import type { ReactNode } from 'react';

type IconProps = { className?: string };

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconPlus() {
  return (
    <Svg>
      <path d="M12 5v14M5 12h14" {...stroke} />
    </Svg>
  );
}

export function IconMinus() {
  return (
    <Svg>
      <path d="M5 12h14" {...stroke} />
    </Svg>
  );
}

export function IconChevron({ direction }: { direction: 'left' | 'right' }) {
  const d = direction === 'left' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6';
  return (
    <Svg>
      <path d={d} {...stroke} />
    </Svg>
  );
}

export function IconPlay() {
  return (
    <Svg>
      <path d="M8 5l12 7-12 7z" fill="currentColor" />
    </Svg>
  );
}

export function IconPause() {
  return (
    <Svg>
      <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
    </Svg>
  );
}

export function IconPlayback() {
  return (
    <Svg>
      <path d="M5 16c2.2-3.4 4.4-3.4 7 0s4.8 3.4 7 0" {...stroke} />
      <circle cx="12" cy="8" r="2.1" fill="currentColor" />
    </Svg>
  );
}

export function IconSpecies() {
  return (
    <Svg>
      <circle cx="8" cy="9" r="2.1" fill="currentColor" />
      <circle cx="15.5" cy="8" r="1.6" fill="currentColor" />
      <circle cx="13" cy="14.5" r="2.4" fill="currentColor" />
    </Svg>
  );
}

export function IconCompare() {
  return (
    <Svg>
      <circle cx="9" cy="12" r="4.2" {...stroke} />
      <circle cx="15" cy="12" r="4.2" {...stroke} />
    </Svg>
  );
}

export function IconLoop() {
  return (
    <Svg>
      <path d="M7 8h8a4 4 0 0 1 0 8H9" {...stroke} />
      <path d="M10 5L7 8l3 3" {...stroke} />
    </Svg>
  );
}

export function IconSpeed({ bars }: { bars: number }) {
  return (
    <Svg>
      {Array.from({ length: bars }, (_, index) => (
        <path key={index} d={`M${6 + index * 4} ${16 - index * 3}v${6 + index}`} {...stroke} />
      ))}
    </Svg>
  );
}

export type { IconProps };
