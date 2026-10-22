import type { Species } from '../data/schema';
import { IconButton } from './IconButton';
import { IconCompare } from './icons';
import { MonthColumn } from './MonthColumn';

interface ComparePopoutProps {
  species: Species[];
  selectedId: string;
  partnerId: string | null;
  open: boolean;
  day: number;
  onToggle: () => void;
  onPick: (id: string) => void;
  onDay: (day: number) => void;
}

export function ComparePopout({ species, selectedId, partnerId, open, day, onToggle, onPick, onDay }: ComparePopoutProps) {
  const selected = species.find((item) => item.id === selectedId) ?? null;
  const partner = species.find((item) => item.id === partnerId) ?? null;
  const options = [...species]
    .filter((item) => item.id !== selectedId)
    .sort((a, b) => {
      const aSame = selected && a.names.scientific === selected.names.scientific ? 0 : 1;
      const bSame = selected && b.names.scientific === selected.names.scientific ? 0 : 1;
      if (aSame !== bSame) return aSame - bSame;
      return a.shortName.localeCompare(b.shortName);
    });
  return (
    <div className="key-item">
      <IconButton id="compare-button" label="Compare" pressed={partnerId != null} expanded={open} onClick={onToggle}>
        <IconCompare />
      </IconButton>
      <div id="compare-picker" className="popout key-panel" hidden={!open || partner != null}>
        {options.map((item) => (
          <button
            key={item.id}
            type="button"
            className="icon-button species-option"
            data-tip={item.shortName}
            title={item.shortName}
            aria-label={item.shortName}
            aria-pressed={item.id === partnerId}
            onClick={() => onPick(item.id)}
          >
            <span className="swatch" style={{ background: item.colour }} />
          </button>
        ))}
      </div>
      <div id="compare-panel" className="popout compare-panel" hidden={!open || !selected || !partner}>
        {selected && partner && (
          <>
            <MonthColumn species={selected} day={day} onDay={onDay} />
            <MonthColumn species={partner} day={day} onDay={onDay} />
          </>
        )}
      </div>
    </div>
  );
}
