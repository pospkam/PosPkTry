import Link from 'next/link';
import { ArrowRight, Bot, Sparkles } from 'lucide-react';

export function HeroBoard() {
  return (
    <section className="relative border-b border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="mx-auto max-w-5xl px-5 py-3 md:px-10 md:py-4">
        {/* Compact banner row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-[11px] font-semibold text-[var(--accent)]">
                Сезон 2026 открыт
              </span>
            </div>
            <Link
              href="/marketplace"
              className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              Смотреть туры →
            </Link>
          </div>
          <a
            href="#chat"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Bot className="h-3.5 w-3.5" />
            Подобрать маршрут
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
