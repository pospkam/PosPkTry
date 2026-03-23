/**
 * Компонент для отображения отчёта об исполнении инициатив
 * перед началом совещания
 */

import { AlertCircle, AlertTriangle, BarChart3, CheckCircle2, Clock, Lightbulb, X, Zap } from 'lucide-react';

export interface AccountabilityData {
  briefing: string;
  accountability: {
    total_initiatives: number;
    completion_rate_pct: number;
    overdue_count: number;
    failed_count: number;
    blocked_count: number;
  };
  initiatives: Array<{
    id: string;
    title: string;
    from_agent: string;
    status: string;
    days_old: number;
    progress: number;
    issue: string | null;
  }>;
  action_required: boolean;
}

export function PremeetingAccountabilityBriefing({
  data,
  onClose,
}: {
  data: AccountabilityData;
  onClose?: () => void;
}) {
  if (!data || data.accountability.total_initiatives === 0) {
    return null;
  }

  const { accountability, initiatives } = data;
  const isHealthy =
    accountability.completion_rate_pct >= 70 &&
    accountability.overdue_count === 0;

  return (
    <div
      className="ds-card mb-6 p-6 border-l-4"
      style={{
        borderColor: isHealthy ? 'var(--success)' : 'var(--warning)',
        background: isHealthy
          ? 'rgba(63, 185, 80, 0.05)'
          : 'rgba(210, 153, 34, 0.05)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          {isHealthy ? (
            <CheckCircle2
              size={20}
              className="text-[var(--success)] shrink-0 mt-0.5"
            />
          ) : (
            <AlertCircle
              size={20}
              className="text-[var(--warning)] shrink-0 mt-0.5"
            />
          )}
          <div>
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
              <BarChart3 size={14} className="text-[var(--text-secondary)]" />
              Отчёт об исполнении инициатив
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Статус решений из предыдущих совещаний. Требуется внимание?
              {data.action_required && (
                <span className="ml-2 font-bold text-[var(--warning)]">
                  ДА
                </span>
              )}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <div className="bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)] mb-1">Всего</p>
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {accountability.total_initiatives}
          </p>
        </div>
        <div
          className="bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border)]"
          style={{
            borderColor: 'rgba(63, 185, 80, 0.3)',
            background: 'rgba(63, 185, 80, 0.05)',
          }}
        >
          <p className="text-xs text-[var(--text-muted)] mb-1">Готово</p>
          <p className="text-lg font-bold text-[var(--success)]">
            {accountability.completion_rate_pct}%
          </p>
        </div>
        <div
          className="bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border)]"
          style={{
            borderColor: 'rgba(220, 38, 38, 0.3)',
            background: 'rgba(220, 38, 38, 0.05)',
          }}
        >
          <p className="text-xs text-[var(--text-muted)] mb-1">Просрочено</p>
          <p className="text-lg font-bold text-[var(--danger)]">
            {accountability.overdue_count}
          </p>
        </div>
        <div
          className="bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border)]"
          style={{
            borderColor: 'rgba(248, 113, 113, 0.3)',
            background: 'rgba(248, 113, 113, 0.05)',
          }}
        >
          <p className="text-xs text-[var(--text-muted)] mb-1">Ошибки</p>
          <p className="text-lg font-bold text-[var(--danger)]">
            {accountability.failed_count}
          </p>
        </div>
        <div
          className="bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border)]"
          style={{
            borderColor: 'rgba(210, 153, 34, 0.3)',
            background: 'rgba(210, 153, 34, 0.05)',
          }}
        >
          <p className="text-xs text-[var(--text-muted)] mb-1">Заблокировано</p>
          <p className="text-lg font-bold text-[var(--warning)]">
            {accountability.blocked_count}
          </p>
        </div>
      </div>

      {/* Overdue initiatives */}
      {accountability.overdue_count > 0 && (
        <div className="bg-[rgba(210,153,34,0.1)] border border-[var(--warning)] rounded-lg p-3 mb-4">
          <p className="text-xs font-bold text-[var(--warning)] mb-2 flex items-center gap-1.5">
            <AlertTriangle size={12} className="shrink-0" />
            Просроченные инициативы ({accountability.overdue_count}):
          </p>
          <ul className="space-y-1.5">
            {initiatives
              .filter((i) => i.status !== 'done' && i.days_old > 3)
              .slice(0, 5)
              .map((i) => (
                <li key={i.id} className="flex items-start gap-2 text-xs">
                  <Clock size={12} className="text-[var(--warning)] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[var(--text-primary)] font-medium line-clamp-1">
                      {i.title}
                    </p>
                    <p className="text-[var(--text-muted)]">
                      {i.days_old}д назад • от {i.from_agent} • статус:{' '}
                      <span className="font-mono text-[var(--warning)]">
                        {i.status}
                      </span>
                    </p>
                    {i.issue && (
                      <p className="text-[var(--danger)] text-[10px] mt-0.5">
                        Причина: {i.issue.substring(0, 60)}...
                      </p>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Full briefing */}
      <div className="bg-[var(--bg-primary)] rounded-lg p-3 border border-[var(--border)]">
        <p className="text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
          {data.briefing}
        </p>
      </div>

      {/* Action note */}
      {data.action_required && (
        <div className="mt-4 p-3 bg-[rgba(210,153,34,0.15)] rounded-lg border border-[var(--warning)] border-opacity-30">
          <p className="text-xs text-[var(--text-primary)]">
            <Zap size={12} className="inline mr-1" style={{ color: 'var(--warning)' }} />
            <strong>Рекомендация:</strong> На этом совещании обсудите почему инициативы
            не выполняются и что нужно для их ускорения.
          </p>
        </div>
      )}
    </div>
  );
}
