'use client';

import { useState, useCallback } from 'react';
import { Sparkles, CheckCircle, XCircle, Loader2, Play, RotateCcw } from 'lucide-react';

interface BatchResult {
  name: string;
  status: 'ok' | 'error';
  chars?: number;
  error?: string;
}

interface BatchResponse {
  done: number;
  total: number;
  remaining: number;
  results: BatchResult[];
  message?: string;
}

export default function EnrichPlacesPage() {
  const [running, setRunning]     = useState(false);
  const [force, setForce]         = useState(false);
  const [batch, setBatch]         = useState(20);
  const [log, setLog]             = useState<BatchResult[]>([]);
  const [stats, setStats]         = useState({ done: 0, total: 0, batches: 0 });
  const [finished, setFinished]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const runBatch = useCallback(async (): Promise<boolean> => {
    const res = await fetch('/api/admin/enrich-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch, force }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: BatchResponse = await res.json();

    if (data.message) { setFinished(true); return false; }

    setLog(prev => [...data.results, ...prev]);
    setStats(prev => ({
      done:    prev.done + data.done,
      total:   data.total + prev.done,
      batches: prev.batches + 1,
    }));

    return (data.remaining ?? 0) > 0;
  }, [batch, force]);

  const start = useCallback(async () => {
    setRunning(true);
    setFinished(false);
    setError(null);
    setLog([]);
    setStats({ done: 0, total: 0, batches: 0 });

    try {
      let hasMore = true;
      while (hasMore) {
        hasMore = await runBatch();
      }
      setFinished(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }, [runBatch]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
          <Sparkles size={22} />
        </div>
        <div>
          <h1 className="ds-h2">Обогащение описаний мест</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            AI переписывает описания в литературном стиле — конкретно, без клише, без ссылок на источники
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="ds-card p-5 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span>Батч</span>
            <select
              value={batch}
              onChange={e => setBatch(Number(e.target.value))}
              disabled={running}
              className="ds-input w-20 text-sm"
            >
              {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>мест за запрос</span>
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={force}
              onChange={e => setForce(e.target.checked)}
              disabled={running}
              className="rounded"
            />
            Перезаписать все (force)
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={start}
            disabled={running}
            className="ds-btn ds-btn-primary flex items-center gap-2"
          >
            {running
              ? <><Loader2 size={16} className="animate-spin" /> Обогащаю...</>
              : <><Play size={16} /> Запустить</>
            }
          </button>

          {(finished || error) && (
            <button
              onClick={() => { setLog([]); setStats({ done: 0, total: 0, batches: 0 }); setFinished(false); setError(null); }}
              className="ds-btn ds-btn-secondary flex items-center gap-2"
            >
              <RotateCcw size={16} /> Сбросить
            </button>
          )}
        </div>

        {/* Progress */}
        {stats.batches > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-[var(--text-secondary)]">
              <span>Обработано батчей: {stats.batches}</span>
              <span className="font-medium text-[var(--success)]">{stats.done} успешно</span>
            </div>
            {stats.total > 0 && (
              <div className="h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                <div
                  className="h-full bg-[var(--success)] transition-all duration-300"
                  style={{ width: `${Math.min(100, (stats.done / stats.total) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {finished && (
          <p className="text-sm font-medium text-[var(--success)] flex items-center gap-2">
            <CheckCircle size={15} /> Все описания обогащены
          </p>
        )}
        {error && (
          <p className="text-sm text-[var(--danger)]">Ошибка: {error}</p>
        )}
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="ds-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Лог ({log.length} записей)
            </p>
          </div>
          <div className="divide-y divide-[var(--border)] max-h-[60vh] overflow-y-auto">
            {log.map((r, i) => (
              <div key={i} className="px-4 py-2.5 flex items-start gap-3 text-sm">
                {r.status === 'ok'
                  ? <CheckCircle size={14} className="shrink-0 mt-0.5 text-[var(--success)]" />
                  : <XCircle    size={14} className="shrink-0 mt-0.5 text-[var(--danger)]" />
                }
                <span className="flex-1 text-[var(--text-primary)]">{r.name}</span>
                {r.status === 'ok'
                  ? <span className="text-[var(--text-muted)] shrink-0">{r.chars} симв.</span>
                  : <span className="text-[var(--danger)] shrink-0 text-xs">{r.error}</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
