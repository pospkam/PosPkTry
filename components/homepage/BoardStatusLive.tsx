'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, Clock, Activity, ArrowUpRight, Cpu } from 'lucide-react';

interface TransparencyData {
  stats: {
    totalDecisions: number;
    approved: number;
    rejected: number;
    pending: number;
    executed: number;
    thisMonth: number;
  } | null;
  recentDecisions: Array<{
    actionType: string;
    title: string;
    status: string;
    requestedBy: string;
    executionStatus: string | null;
    createdAt: string;
    reviewedAt: string | null;
  }>;
  activeAgents: Array<{
    agentId: string;
    entries: number;
    lastActive: string;
  }>;
  degraded?: boolean;
}

const AGENT_NAMES: Record<string, string> = {
  admin:      'Администратор',
  legal:      'Юрист',
  security:   'Безопасность',
  hacker:     'Рост',
  rescue:     'Спасатель',
  eco:        'Эколог',
  content:    'Аудит',
  quality:    'Качество',
  planning:   'Плановик',
  evo:        'Эволюция',
  finance:    'Финансы',
  infra:      'Инфраструктура',
  vibe_coder: 'Разработчик',
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  code_change:          'Изменение кода',
  price_change:         'Изменение цен',
  ui_copy_change:       'Обновление контента',
  prompt_optimize:      'Оптимизация AI',
  sql_query_fix:        'Правка запросов',
  booking_rule_change:  'Правило бронирования',
  commission_change:    'Изменение комиссии',
  bulk_notify:          'Массовое уведомление',
  schedule_suggest:     'Расписание',
  tour_auto_cancel:     'Управление туром',
  api_scope_expand:     'Расширение API',
};

function statusIcon(status: string) {
  if (status === 'approved') return <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />;
  if (status === 'rejected') return <XCircle className="h-3.5 w-3.5 text-[var(--danger)]" />;
  return <Clock className="h-3.5 w-3.5 text-[var(--warning)]" />;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (h < 1) return 'только что';
  if (h < 24) return `${h} ч назад`;
  if (d < 7) return `${d} дн назад`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function BoardStatusLive() {
  const [data, setData] = useState<TransparencyData | null>(null);

  useEffect(() => {
    fetch('/api/public/transparency')
      .then(r => r.json())
      .then((d: TransparencyData) => setData(d))
      .catch(() => {});
  }, []);

  const stats = data?.stats;
  const decisions = data?.recentDecisions ?? [];
  const activeAgents = data?.activeAgents ?? [];

  return (
    <section className="border-b border-[var(--border)] bg-[var(--bg-primary)] px-5 py-10 md:py-14">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.28em] text-[var(--text-muted)]">
              Совет директоров · Live
            </p>
            <h2 className="font-playfair text-3xl font-bold leading-tight text-[var(--text-primary)] md:text-4xl">
              Платформой управляют<br className="hidden md:block" /> AI-директора, а не скрипты
            </h2>
          </div>
          <Link
            href="/transparency"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:opacity-75 md:flex"
          >
            Полный отчёт
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1.6fr]">

          {/* Left: stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Решений всего',    value: stats?.totalDecisions ?? '—' },
              { label: 'Принято',          value: stats?.approved       ?? '—' },
              { label: 'Исполнено кодом',  value: stats?.executed       ?? '—' },
              { label: 'В этом месяце',    value: stats?.thisMonth      ?? '—' },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4"
              >
                <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)] md:text-3xl">
                  {typeof value === 'number' ? value.toLocaleString('ru-RU') : value}
                </p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">{label}</p>
              </div>
            ))}

            {/* Active agents bar */}
            <div className="col-span-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-[var(--success)]" />
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Активных агентов за 7 дней
                </span>
                <span className="ml-auto text-xs font-bold text-[var(--text-primary)]">
                  {activeAgents.length} / 13
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeAgents.map(a => (
                  <span
                    key={a.agentId}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                    {AGENT_NAMES[a.agentId] ?? a.agentId}
                  </span>
                ))}
                {activeAgents.length === 0 && (
                  <span className="text-xs text-[var(--text-muted)]">Загрузка...</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: decision feed */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Последние решения
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                Обновляется
              </span>
            </div>

            <ul className="divide-y divide-[var(--border)]">
              {decisions.length === 0 && (
                <li className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">
                  Загружаем решения совета...
                </li>
              )}
              {decisions.slice(0, 8).map((d, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-3">
                  <div className="mt-0.5 shrink-0">{statusIcon(d.status)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                      {ACTION_TYPE_LABELS[d.actionType] ?? d.actionType}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--text-muted)]">
                      {d.title}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-[var(--text-muted)]">{relativeTime(d.createdAt)}</p>
                    <p className="mt-0.5 text-[10px] font-medium" style={{
                      color: d.status === 'approved' ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {d.status === 'approved' ? 'принято' : 'отклонено'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-[var(--border)] px-4 py-3">
              <Link
                href="/transparency"
                className="flex items-center justify-center gap-2 text-xs font-medium text-[var(--accent)] hover:opacity-75"
              >
                <Cpu className="h-3.5 w-3.5" />
                Открыть Transparency Hub
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
