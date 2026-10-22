import type { StatusFilter } from '../motion/interpolate';
import { IconButton } from './IconButton';
import { IconAll, IconEstimated, IconLayers, IconObserved, IconThreat, IconVegetation } from './icons';

interface Stage {
  day: number;
  label: string;
}

interface LayerPopoutProps {
  open: boolean;
  overlay: boolean;
  filter: StatusFilter;
  threats: boolean;
  stages: Stage[];
  onToggle: () => void;
  onOverlay: () => void;
  onFilter: (filter: StatusFilter) => void;
  onThreats: () => void;
  onStage: (day: number) => void;
}

export function LayerPopout({
  open,
  overlay,
  filter,
  threats,
  stages,
  onToggle,
  onOverlay,
  onFilter,
  onThreats,
  onStage,
}: LayerPopoutProps) {
  return (
    <div className="key-item">
      <IconButton id="layer-button" label="Layers" expanded={open} onClick={onToggle}>
        <IconLayers />
      </IconButton>
      <div id="layer-popout" className="popout layer-popout" hidden={!open}>
        <IconButton label="MODIS NDVI, observed monthly" pressed={overlay} onClick={onOverlay}>
          <IconVegetation />
        </IconButton>
        <IconButton label="All months" pressed={filter === 'all'} onClick={() => onFilter('all')}>
          <IconAll />
        </IconButton>
        <IconButton label="Observed months" pressed={filter === 'observed'} onClick={() => onFilter('observed')}>
          <IconObserved />
        </IconButton>
        <IconButton label="Estimated months" pressed={filter === 'estimated'} onClick={() => onFilter('estimated')}>
          <IconEstimated />
        </IconButton>
        <IconButton label="Threats" pressed={threats} onClick={onThreats}>
          <IconThreat />
        </IconButton>
        {stages.map((stage) => (
          <IconButton key={`${stage.day}-${stage.label}`} label={stage.label} onClick={() => onStage(stage.day)}>
            <span className="mark-glyph is-stage" />
          </IconButton>
        ))}
      </div>
    </div>
  );
}
