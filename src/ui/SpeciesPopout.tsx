import type { Species } from '../data/schema';
import { IconButton } from './IconButton';
import { IconCompare, IconSpecies } from './icons';

interface SpeciesPopoutProps {
  species: Species[];
  selectedId: string;
  compare: boolean;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onCompare: () => void;
}

export function SpeciesPopout({ species, selectedId, compare, open, onToggle, onSelect, onCompare }: SpeciesPopoutProps) {
  return (
    <div className="key-wrap">
      <IconButton id="species-button" label="Species" expanded={open} onClick={onToggle}>
        <IconSpecies />
      </IconButton>
      <div id="species-panel" className="popout key-panel" hidden={!open}>
        {species.map((item) => (
          <button
            key={item.id}
            type="button"
            className="icon-button species-option"
            data-tip={item.names.common}
            title={item.names.common}
            aria-label={item.names.common}
            aria-pressed={item.id === selectedId}
            onClick={() => onSelect(item.id)}
          >
            <span className="swatch" style={{ background: item.colour }} />
          </button>
        ))}
        <IconButton label="Compare" pressed={compare} onClick={onCompare}>
          <IconCompare />
        </IconButton>
      </div>
    </div>
  );
}
