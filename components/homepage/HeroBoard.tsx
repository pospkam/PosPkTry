'use client';

import Link from 'next/link';
import { ArrowRight, Bot, Shield, Mountain, Waves, Compass } from 'lucide-react';
import { useHomeMetrics } from '@/hooks/use-home-metrics';
import { HomeMapPreview } from './HomeMapPreview';

export function HeroBoard() {
  const { metrics } = useHomeMetrics();

  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--bg-primary)]">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 600px at -5% 0%, color-mix(in srgb, var(--ocean) 12%, transparent) 0%, transparent 55%), radial-gradient(700px 500px at 105% -10%, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 55%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 pb-12 pt-24 md:px-10 md:pt-32">

        {/* Eyebrow */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" />
          <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--text-secondary)]">
            Камчатка · сезон 2026 открыт
          </span>
        </div>

        <div className="grid gap-12 md:grid-cols-[1.15fr_0.85fr] md:gap-8">

          {/* Left: messaging */}
          <div>
            <h1 className="mb-5 font-playfair text-5xl font-bold leading-[1.08] text-[var(--text-primary)] md:text-7xl">
              Камчатка,<br />
              которую вы<br />
              <span style={{ color: 'var(--accent)' }}>почувствуете</span><br />
              по-настоящему
            </h1>

            <p className="mb-8 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
              Вулканы, океан, медведи и термальные источники в одном маршруте.
              Поможем понять, куда ехать, что реально подходит по датам, уровню и бюджету,
              а если нужен тур, сведем только с проверенным оператором без обманов и серых обещаний.
            </p>

            <div className="mb-10 grid grid-cols-3 gap-3">
              {[
                { icon: Shield,   label: 'Проверенных операторов', val: metrics.verifiedOperators },
                { icon: Mountain, label: 'Маршрутов по Камчатке',   val: metrics.routesTotal },
                { icon: Waves,    label: 'Реальных туров',          val: metrics.activeTours },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
                  <Icon className="mx-auto mb-1.5 h-4 w-4 text-[var(--accent)]" />
                  <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                    {val > 0 ? val.toLocaleString('ru-RU') : '—'}
                  </p>
                  <p className="text-[10px] leading-tight text-[var(--text-muted)]">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#chat"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Bot className="h-4 w-4" />
                Подобрать маршрут
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-6 py-3.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Compass className="h-4 w-4" />
                Смотреть туры
              </Link>
            </div>
          </div>

          {/* Right: interactive map preview */}
          <HomeMapPreview />
        </div>
      </div>
    </section>
  );
}
