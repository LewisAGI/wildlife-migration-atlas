import type { Species } from '../data/schema';
import { monthIndexForDay, monthWord } from '../data/months';
import { IconButton } from './IconButton';

export function MonthColumn({
  species,
  day,
  onDay,
}: {
  species: Species;
  day: number;
  onDay: (day: number) => void;
}) {
  const active = monthIndexForDay(day);
  return (
    <div className="month-column" data-species={species.id}>
      <p className="popup-title">{species.shortName}</p>
      <p className="popup-latin">{species.names.scientific}</p>
      {species.iucn && <p className="iucn-mark">{species.iucn}</p>}
      {species.datasetLicence && <p className="licence-mark">{species.datasetLicence}</p>}
      <p className="popup-place">{species.distance}</p>
      <div className="month-stack">
        {species.months.map((month) => {
          const word = monthWord(month.status);
          const glyph = word === 'no data' ? 'no-data' : word;
          return (
            <IconButton
              key={month.month}
              className={`month-option is-${glyph}`}
              label={`${month.name}, ${word}`}
              pressed={month.month === active}
              onClick={() => {
                if (month.lat == null) return;
                onDay(month.day);
              }}
            >
              <span className="mark-glyph" />
            </IconButton>
          );
        })}
      </div>
    </div>
  );
}
