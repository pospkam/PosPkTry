import Link from 'next/link';
import { Route, ChevronRight } from 'lucide-react';
import type { PlaceRoute } from './types';

interface Props {
  routes: PlaceRoute[];
  placeId: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-[var(--success)]',
  medium: 'text-[var(--warning)]',
  hard: 'text-[var(--danger)]',
};

export default function PlaceRoutes({ routes, placeId: _ }: Props) {
  // Route_waypoints not populated yet — block hidden when empty
  if (!routes.length) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[PlaceRoutes] no routes via waypoints — block hidden');
    }
    return null;
  }

  return (
    <section className="max-w-3xl mx-auto px-4 space-y-3">
      <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2" style={{ fontFamily: 'var(--font-playfair)' }}>
        <Route className="w-5 h-5 text-[var(--accent)]" /> Маршруты через это место
      </h2>
      <div className="space-y-2">
        {routes.map(r => (
          <Link
            key={r.id}
            href={`/routes/detail/${r.id}`}
            className="ds-card p-4 flex items-center justify-between gap-3 hover:border-[var(--accent)] transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                {r.title}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                {r.difficulty && (
                  <span className={DIFFICULTY_COLORS[r.difficulty] ?? ''}>
                    {r.difficulty}
                  </span>
                )}
                {r.distanceKm != null && <span>{r.distanceKm} км</span>}
                {r.durationHours != null && <span>{r.durationHours} ч</span>}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}
