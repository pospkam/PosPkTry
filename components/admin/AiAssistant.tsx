'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setError('');
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuestion('');
    setAnswer('');
    setError('');
  }, []);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) handleClose();
        else handleOpen();
      }
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleOpen, handleClose]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    setLoading(true);
    setError('');
    setAnswer('');

    try {
      const res = await fetch('/api/admin/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const json = await res.json();
      if (json.success) {
        setAnswer(json.data.answer);
      } else {
        setError(json.error ?? 'Ошибка AI');
      }
    } catch {
      setError('Не удалось связаться с AI');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-medium text-[var(--text-secondary)]">AI Ассистент</span>
          <span className="ml-auto text-[10px] text-[var(--text-muted)] font-mono">Esc для закрытия</span>
          <button onClick={handleClose} className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors">
            <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Спросите что-нибудь о платформе..."
            className="flex-1 text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="p-2 rounded-lg bg-[var(--accent)] text-[var(--text-primary)] hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>

        {/* Answer */}
        {(answer || error) && (
          <div className="px-4 py-4 max-h-[50vh] overflow-y-auto">
            {error ? (
              <p className="text-xs text-[var(--danger)]">{error}</p>
            ) : (
              <div className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{answer}</div>
            )}
          </div>
        )}

        {/* Hints */}
        {!answer && !error && !loading && (
          <div className="px-4 py-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Примеры вопросов</p>
            {[
              'Сколько бронирований за последний месяц?',
              'Какая конверсия на платформе?',
              'Есть ли партнёры на верификации?',
            ].map(hint => (
              <button
                key={hint}
                onClick={() => { setQuestion(hint); inputRef.current?.focus(); }}
                className="block w-full text-left text-xs text-[var(--text-secondary)] px-3 py-2 rounded-md bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)]/80 transition-colors"
              >
                {hint}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
