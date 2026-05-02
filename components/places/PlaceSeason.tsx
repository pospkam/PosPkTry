import { Calendar } from 'lucide-react';

interface Props {
  openFromDate: string | null;
  openToDate: string | null;
  bestSeason: string | null;
  seasonalNotes: Record<string, string> | null;
}

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const SEASON_LABELS: Record<string, string> = {
  spring: 'Весна',
  summer: 'Лето',
  autumn: 'Осень',
  winter: 'Зима',
};

function getHighlightedMonths(from: string | null, to: string | null): boolean[] {
  if (!from && !to) return new Array(12).fill(true);
  const fromM = from ? new Date(from).getMonth() : 0;
  const toM = to ? new Date(to).getMonth() : 11;
  return Array.from({ length: 12 }, (_, i) => {
    if (fromM <= toM) return i >= fromM && i <= toM;
    return i >= fromM || i <= toM; // wraps around year end
  });
}

export default function PlaceSeason({ openFromDate, openToDate, bestSeason, seasonalNotes }: Props) {
  const hasData = openFromDate || openToDate || bestSeason || seasonalNotes;
  if (!hasData) return null;

  const highlighted = getHighlightedMonths(openFromDate, openToDate);

  return (
    <section className="max-w-3xl mx-auto px-4 space-y-4">
      <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2" style={{ fontFamily: 'var(--font-playfair)' }}>
        <Calendar className="w-5 h-5 text-[var(--accent)]" /> Когда лучше посещать
      </h2>

      {/* Month calendar */}
      <div className="grid grid-cols-12 gap-1">
        {MONTHS.map((m, i) => (
          <div key={m} className="flex flex-col items-center gap-1">
            <div
              className={`w-full rounded-sm h-6 transition-colors ${
                highlighted[i]
                  ? 'bg-[var(--accent)] opacity-90'
                  : 'bg-[var(--bg-hover)]'
              }`}
            />
            <span className={`text-[10px] font-medium ${highlighted[i] ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
              {m}
            </span>
          </div>
        ))}
      </div>

      {bestSeason && (
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{bestSeason}</p>
      )}

      {/* Per-season notes */}
      {seasonalNotes && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(seasonalNotes).map(([season, note]) => (
            <div key={season} className="ds-card p-3">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                {SEASON_LABELS[season] ?? season}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">{note}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
