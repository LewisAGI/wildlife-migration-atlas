import type { Species } from '../data/schema';
import { IconButton } from './IconButton';
import { IconMonths } from './icons';
import { MonthColumn } from './MonthColumn';

interface MonthsPopoutProps {
  species: Species | null;
  open: boolean;
  day: number;
  onToggle: () => void;
  onDay: (day: number) => void;
}

export function MonthsPopout({ species, open, day, onToggle, onDay }: MonthsPopoutProps) {
  return (
    <div className="key-item">
      <IconButton id="months-button" label="Months" expanded={open} onClick={onToggle}>
        <IconMonths />
      </IconButton>
      <div id="months-panel" className="popout months-panel" hidden={!open || !species}>
        {species && <MonthColumn species={species} day={day} onDay={onDay} />}
      </div>
    </div>
  );
}
