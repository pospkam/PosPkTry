'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, XCircle, Clock, Activity, Cpu,
  ArrowLeft, ArrowUpRight, Users, BarChart3, Shield, Zap,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

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

const AGENT_META: Record<string, { name: string; role: string; model: string; color: string }> = {
  admin:      { name: 'Администратор', role: 'Операционный директор',      model: 'Gemini 2.0 Flash',    color: 'var(--accent)' },
  legal:      { name: 'Юрист',         role: 'Юрисконсульт',               model: 'GPT-4o Mini',         color: 'var(--ocean)' },
  security:   { name: 'Безопасность',  role: 'Директор безопасности',       model: 'Mistral Small 3.2',   color: 'var(--danger)' },
  hacker:     { name: 'Рост',          role: 'Директор по росту',           model: 'DeepSeek Chat V3',    color: '#E67E22' },
  rescue:     { name: 'Спасатель',     role: 'Начальник SAR',               model: 'LLaMA 3.3 70B',       color: 'var(--warning)' },
  eco:        { name: 'Эколог',        role: 'Эколог-аналитик',             model: 'Gemini 2.5 Flash',    color: 'var(--success)' },
  content:    { name: 'Аудит',         role: 'Контент-директор',            model: 'Gemini 2.0 Flash',    color: 'var(--text-muted)' },
  quality:    { name: 'Качество',      role: 'Директор по качеству',        model: 'GPT-4o Mini',         color: 'var(--success)' },
  planning:   { name: 'Плановик',      role: 'Стратегический плановик',     model: 'Claude Sonnet 4.6',   color: 'var(--ocean)' },
  evo:        { name: 'Эволюция',      role: 'Архитектор платформы',        model: 'Claude Sonnet 4.6',   color: 'var(--accent)' },
  finance:    { name: 'Финансы',       role: 'CFO',                         model: 'DeepSeek Chat V3',    color: 'var(--ocean)' },
  infra:      { name: 'Инфраструктура',role: 'SRE / DevOps',                model: 'Gemini 2.0 Flash',    color: 'var(--ocean)' },
  vibe_coder: { name: 'Разработчик',   role: 'Vibe Coder',                  model: 'Claude Sonnet 4.6',   color: 'var(--accent)' },
};

const ACTION_LABELS: Record<string, string> = {
  code_change:          'Изменение кода',
  price_change:         'Изменение цен',
  ui_copy_change:       'Обновление контента',
  prompt_optimize:      'Оптимизация AI-промптов',
  sql_query_fix:        'Правка SQL-запросов',
  booking_rule_change:  'Правило бронирования',
  commission_change:    'Изменение комиссии',
  bulk_notify:          'Массовое уведомление',
  schedule_suggest:     'Управление расписанием',
  tour_auto_cancel:     'Управление туром',
  api_scope_expand:     'Расширение API',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (h < 1) return 'только что';
  if (h < 24) return `${h} ч назад`;
  if (d < 7) return `${d} дн назад`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    approved: { label: 'Принято',    icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'var(--success)' },
    rejected: { label: 'Отклонено', icon: <XCircle      className="h-3.5 w-3.5" />, color: 'var(--danger)' },
    pending:  { label: 'Ожидает',   icon: <Clock        className="h-3.5 w-3.5" />, color: 'var(--warning)' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white"
      style={{ background: s.color }}
    >
      {s.icon}{s.label}
    </span>
  );
}

export default function TransparencyClient() {
  const [data, setData] = useState<TransparencyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/transparency')
      .then(r => r.json())
      .then((d: TransparencyData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const stats = data?.stats;
  const decisions = data?.recentDecisions ?? [];
  const activeAgents = data?.activeAgents ?? [];

  return (
    <>
      <Header />
      <main className="ds-page min-h-screen pt-20">

        {/* ── Page header ─────────────────────────────────── */}
        <div className="border-b border-[var(--border)] pb-10 pt-10">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)]"
          >
            <ArrowLeft className="h-4 w-4" /> На главную
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  AI-Assisted · Owner-Controlled
                </span>
              </div>
              <h1 className="font-playfair text-4xl font-bold text-[var(--text-primary)] md:text-5xl">
                Transparency Hub
              </h1>
              <p className="mt-3 max-w-xl text-[var(--text-secondary)]">
                Кузьмич, внутренние AI-модули и фоновые автоматизации помогают платформе работать быстрее.
                Здесь публично видно, какие инициативы предлагались, что было одобрено и что реально исполнено.
              </p>
            </div>
            <Link
              href="/hub/admin/agents"
              className="hidden shrink-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--accent)] md:flex"
            >
              Открыть агентов
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* ── Stats row ───────────────────────────────────── */}
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: BarChart3, label: 'Решений принято',       value: stats?.approved,       color: 'var(--success)' },
            { icon: XCircle,   label: 'Решений отклонено',     value: stats?.rejected,       color: 'var(--danger)' },
            { icon: Zap,       label: 'Исполнено кодом',       value: stats?.executed,       color: 'var(--ocean)' },
            { icon: Activity,  label: 'Инициатив в этом месяце', value: stats?.thisMonth,    color: 'var(--accent)' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="ds-card p-5">
              <Icon className="mb-2 h-5 w-5" style={{ color }} />
              <p className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">
                {loading ? '—' : (value ?? 0).toLocaleString('ru-RU')}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Governance model ────────────────────────────── */}
        <div className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8">
          <h2 className="mb-6 font-playfair text-2xl font-bold text-[var(--text-primary)]">
            Как устроено управление
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Users,
                title: 'Клиентский и внутренний AI',
                desc: 'Кузьмич работает на фронте с туристом, а внутренние роли и модули помогают с аналитикой, безопасностью и инициативами.',
              },
              {
                icon: Shield,
                title: 'Ручной контроль решений',
                desc: 'AI может предложить инициативу или автоматизацию, но исполнение проходит через владельца и административный контур.',
              },
              {
                icon: Cpu,
                title: 'История инициатив',
                desc: 'Мы показываем не обещания про магическую автономию, а конкретные инициативы, статусы и факт исполнения.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
                  <Icon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Directors roster ────────────────────────────── */}
        <div className="mt-10">
          <h2 className="mb-5 font-playfair text-2xl font-bold text-[var(--text-primary)]">
            AI-роли и активные модули
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(AGENT_META).map(([id, meta]) => {
              const actAgent = activeAgents.find(a => a.agentId === id);
              return (
                <div
                  key={id}
                  className="flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: meta.color }}
                  >
                    {meta.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{meta.name}</p>
                      {actAgent && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" title="Активен за 7 дней" />
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">{meta.role}</p>
                    <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{meta.model}</p>
                  </div>
                  {actAgent && (
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium text-[var(--text-secondary)]">{actAgent.entries}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">записей</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Decision feed ───────────────────────────────── */}
        <div className="mt-10 mb-20">
          <h2 className="mb-5 font-playfair text-2xl font-bold text-[var(--text-primary)]">
            Лента решений
          </h2>
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg ds-skeleton" />
              ))}
            </div>
          )}
          {!loading && decisions.length === 0 && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-12 text-center text-sm text-[var(--text-muted)]">
              Решения и инициативы появятся здесь после первых записей в контуре управления.
            </div>
          )}
          {!loading && decisions.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] divide-y divide-[var(--border)]">
              {decisions.map((d, i) => (
                <div key={i} className="flex items-start gap-4 px-5 py-4">
                  <div className="mt-0.5 shrink-0">
                    {d.status === 'approved'
                      ? <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                      : <XCircle className="h-4 w-4 text-[var(--danger)]" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium text-[var(--text-muted)]">
                        {ACTION_LABELS[d.actionType] ?? d.actionType}
                      </span>
                      <span className="text-[var(--border)]">·</span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {AGENT_META[d.requestedBy]?.name ?? d.requestedBy}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-primary)] leading-relaxed">
                      {d.title}
                    </p>
                    {d.executionStatus === 'done' && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--success)]">
                        <Zap className="h-3 w-3" /> Исполнено
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    {statusBadge(d.status)}
                    <p className="text-[10px] text-[var(--text-muted)]">{relativeTime(d.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
      <Footer />
    </>
  );
}
