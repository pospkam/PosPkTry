'use client';

import { useState } from 'react';
import { Sparkles, Loader, Send, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface AgentResult {
  intent: string;
  response: string;
  duration_ms: number;
  data?: Record<string, unknown>;
}

const EXAMPLES = [
  { label: 'Сводка туров', message: 'Покажи сводку по моим турам' },
  { label: 'Бронирования сегодня', message: 'Что за бронирования сегодня?' },
  { label: 'Выручка за 7 дней', message: 'Какая выручка за последнюю неделю?' },
  { label: 'Создать тур', message: 'Создай тур "Рыбалка на Авачинской бухте"' },
  { label: 'AI заполнить тур', message: 'заполни тур 1' },
  { label: 'Добавить слоты', message: 'добавь слоты туру 1 с 2026-07-01 по 2026-07-31, 10 мест' },
];

export function AIAssistClient() {
  const [message, setMessage] = useState('');
  const [tourId, setTourId] = useState('');
  const [result, setResult] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showData, setShowData] = useState(false);

  async function sendMessage(text?: string) {
    const msg = text ?? message;
    if (!msg.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setShowData(false);

    try {
      const body: Record<string, unknown> = { message: msg };
      if (tourId) body.tourId = parseInt(tourId);

      const res = await fetch('/api/agents/operator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Ошибка запроса');
        return;
      }

      setResult(data);
      if (!text) setMessage('');
    } catch {
      setError('Нет соединения. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ds-page min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-[var(--accent)]" />
            <h1 className="ds-h1">AI Помощник</h1>
          </div>
          <p className="text-[var(--text-secondary)]">
            Голосовые команды для управления турами и бронированиями
          </p>
        </div>

        {/* Quick Examples */}
        <div className="ds-card p-4 mb-6">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-widest mb-3">
            Примеры команд
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => sendMessage(ex.message)}
                disabled={loading}
                className="px-3 py-1.5 text-xs rounded border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="ds-card p-4 mb-4">
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              placeholder="Tour ID (если нужно)"
              value={tourId}
              onChange={(e) => setTourId(e.target.value)}
              className="ds-input w-28 text-sm"
            />
            <span className="text-[var(--text-muted)] self-center text-xs">ID тура</span>
          </div>

          <div className="flex gap-3">
            <textarea
              placeholder="Напишите команду... (например: покажи мои туры, создай тур, добавь слоты)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={3}
              className="ds-input flex-1 text-sm resize-none"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !message.trim()}
              className="ds-btn ds-btn-primary self-end px-4"
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="ds-card p-4 mb-4 border-l-4 border-[var(--danger)] bg-red-50 dark:bg-red-950/20">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
              <p className="text-sm text-[var(--text-primary)]">{error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="ds-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-[var(--success)]" />
              <span className="text-xs text-[var(--text-secondary)]">
                Intent: <span className="font-medium text-[var(--text-primary)]">{result.intent}</span>
              </span>
              <span className="text-xs text-[var(--text-muted)] ml-auto">{result.duration_ms}ms</span>
            </div>

            <div className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
              {result.response}
            </div>

            {result.data && Object.keys(result.data).length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowData(!showData)}
                  className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showData ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Raw data
                </button>
                {showData && (
                  <pre className="mt-2 text-xs bg-[var(--bg-hover)] rounded p-3 overflow-x-auto text-[var(--text-secondary)]">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 ds-card p-5">
          <h2 className="ds-h2 mb-3">Доступные команды</h2>
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-medium text-[var(--text-primary)] mb-1">Читать</p>
                <p>— Покажи мои туры</p>
                <p>— Бронирования сегодня</p>
                <p>— Выручка за 7 дней</p>
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)] mb-1">Создавать</p>
                <p>— Создай тур [название]</p>
                <p>— Заполни тур [ID]</p>
                <p>— Добавь слоты туру [ID] с [дата] по [дата]</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
