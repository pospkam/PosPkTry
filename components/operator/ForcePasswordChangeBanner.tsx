'use client';

import { useEffect, useState } from 'react';
import { KeyRound, X, Eye, EyeOff } from 'lucide-react';

export function ForcePasswordChangeBanner() {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then((d: { success?: boolean; data?: { preferences?: { force_password_change?: boolean } } }) => {
        if (d.success && d.data?.preferences?.force_password_change) setShow(true);
      })
      .catch(() => {});
  }, []);

  if (!show || done) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (!data.success) {
        setError(data.error ?? 'Ошибка');
      } else {
        setDone(true);
        setOpen(false);
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mx-5 mt-5 flex items-center gap-3 rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/8 px-4 py-3">
        <KeyRound className="w-4 h-4 text-[var(--warning)] shrink-0" />
        <p className="flex-1 text-sm text-[var(--text-secondary)]">
          Установлен временный пароль.{' '}
          <button
            onClick={() => setOpen(true)}
            className="font-medium text-[var(--text-primary)] underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            Сменить пароль
          </button>
        </p>
        <button onClick={() => setShow(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
          <X className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="ds-card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="ds-h2 text-lg">Смена пароля</h2>
              <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="ds-label mb-1 block">Текущий пароль</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={current}
                    onChange={e => setCurrent(e.target.value)}
                    className="ds-input w-full pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="ds-label mb-1 block">Новый пароль</label>
                <div className="relative">
                  <input
                    type={showNext ? 'text' : 'password'}
                    value={next}
                    onChange={e => setNext(e.target.value)}
                    className="ds-input w-full pr-10"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNext(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  >
                    {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Минимум 8 символов</p>
              </div>

              {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="ds-btn ds-btn-primary w-full"
              >
                {loading ? 'Сохраняем…' : 'Сохранить пароль'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
