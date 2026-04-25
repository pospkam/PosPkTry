'use client';

import Link from 'next/link';
import { ArrowRight, Bot } from 'lucide-react';
import { HomeMapPreview } from './HomeMapPreview';

export function HeroBoard() {
  return (
    <section className="relative border-b border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-10 md:py-10">

        {/* Top row: eyebrow + CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Сезон 2026 открыт
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#chat"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Bot className="h-4 w-4" />
              Подобрать маршрут
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Смотреть туры
            </Link>
          </div>
        </div>

        {/* Map takes full width */}
        <HomeMapPreview />
      </div>
    </section>
  );
}
