import type { ReactNode } from 'react';

interface IconButtonProps {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  pressed?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** Icon control. The name is the tooltip, the title, and the accessible name. */
export function IconButton({ label, children, onClick, pressed, expanded, disabled, id, className }: IconButtonProps) {
  return (
    <button
      type="button"
      id={id}
      className={className ? `icon-button ${className}` : 'icon-button'}
      data-tip={label}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
