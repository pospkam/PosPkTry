import Link from 'next/link';
import { ArrowRight, Bot, Map as MapIcon, Shield } from 'lucide-react';

const STEPS = [
  { icon: Bot, label: 'AI подберёт', desc: 'маршрут за 2 минуты' },
  { icon: MapIcon, label: 'Покажет на карте', desc: 'все точки поездки' },
  { icon: Shield, label: 'Сведёт с', desc: 'проверенным оператором' },
];

export function HeroBoard() {
  return (
    <section className="relative">
      <h1 className="mb-3 font-playfair text-3xl font-bold leading-[1.1] text-[var(--text-primary)] md:text-4xl">
        Камчатка, которую вы{' '}
        <span style={{ color: 'var(--accent)' }}>почувствуете</span> по-настоящему
      </h1>

      <p className="mb-4 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
        Не маркетплейс туров — ваш персональный инструмент планирования.
        AI, интерактивная карта и только проверенные операторы.
      </p>

      <div className="flex flex-wrap gap-3 mb-5">
        <Link
          href="/planner"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Bot className="h-4 w-4" />
          Подобрать маршрут
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Смотреть туры
        </Link>
      </div>

      {/* 3 шага — визуальное доказательство инструмента */}
      <div className="grid grid-cols-3 gap-2">
        {STEPS.map(({ icon: Icon, label, desc }, i) => (
          <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--accent)]/10">
              <Icon className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--text-primary)] leading-tight">{label}</p>
              <p className="text-[10px] text-[var(--text-muted)] leading-tight">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
