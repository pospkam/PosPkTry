import Link from 'next/link';
import { ArrowRight, Bot } from 'lucide-react';
import { HomeMapPreview } from './HomeMapPreview';

export function HeroBoard() {
  return (
    <section className="relative border-b border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="mx-auto max-w-7xl px-5 pt-6 pb-2 md:px-10 md:pt-8">
        {/* Compact top bar: badge + CTAs */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Сезон 2026
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#chat"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Bot className="h-3.5 w-3.5" />
              Подобрать маршрут
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Туры
            </Link>
          </div>
        </div>
      </div>
      {/* Full-width map */}
      <div className="mx-auto max-w-7xl px-5 pb-6 md:px-10 md:pb-8">
        <HomeMapPreview />
      </div>
    </section>
  );
}
