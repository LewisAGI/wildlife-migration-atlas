import type { Species } from '../data/schema';
import { IconButton } from './IconButton';
import { IconSpecies } from './icons';

interface SpeciesPopoutProps {
  species: Species[];
  selectedId: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
}

export function SpeciesPopout({ species, selectedId, open, onToggle, onSelect }: SpeciesPopoutProps) {
  return (
    <div className="key-item">
      <IconButton id="species-button" label="Species" expanded={open} onClick={onToggle}>
        <IconSpecies />
      </IconButton>
      <div id="species-panel" className="popout key-panel" hidden={!open}>
        {species.map((item) => (
          <button
            key={item.id}
            type="button"
            className="icon-button species-option"
            data-tip={item.shortName}
            title={item.shortName}
            aria-label={item.shortName}
            aria-pressed={item.id === selectedId}
            onClick={() => onSelect(item.id)}
          >
            <span className="swatch" style={{ background: item.colour }} />
          </button>
        ))}
      </div>
    </div>
  );
}
