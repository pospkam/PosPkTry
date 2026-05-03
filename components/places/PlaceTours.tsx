'use client';

import Link from 'next/link';
import { Compass, ChevronRight } from 'lucide-react';
import type { PlaceTour } from './types';

interface Props {
  tours: PlaceTour[];
}

export default function PlaceTours({ tours }: Props) {
  if (!tours.length) return null;

  return (
    <section className="max-w-3xl mx-auto px-4 space-y-3">
      <h2
        className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2"
        style={{ fontFamily: 'var(--font-playfair)' }}
      >
        <Compass className="w-5 h-5 text-[var(--accent)]" /> Туры к этому месту
      </h2>
      <div className="space-y-2">
        {tours.map(t => (
          <Link
            key={t.id}
            href={`/marketplace/tours/${t.id}`}
            className="ds-card p-4 flex items-center justify-between gap-3 hover:border-[var(--accent)] transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                {t.title}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                <span>{t.operatorName}</span>
                {t.durationDays != null && <span>{t.durationDays} дн.</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-bold text-[var(--accent)]">
                от {t.basePrice.toLocaleString('ru-RU')} ₽
              </span>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
