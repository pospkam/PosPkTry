'use client';

import Link from 'next/link';
import { ArrowRight, Bot, Shield, Cpu, BarChart3, Activity } from 'lucide-react';
import { useHomeMetrics } from '@/hooks/use-home-metrics';

const DIRECTORS = [
  { id: 'admin',    name: 'Администратор', color: 'var(--accent)' },
  { id: 'legal',    name: 'Юрист',         color: 'var(--ocean)' },
  { id: 'security', name: 'Безопасность',  color: 'var(--danger)' },
  { id: 'rescue',   name: 'Спасатель',     color: 'var(--warning)' },
  { id: 'hacker',   name: 'Рост',          color: 'var(--accent)' },
  { id: 'eco',      name: 'Эколог',        color: 'var(--success)' },
  { id: 'finance',  name: 'Финансы',       color: 'var(--ocean)' },
  { id: 'quality',  name: 'Качество',      color: 'var(--success)' },
  { id: 'planning', name: 'Плановик',      color: 'var(--ocean)' },
  { id: 'evo',      name: 'Эволюция',      color: 'var(--accent)' },
  { id: 'content',  name: 'Аудит',         color: 'var(--text-muted)' },
  { id: 'infra',    name: 'Инфраструктура', color: 'var(--ocean)' },
  { id: 'vibe_coder', name: 'Разработчик', color: 'var(--accent)' },
];

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
            13 AI-директоров · Совет активен
          </span>
        </div>

        <div className="grid gap-12 md:grid-cols-[1.15fr_0.85fr] md:gap-8">

          {/* Left: messaging */}
          <div>
            <h1 className="mb-5 font-playfair text-5xl font-bold leading-[1.08] text-[var(--text-primary)] md:text-7xl">
              Первая<br />
              автономная<br />
              <span style={{ color: 'var(--accent)' }}>платформа</span><br />
              туризма
            </h1>

            <p className="mb-8 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
              TourHab управляется советом из 13 специализированных AI-директоров.
              Они проверяют операторов, анализируют риски, принимают решения
              и эволюционируют платформу — пока вы планируете поездку.
            </p>

            <div className="mb-10 grid grid-cols-3 gap-3">
              {[
                { icon: Shield,   label: 'Верификация операторов', val: metrics.verifiedOperators },
                { icon: Activity, label: 'Маршрутов в базе',       val: metrics.routesTotal },
                { icon: BarChart3,label: 'Активных туров',          val: metrics.activeTours },
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
                Спросить Кузьмича
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/transparency"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-6 py-3.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Cpu className="h-4 w-4" />
                Как работает совет
              </Link>
            </div>
          </div>

          {/* Right: board visualization */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Совет директоров</p>
              <Link
                href="/transparency"
                className="text-[11px] text-[var(--accent)] hover:opacity-75"
              >
                подробнее
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3">
              {DIRECTORS.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-2.5 text-center"
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: d.color }}
                  >
                    {d.name.slice(0, 1)}
                  </div>
                  <p className="text-[10px] leading-tight text-[var(--text-muted)]">{d.name}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5 text-[11px] text-[var(--text-secondary)]">
              Каждые 4–24 часа совет собирается, анализирует данные и предлагает решения.
              Финальное слово — за владельцем платформы.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
