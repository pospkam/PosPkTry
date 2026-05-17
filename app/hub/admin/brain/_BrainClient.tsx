'use client';

import { useEffect, useState, useCallback } from 'react';
import { Brain, RefreshCw, Activity, Database, Zap, AlertTriangle, CheckCircle, Clock, TrendingUp, Layers } from 'lucide-react';

interface MemoryStat {
  agent_id: string;
  total: number;
  tier1: number;
  tier2: number;
  tier3: number;
  avg_confidence: number;
  last_updated: string;
}

interface MemoryEntry {
  id: string;
  agent_id: string;
  memory_type: string;
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  memory_tier: number;
  tags: string[];
  source: string | null;
  updated_at: string;
}

interface AgentRun {
  agent_id: string;
  status: string;
  started_at: string;
  duration_ms: number | null;
  items_processed: number | null;
  errors_count: number;
  error_msg: string | null;
}

interface MemoryType {
  memory_type: string;
  count: number;
}

interface Edit {
  agent_id: string;
  edited_by: string;
  reason: string | null;
  created_at: string;
  key: string;
  memory_type: string;
}

interface Health {
  places_total: number;
  places_with_desc: number;
  places_with_views: number;
  routes_total: number;
  routes_with_desc: number;
  images_total: number;
  memory_total: number;
  memory_active: number;
  runs_24h: number;
  errors_24h: number;
}

interface BrainData {
  health: Health;
  memoryStats: MemoryStat[];
  recentMemory: MemoryEntry[];
  agentRuns: AgentRun[];
  memoryTypes: MemoryType[];
  recentEdits: Edit[];
  generatedAt: string;
}

const AGENT_COLORS: Record<string, string> = {
  kuzmich: 'var(--accent)',
  watchdog: 'var(--danger)',
  editor: 'var(--ocean)',
  scout: 'var(--success)',
  growth: 'var(--warning)',
  evo: 'var(--warning)',
};

const STATUS_ICON: Record<string, React.ElementType> = {
  success: CheckCircle,
  error: AlertTriangle,
  running: Activity,
};

const STATUS_COLOR: Record<string, string> = {
  success: 'var(--success)',
  error: 'var(--danger)',
  running: 'var(--warning)',
};

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m}м назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ч назад`;
  return `${Math.floor(h / 24)}д назад`;
}

function valuePreview(v: Record<string, unknown>): string {
  const s = JSON.stringify(v);
  return s.length > 120 ? s.slice(0, 120) + '…' : s;
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3.5">
      <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5">{label}</p>
      <span className="text-xl font-semibold font-mono" style={{ color: color ?? 'var(--text-primary)' }}>{value}</span>
      {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}

export function BrainClient() {
  const [data, setData] = useState<BrainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'feed' | 'agents' | 'types' | 'edits'>('feed');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/brain');
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center gap-2 text-[var(--text-muted)]">
        <div className="w-4 h-4 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
        <span className="text-sm">Загрузка Brain...</span>
      </div>
    );
  }

  if (!data) return <div className="p-6 text-[var(--text-muted)] text-sm">Нет данных</div>;

  const { health, memoryStats, recentMemory, agentRuns, memoryTypes, recentEdits } = data;

  return (
    <div className="p-5 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Brain className="w-4 h-4 text-[var(--accent)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Volcano Brain</h1>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            обновлено {relative(data.generatedAt)}
          </span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Обновить
        </button>
      </div>

      {/* System health */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Памяти всего" value={health.memory_total.toLocaleString('ru')} sub={`${health.memory_active} активных`} />
        <StatCard label="Мест" value={health.places_total} sub={`${health.places_with_desc} с текстом`} />
        <StatCard label="Маршрутов" value={health.routes_total} sub={`${health.routes_with_desc} с описанием`} />
        <StatCard label="Фото AI" value={health.images_total.toLocaleString('ru')} />
        <StatCard
          label="Запусков 24ч"
          value={health.runs_24h}
          sub={health.errors_24h > 0 ? `${health.errors_24h} ошибок` : 'без ошибок'}
          color={health.errors_24h > 0 ? 'var(--danger)' : 'var(--success)'}
        />
      </div>

      {/* Agent runs summary */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <span className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Агенты — последний статус
          </span>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {agentRuns.length === 0 ? (
            <p className="px-4 py-6 text-xs text-[var(--text-muted)] text-center">Нет запусков</p>
          ) : agentRuns.map(run => {
            const Icon = STATUS_ICON[run.status] ?? Clock;
            return (
              <div key={run.agent_id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors">
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: STATUS_COLOR[run.status] ?? 'var(--text-muted)' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-[var(--text-primary)]"
                      style={{ color: AGENT_COLORS[run.agent_id.split(':')[0]] ?? 'var(--text-primary)' }}>
                      {run.agent_id}
                    </span>
                    {run.items_processed != null && (
                      <span className="text-[10px] text-[var(--text-muted)]">{run.items_processed} items</span>
                    )}
                  </div>
                  {run.error_msg && (
                    <p className="text-[10px] text-[var(--danger)] truncate mt-0.5">{run.error_msg}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-[var(--text-muted)]">{relative(run.started_at)}</p>
                  {run.duration_ms != null && (
                    <p className="text-[10px] text-[var(--text-muted)] font-mono">{(run.duration_ms / 1000).toFixed(1)}s</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {([
          { id: 'feed', label: 'Память', icon: Database },
          { id: 'agents', label: 'По агентам', icon: Layers },
          { id: 'types', label: 'По типам', icon: TrendingUp },
          { id: 'edits', label: 'Изменения', icon: Zap },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 transition-colors ${
              tab === id
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      {/* Feed tab */}
      {tab === 'feed' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Последние записи памяти ({recentMemory.length})
            </span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentMemory.length === 0 ? (
              <p className="px-4 py-12 text-xs text-[var(--text-muted)] text-center">Память пуста</p>
            ) : recentMemory.map(entry => (
              <div
                key={entry.id}
                className="px-4 py-3 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          background: `color-mix(in srgb, ${AGENT_COLORS[entry.agent_id.split(':')[0]] ?? 'var(--ocean)'} 15%, transparent)`,
                          color: AGENT_COLORS[entry.agent_id.split(':')[0]] ?? 'var(--ocean)',
                        }}>
                        {entry.agent_id}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded">
                        {entry.memory_type}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-secondary)]">{entry.key}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">T{entry.memory_tier}</span>
                      <span className="text-[10px] font-mono" style={{
                        color: entry.confidence > 0.7 ? 'var(--success)' : entry.confidence > 0.4 ? 'var(--warning)' : 'var(--danger)'
                      }}>
                        {Math.round(entry.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-mono truncate">
                      {valuePreview(entry.value)}
                    </p>
                    {expandedId === entry.id && (
                      <pre className="mt-2 text-[10px] text-[var(--text-primary)] bg-[var(--bg-primary)] rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(entry.value, null, 2)}
                      </pre>
                    )}
                    {entry.tags?.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {entry.tags.map(t => (
                          <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-muted)]">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] shrink-0">{relative(entry.updated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agents tab */}
      {tab === 'agents' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Память по агентам</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {memoryStats.map(stat => (
              <div key={stat.agent_id} className="px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-semibold"
                      style={{ color: AGENT_COLORS[stat.agent_id.split(':')[0]] ?? 'var(--text-primary)' }}>
                      {stat.agent_id}
                    </span>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[10px] text-[var(--text-muted)]">T1: <b className="text-[var(--text-secondary)]">{stat.tier1}</b></span>
                      <span className="text-[10px] text-[var(--text-muted)]">T2: <b className="text-[var(--text-secondary)]">{stat.tier2}</b></span>
                      <span className="text-[10px] text-[var(--text-muted)]">T3: <b className="text-[var(--text-secondary)]">{stat.tier3}</b></span>
                      <span className="text-[10px]" style={{
                        color: stat.avg_confidence > 0.7 ? 'var(--success)' : 'var(--warning)'
                      }}>
                        ~{Math.round(stat.avg_confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{stat.total}</span>
                    <p className="text-[10px] text-[var(--text-muted)]">{relative(stat.last_updated)}</p>
                  </div>
                </div>
                {/* Tier bar */}
                <div className="mt-2 h-1.5 rounded-full bg-[var(--bg-primary)] overflow-hidden flex">
                  <div className="h-full bg-[var(--accent)]" style={{ width: `${(stat.tier1 / stat.total) * 100}%` }} />
                  <div className="h-full bg-[var(--ocean)]" style={{ width: `${(stat.tier2 / stat.total) * 100}%` }} />
                  <div className="h-full bg-[var(--text-muted)]" style={{ width: `${(stat.tier3 / stat.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Types tab */}
      {tab === 'types' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Типы памяти</span>
          </div>
          {(() => {
            const max = Math.max(...memoryTypes.map(t => t.count));
            return (
              <div className="divide-y divide-[var(--border)]">
                {memoryTypes.map(mt => (
                  <div key={mt.memory_type} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-mono text-[var(--text-primary)] w-48 truncate">{mt.memory_type}</span>
                    <div className="flex-1 h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--ocean)] transition-all"
                        style={{ width: `${(mt.count / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-[var(--text-muted)] w-8 text-right">{mt.count}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Edits tab */}
      {tab === 'edits' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Изменения памяти ({recentEdits.length}) — сигнал эволюции
            </span>
          </div>
          {recentEdits.length === 0 ? (
            <p className="px-4 py-12 text-xs text-[var(--text-muted)] text-center">Изменений не было</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {recentEdits.map((edit, i) => (
                <div key={i} className="px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-semibold"
                        style={{ color: AGENT_COLORS[edit.agent_id.split(':')[0]] ?? 'var(--ocean)' }}>
                        {edit.agent_id}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] mx-1">→</span>
                      <span className="text-[10px] font-mono text-[var(--text-secondary)]">{edit.key}</span>
                      <span className="text-[10px] text-[var(--text-muted)] ml-1">({edit.memory_type})</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">{relative(edit.created_at)}</span>
                  </div>
                  {edit.reason && (
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 italic">{edit.reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
