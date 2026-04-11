'use client';

import { useState, useEffect } from 'react';
import { Brain, Play, ChevronDown, ChevronUp, Zap, Clock, FileText } from 'lucide-react';
import { Header } from '@/components/layout/Header';

interface PromptEntry {
  id: string;
  label: string;
  source: string;
  preview: string;
  charCount: number;
}

interface TestResult {
  response: string;
  latency_ms: number;
  comparison?: {
    original: string;
    original_ms: number;
    variant: string;
    variant_ms: number;
  };
}

export default function AIPromptsClient() {
  const [prompts, setPrompts]           = useState<PromptEntry[]>([]);
  const [selected, setSelected]         = useState<string>('');
  const [expanded, setExpanded]         = useState<Set<string>>(new Set());
  const [userInput, setUserInput]       = useState('');
  const [variantPrompt, setVariantPrompt] = useState('');
  const [showVariant, setShowVariant]   = useState(false);
  const [testing, setTesting]           = useState(false);
  const [result, setResult]             = useState<TestResult | null>(null);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/ai-prompts')
      .then(r => r.json())
      .then(j => { if (j.ok) setPrompts(j.prompts); })
      .catch(() => {});
  }, []);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function runTest() {
    if (!selected || !userInput.trim()) return;
    setTesting(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_id:  selected,
          user_input: userInput.trim(),
          ...(showVariant && variantPrompt.trim() ? { variant: variantPrompt.trim() } : {}),
        }),
      });
      const j = await res.json();
      if (j.ok) setResult(j);
      else setError(j.error ?? 'Ошибка теста');
    } catch {
      setError('Сетевая ошибка');
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <Header />
      <div className="ds-page pt-20 pb-12 space-y-6">

        {/* Заголовок */}
        <div className="flex items-center gap-3">
          <Brain className="text-[var(--accent)]" size={28} />
          <div>
            <h1 className="ds-h1">AI-промпты системы</h1>
            <p className="text-[var(--text-secondary)] text-sm">Просмотр и тестирование системных инструкций для Кузьмича и внутренних AI-модулей</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Список промптов */}
          <div className="space-y-3">
            <h2 className="ds-h2">Промпты ({prompts.length})</h2>
            {prompts.map(p => (
              <div
                key={p.id}
                className={`ds-card cursor-pointer border-2 transition-all ${selected === p.id ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}
                onClick={() => setSelected(p.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[var(--text-primary)] truncate">{p.label}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{p.source}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="ds-badge text-xs">
                      <FileText size={10} className="inline mr-1" />{(p.charCount / 1000).toFixed(1)}k
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); toggleExpand(p.id); }}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {expanded.has(p.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>
                {expanded.has(p.id) && (
                  <p className="mt-2 text-xs text-[var(--text-secondary)] font-mono whitespace-pre-wrap border-t border-[var(--border)] pt-2">
                    {p.preview}…
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Тестирование */}
          <div className="space-y-4">
            <h2 className="ds-h2">Тест промпта</h2>

            {!selected ? (
              <p className="text-[var(--text-muted)] text-sm">Выберите промпт слева</p>
            ) : (
              <>
                <div>
                  <label className="ds-label">Тестовый запрос пользователя</label>
                  <textarea
                    className="ds-input w-full h-24 resize-none mt-1"
                    placeholder="Введите тестовое сообщение..."
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                  />
                </div>

                <button
                  className="text-sm text-[var(--ocean)] flex items-center gap-1"
                  onClick={() => setShowVariant(!showVariant)}
                >
                  <Zap size={14} /> {showVariant ? 'Скрыть A/B вариант' : 'Добавить A/B вариант промпта'}
                </button>

                {showVariant && (
                  <div>
                    <label className="ds-label">Вариант промпта (B)</label>
                    <textarea
                      className="ds-input w-full h-28 resize-none mt-1 font-mono text-xs"
                      placeholder="Введите альтернативный системный промпт..."
                      value={variantPrompt}
                      onChange={e => setVariantPrompt(e.target.value)}
                    />
                  </div>
                )}

                <button
                  className="ds-btn ds-btn-primary w-full flex items-center justify-center gap-2"
                  onClick={runTest}
                  disabled={testing || !userInput.trim()}
                >
                  {testing ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Play size={16} />}
                  {testing ? 'Запускаю...' : 'Запустить тест'}
                </button>

                {error && (
                  <p className="text-[var(--danger)] text-sm">{error}</p>
                )}

                {result && !result.comparison && (
                  <div className="ds-card space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <Clock size={12} /> {result.latency_ms}ms
                    </div>
                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{result.response}</p>
                  </div>
                )}

                {result?.comparison && (
                  <div className="space-y-3">
                    <div className="ds-card border-l-4 border-[var(--ocean)] space-y-1">
                      <p className="text-xs font-semibold text-[var(--ocean)] flex items-center gap-1">
                        <Clock size={11} /> Оригинал — {result.comparison.original_ms}ms
                      </p>
                      <p className="text-sm whitespace-pre-wrap text-[var(--text-primary)]">{result.comparison.original}</p>
                    </div>
                    <div className="ds-card border-l-4 border-[var(--accent)] space-y-1">
                      <p className="text-xs font-semibold text-[var(--accent)] flex items-center gap-1">
                        <Clock size={11} /> Вариант B — {result.comparison.variant_ms}ms
                      </p>
                      <p className="text-sm whitespace-pre-wrap text-[var(--text-primary)]">{result.comparison.variant}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
