'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Wallet, Users, ShieldAlert, ArrowRight } from 'lucide-react';
import { useHomeMetrics } from '@/hooks/use-home-metrics';

const DAYS_OPTIONS = [3, 5, 7, 10];
const BUDGET_OPTIONS = [
  { key: 'budget', label: 'до 80 000' },
  { key: 'mid', label: '80 000 - 180 000' },
  { key: 'premium', label: '180 000+' },
] as const;
const STYLE_OPTIONS = [
  { key: 'family', label: 'Семья' },
  { key: 'active', label: 'Активный' },
  { key: 'expedition', label: 'Экспедиция' },
] as const;

export function MissionConsole() {
  const [days, setDays] = useState<number>(5);
  const [budget, setBudget] = useState<(typeof BUDGET_OPTIONS)[number]['key']>('mid');
  const [style, setStyle] = useState<(typeof STYLE_OPTIONS)[number]['key']>('active');
  const { metrics, loading } = useHomeMetrics();

  const query = useMemo(() => {
    const budgetText = BUDGET_OPTIONS.find((b) => b.key === budget)?.label ?? '80 000 - 180 000';
    const styleText = STYLE_OPTIONS.find((s) => s.key === style)?.label ?? 'Активный';
    return `Хочу план поездки на Камчатку: ${days} дней, бюджет ${budgetText}, формат ${styleText}. Подбери 3 варианта туров с ценами и рисками.`;
  }, [days, budget, style]);

  const aiAssistantHref = `/ai-assistant?query=${encodeURIComponent(query)}`;

  return (
    <section className="px-5 py-10 md:py-12 bg-[var(--bg-primary)] border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 md:p-5">
          <div className="mb-4">
            <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--text-muted)] mb-2">Собрать задачу поездки</p>
            <h2 className="font-playfair text-2xl md:text-3xl font-bold text-[var(--text-primary)] leading-tight">
              План за 30 секунд
            </h2>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              {loading
                ? 'Обновляем операционные метрики...'
                : `Live: ${metrics.routesTotal.toLocaleString('ru-RU')} маршрутов, ${metrics.verifiedOperators.toLocaleString('ru-RU')} проверенных операторов`}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-2 inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Длительность</p>
              <div className="flex flex-wrap gap-2">
                {DAYS_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      days === d
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {d} дн.
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-[var(--text-muted)] mb-2 inline-flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Бюджет</p>
              <div className="flex flex-wrap gap-2">
                {BUDGET_OPTIONS.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setBudget(b.key)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      budget === b.key
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-[var(--text-muted)] mb-2 inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Формат</p>
              <div className="flex flex-wrap gap-2">
                {STYLE_OPTIONS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStyle(s.key)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      style === s.key
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={aiAssistantHref}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Подобрать 3 варианта
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Каталог туров
            </Link>
          </div>
        </div>

        <aside className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 md:p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Контроль рисков перед бронированием</h3>
          <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
            <li className="flex items-start gap-2"><ShieldAlert className="w-3.5 h-3.5 mt-0.5 text-[var(--warning)]" />Проверьте активные погодные предупреждения по зоне маршрута</li>
            <li className="flex items-start gap-2"><ShieldAlert className="w-3.5 h-3.5 mt-0.5 text-[var(--warning)]" />Сравните SLA операторов и скорость подтверждения мест</li>
            <li className="flex items-start gap-2"><ShieldAlert className="w-3.5 h-3.5 mt-0.5 text-[var(--warning)]" />Уточните окно выезда и резервный день на погоду</li>
          </ul>
          <div className="mt-4 flex gap-2">
            <Link href="/safety" className="text-xs font-medium text-[var(--ocean)] hover:underline">Статус безопасности</Link>
            <span className="text-[var(--text-muted)]">·</span>
            <Link href="/operators" className="text-xs font-medium text-[var(--ocean)] hover:underline">Операторы и рейтинги</Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
