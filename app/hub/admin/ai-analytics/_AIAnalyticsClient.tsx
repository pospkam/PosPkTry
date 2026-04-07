'use client';

import { useEffect, useState, useCallback } from 'react';
import { MessageSquare, Users, Brain, CreditCard, RefreshCw, TrendingUp, Sparkles, BarChart2, Activity } from 'lucide-react';

interface AnalyticsData {
  sessions: {
    total: number;
    authenticated: number;
    guests: number;
    avgMessages: number;
    totalMessages: number;
  };
  trend: Array<{ day: string; total: number; auth: number }>;
  memory: {
    totalWithMemory: number;
    withNotes: number;
    avgSessions: number;
  };
  actions: Record<string, number>;
  topActivities: Array<{ activity: string; cnt: number }>;
  utmSources: Array<{ source: string; cnt: number }>;
}

function StatCard({
  icon: Icon, label, value, sub, color = 'accent',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color?: 'accent' | 'ocean' | 'success' | 'warning';
}) {
  const colorMap = {
    accent:  'text-[var(--accent)] bg-[var(--accent)]/10',
    ocean:   'text-[var(--ocean)] bg-[var(--ocean)]/10',
    success: 'text-[var(--success)] bg-[var(--success)]/10',
    warning: 'text-[var(--warning)] bg-[var(--warning)]/10',
  };
  return (
    <div className="ds-card p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg shrink-0 ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        {sub && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function TrendBar({ data }: { data: AnalyticsData['trend'] }) {
  if (!data.length) return <p className="text-xs text-[var(--text-muted)]">Нет данных</p>;
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="flex items-end gap-1 h-20 w-full">
      {data.map(d => (
        <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5 group">
          <div className="relative w-full flex flex-col justify-end" style={{ height: 64 }}>
            <div
              className="w-full rounded-t bg-[var(--accent)]/30 group-hover:bg-[var(--accent)]/50 transition-all"
              style={{ height: `${Math.max(2, (d.total / max) * 100)}%` }}
            />
            {d.auth > 0 && (
              <div
                className="absolute bottom-0 w-full rounded-t bg-[var(--accent)]"
                style={{ height: `${Math.max(2, (d.auth / max) * 100)}%` }}
              />
            )}
          </div>
          <span className="text-[9px] text-[var(--text-muted)] leading-none">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  payment_confirmed:  'Оплаты СБП',
  booking_created:    'Бронирований',
  tour_recommended:   'Рекомендаций',
  vision_analysis:    'Анализ фото',
  memory_synth:       'Синтез памяти',
  lead_qualified:     'Квалиф. лидов',
  chat_limit_reached: 'Лимит гостей',
};

const ACTION_COLORS: Record<string, string> = {
  payment_confirmed:  'text-[var(--success)]',
  booking_created:    'text-[var(--ocean)]',
  tour_recommended:   'text-[var(--accent)]',
  vision_analysis:    'text-[var(--warning)]',
  memory_synth:       'text-[var(--text-secondary)]',
  lead_qualified:     'text-[var(--ocean)]',
  chat_limit_reached: 'text-[var(--text-muted)]',
};

export default function AIAnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshed, setRefreshed] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-analytics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as AnalyticsData & { error?: string };
      if (json.error) throw new Error(json.error);
      setData(json);
      setRefreshed(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const guestPct = data
    ? Math.round((data.sessions.guests / Math.max(data.sessions.total, 1)) * 100)
    : 0;

  return (
    <div className="ds-page py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ds-h1 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[var(--accent)]" />
            Аналитика Кузьмича
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Чаты, память, конверсия — последние 30 дней
          </p>
        </div>
        <div className="flex items-center gap-3">
          {refreshed && (
            <p className="text-xs text-[var(--text-muted)]">
              {refreshed.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <button onClick={load} disabled={loading}
            className="ds-btn ds-btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Обновить
          </button>
        </div>
      </div>

      {error && (
        <div className="ds-card p-4 border-[var(--danger)] text-[var(--danger)] text-sm">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ds-card p-5 h-24 ds-skeleton" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={MessageSquare}
              label="Сессий за 30 дней"
              value={data.sessions.total.toLocaleString('ru-RU')}
              sub={`${data.sessions.totalMessages.toLocaleString()} сообщений`}
              color="accent"
            />
            <StatCard
              icon={Users}
              label="Авторизованных"
              value={data.sessions.authenticated.toLocaleString('ru-RU')}
              sub={`${guestPct}% — гости`}
              color="ocean"
            />
            <StatCard
              icon={Activity}
              label="Сред. сообщений"
              value={data.sessions.avgMessages.toFixed(1)}
              sub="за одну сессию"
              color="warning"
            />
            <StatCard
              icon={Brain}
              label="Помнит пользов."
              value={data.memory.totalWithMemory.toLocaleString('ru-RU')}
              sub={`${data.memory.withNotes} с AI-заметками`}
              color="success"
            />
          </div>

          {/* Trend + Actions */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Trend */}
            <div className="ds-card p-5">
              <h2 className="ds-h2 flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-[var(--accent)]" />
                Сессии по дням
              </h2>
              <div className="mb-3 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[var(--accent)]/30 inline-block" />
                  Всего
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[var(--accent)] inline-block" />
                  Авторизованных
                </span>
              </div>
              <TrendBar data={data.trend} />
            </div>

            {/* Actions */}
            <div className="ds-card p-5">
              <h2 className="ds-h2 flex items-center gap-2 mb-4">
                <BarChart2 size={16} className="text-[var(--ocean)]" />
                Ключевые события
              </h2>
              {Object.keys(ACTION_LABELS).length === 0 || Object.keys(data.actions).length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">Нет событий за период</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(ACTION_LABELS).map(([key, label]) => {
                    const cnt = data.actions[key] ?? 0;
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                        <span className={`text-sm font-semibold ${ACTION_COLORS[key] ?? ''}`}>
                          {cnt.toLocaleString('ru-RU')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Top interests + Memory quality */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top activities */}
            <div className="ds-card p-5">
              <h2 className="ds-h2 flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-[var(--warning)]" />
                Топ интересов пользователей
              </h2>
              {data.topActivities.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">Нет данных — память ещё накапливается</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.topActivities.map(({ activity, cnt }) => (
                    <span key={activity}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-[var(--border)] text-[var(--text-secondary)]">
                      {activity}
                      <span className="text-[var(--accent)] font-semibold">{cnt}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Memory quality */}
            <div className="ds-card p-5">
              <h2 className="ds-h2 flex items-center gap-2 mb-4">
                <Brain size={16} className="text-[var(--success)]" />
                Качество памяти
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
                    <span>Пользователей с заметками</span>
                    <span>{data.memory.withNotes} / {data.memory.totalWithMemory}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--success)] transition-all"
                      style={{
                        width: `${Math.round(
                          (data.memory.withNotes / Math.max(data.memory.totalWithMemory, 1)) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
                    <span>Авторизованных в чате</span>
                    <span>{data.sessions.authenticated} / {data.sessions.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--ocean)] transition-all"
                      style={{
                        width: `${Math.round(
                          (data.sessions.authenticated / Math.max(data.sessions.total, 1)) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-hover)]">
                  <CreditCard size={14} className="text-[var(--success)] shrink-0" />
                  <p className="text-xs text-[var(--text-secondary)]">
                    Платежей СБП (Точка): <strong className="text-[var(--success)]">{(data.actions['payment_confirmed'] ?? 0).toLocaleString('ru-RU')}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* UTM Sources — показываем только когда есть данные */}
          {data.utmSources.length > 0 && (
            <div className="ds-card p-5">
              <h2 className="ds-h2 flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-[var(--accent)]" />
                Источники трафика в чат
              </h2>
              <div className="space-y-2">
                {data.utmSources.map(({ source, cnt }) => {
                  const maxCnt = data.utmSources[0]?.cnt ?? 1;
                  return (
                    <div key={source} className="flex items-center gap-3">
                      <span className="text-xs text-[var(--text-secondary)] w-24 truncate shrink-0">{source}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all"
                          style={{ width: `${Math.round((cnt / maxCnt) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[var(--text-primary)] w-8 text-right">{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
