'use client';

import { useState } from 'react';
import { Database, Play, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface MigrationResult {
  file: string;
  status: 'ok' | 'skip' | 'error';
  message: string;
}

interface RunResult {
  success: boolean;
  dry_run: boolean;
  pending: number;
  message?: string;
  results: MigrationResult[];
  summary?: { ok: number; skip: number; error: number };
}

export default function MigrationsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runMigrations(dryRun: boolean) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/migrations/run-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: dryRun }),
      });
      const data = await res.json() as RunResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка запроса');
    } finally {
      setLoading(false);
    }
  }

  const statusIcon = (s: MigrationResult['status']) => {
    if (s === 'ok') return <CheckCircle size={16} className="text-[var(--success)]" />;
    if (s === 'error') return <XCircle size={16} className="text-[var(--danger)]" />;
    return <AlertCircle size={16} className="text-[var(--text-muted)]" />;
  };

  return (
    <div className="ds-page max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Database size={28} className="text-[var(--accent)]" />
        <h1 className="ds-h1">Миграции базы данных</h1>
      </div>

      <div className="ds-card p-6 mb-6">
        <p className="text-[var(--text-secondary)] mb-6 text-sm leading-relaxed">
          Применяет все SQL-миграции из папки <code className="bg-[var(--bg-hover)] px-1.5 py-0.5 rounded text-xs">migrations/</code>,
          которые ещё не были применены. Идемпотентно — повторный запуск безопасен.
        </p>

        <div className="flex gap-3">
          <button
            className="ds-btn ds-btn-primary flex items-center gap-2"
            onClick={() => runMigrations(false)}
            disabled={loading}
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
            Применить миграции
          </button>
          <button
            className="ds-btn ds-btn-secondary flex items-center gap-2"
            onClick={() => runMigrations(true)}
            disabled={loading}
          >
            Dry run (проверить)
          </button>
        </div>
      </div>

      {error && (
        <div className="ds-card p-4 border border-[var(--danger)] mb-4">
          <p className="text-[var(--danger)] text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="ds-card p-6">
          {result.message ? (
            <p className="text-[var(--success)] font-medium">{result.message}</p>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <span className={`font-semibold text-sm ${result.success ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {result.success ? 'Успешно' : 'Есть ошибки'}
                </span>
                {result.summary && (
                  <span className="text-[var(--text-muted)] text-xs">
                    {result.summary.ok} применено · {result.summary.skip} пропущено · {result.summary.error} ошибок
                  </span>
                )}
                {result.dry_run && (
                  <span className="ds-badge text-xs">dry run</span>
                )}
              </div>

              <div className="space-y-2">
                {result.results.map((r) => (
                  <div key={r.file} className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-0">
                    {statusIcon(r.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{r.file}</p>
                      <p className="text-xs text-[var(--text-muted)]">{r.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
