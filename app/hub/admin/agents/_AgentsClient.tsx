'use client';

import { useState } from 'react';
import { RefreshCw, Eye, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface AgentDef {
  id: string;
  name: string;
  description: string;
  schedule: string;
  endpoint: string;
}

const AGENTS: AgentDef[] = [
  {
    id: 'watchdog',
    name: 'Watchdog',
    description: 'Мониторинг: бронирования без подтверждения, операторы без ответа, необработанные лиды, SOS-сигналы.',
    schedule: 'каждые 30 мин',
    endpoint: '/api/cron/watchdog',
  },
  {
    id: 'editor',
    name: 'Editor',
    description: 'AI-редактор описаний туров: находит туры с короткими описаниями и переписывает через AI.',
    schedule: 'раз в сутки (02:00 UTC)',
    endpoint: '/api/cron/editor',
  },
  {
    id: 'scout',
    name: 'Scout Digest',
    description: 'Ежедневный дайджест: RSS-мониторинг AI/тревел/Камчатка → синтез → Telegram.',
    schedule: 'раз в сутки (07:00 UTC)',
    endpoint: '/api/cron/scout-digest',
  },
];

interface RunState {
  loading: boolean;
  result: Record<string, unknown> | null;
  error: string | null;
}

export default function AgentsClient() {
  const [runs, setRuns] = useState<Record<string, RunState>>({});

  async function triggerAgent(agent: AgentDef) {
    setRuns(prev => ({
      ...prev,
      [agent.id]: { loading: true, result: null, error: null },
    }));

    try {
      const secret = prompt('CRON_SECRET:');
      if (!secret) {
        setRuns(prev => ({ ...prev, [agent.id]: { loading: false, result: null, error: 'Отменено' } }));
        return;
      }
      const res = await fetch(`${agent.endpoint}?secret=${encodeURIComponent(secret)}`);
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
      setRuns(prev => ({ ...prev, [agent.id]: { loading: false, result: data as Record<string, unknown>, error: null } }));
    } catch (err) {
      setRuns(prev => ({
        ...prev,
        [agent.id]: { loading: false, result: null, error: err instanceof Error ? err.message : 'Ошибка' },
      }));
    }
  }

  return (
    <div className="ds-page max-w-3xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="ds-h1 mb-1">AI-агенты</h1>
        <p className="text-[var(--text-secondary)] text-sm">
          3 рабочих агента. Каждый делает конкретную работу и отправляет результат в Telegram.
        </p>
      </div>

      <div className="space-y-4">
        {AGENTS.map(agent => {
          const run = runs[agent.id];
          return (
            <div key={agent.id} className="ds-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[var(--text-primary)]">{agent.name}</span>
                    <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] px-2 py-0.5 rounded">
                      {agent.schedule}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">{agent.description}</p>

                  {run?.result && (
                    <div className="text-xs bg-[var(--bg-hover)] rounded p-3 font-mono text-[var(--text-secondary)] mb-2">
                      {Object.entries(run.result).map(([k, v]) => (
                        <div key={k}>
                          {k}:{' '}
                          <span className="text-[var(--text-primary)]">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {run?.error && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--danger)]">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      {run.error}
                    </div>
                  )}

                  {run?.result?.success === true && !run?.error && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--success)]">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Выполнено
                    </div>
                  )}
                </div>

                <button
                  onClick={() => triggerAgent(agent)}
                  disabled={run?.loading}
                  className="ds-btn ds-btn-secondary text-sm flex items-center gap-1.5 flex-shrink-0"
                >
                  {run?.loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  {run?.loading ? 'Запуск...' : 'Запустить'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 ds-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Другие рабочие агенты</span>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Кузьмич —{' '}
          <a href="/kuzmich" className="text-[var(--ocean)] hover:underline">
            /kuzmich
          </a>{' '}
          · Danger —{' '}
          <a href="/hub/admin/rescue" className="text-[var(--ocean)] hover:underline">
            /hub/admin/rescue
          </a>{' '}
          · Лиды —{' '}
          <a href="/hub/admin/leads" className="text-[var(--ocean)] hover:underline">
            /hub/admin/leads
          </a>
        </p>
      </div>
    </div>
  );
}
