'use client';

import Link from 'next/link';
import { ArrowRight, Bot, ShieldCheck, Activity, MapPinned, Users } from 'lucide-react';
import { useHomeMetrics } from '@/hooks/use-home-metrics';

const QUICK_ACTIONS = [
  { href: '/routes', label: 'Открыть каталог маршрутов' },
  { href: '/marketplace', label: 'Сравнить туры и цены' },
  { href: '/map', label: 'Посмотреть карту мест' },
  { href: '/safety', label: 'Проверить безопасность' },
];

export function HeroCompact() {
  const { metrics } = useHomeMetrics();

  const signals = [
    { label: 'Маршрутов в базе', value: metrics.routesTotal.toLocaleString('ru-RU') },
    { label: 'Проверенных операторов', value: metrics.verifiedOperators.toLocaleString('ru-RU') },
    { label: 'Активных туров', value: metrics.activeTours.toLocaleString('ru-RU') },
    { label: 'Открытых броней', value: metrics.openBookings.toLocaleString('ru-RU') },
  ];

  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--bg-primary)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 500px at -10% -20%, color-mix(in srgb, var(--ocean) 18%, transparent) 0%, transparent 60%), radial-gradient(900px 500px at 110% -10%, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 60%)',
        }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-8 px-5 pb-10 pt-24 md:grid-cols-[1.1fr_0.9fr] md:px-10 md:pt-28">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5">
            <Activity className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--text-secondary)]">
              Камчатка · 2026 · Платформа онлайн
            </span>
          </div>

          <h1 className="mb-4 font-playfair text-4xl font-bold leading-tight text-[var(--text-primary)] md:text-6xl">
            Панель путешествия
            <br />
            по Камчатке
          </h1>

          <p className="mb-7 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
            Планирование, безопасность, подбор туров и проверенные операторы
            в одном интерфейсе без лишнего шума.
          </p>

          <div className="mb-8 flex flex-wrap gap-2.5">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {action.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#chat"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Bot className="h-4 w-4" />
              Подобрать 3 тура
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/routes"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Каталог маршрутов
            </Link>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 md:p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Операционный статус</h2>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <span className="h-2 w-2 rounded-full bg-[var(--success)]" /> Live
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {signals.map((signal) => (
              <div key={signal.label} className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                <p className="mb-1 text-xl font-bold leading-none text-[var(--text-primary)] md:text-2xl">{signal.value}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{signal.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-1 grid gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-secondary)]">
              <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
              Верификация операторов активна
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-secondary)]">
              <MapPinned className="h-4 w-4 text-[var(--ocean)]" />
              Геоданные маршрутов обновлены
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-secondary)]">
              <Users className="h-4 w-4 text-[var(--accent)]" />
              Активные операторы за 14 дней: {metrics.activeOperators.toLocaleString('ru-RU')}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
