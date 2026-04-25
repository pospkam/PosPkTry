import Link from 'next/link';
import { ArrowRight, Bot } from 'lucide-react';

export function HeroBoard() {
  return (
    <section className="relative bg-[var(--bg-primary)] px-5 py-6 md:px-8 md:py-8 border-b border-[var(--border)]">
      <h1 className="mb-3 font-playfair text-3xl font-bold leading-[1.1] text-[var(--text-primary)] md:text-4xl">
        Камчатка, которую вы{' '}
        <span style={{ color: 'var(--accent)' }}>почувствуете</span> по-настоящему
      </h1>

      <p className="mb-5 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
        Вулканы, океан, медведи и термальные источники в одном маршруте.
        Поможем понять куда ехать, а если нужен тур — сведём только с проверенным оператором.
      </p>

      <div className="flex flex-wrap gap-3">
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
    </section>
  );
}
