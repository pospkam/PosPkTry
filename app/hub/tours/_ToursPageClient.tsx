'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

const INPUT = 'w-full px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';
const LABEL = 'block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5';

export default function ToursPageClient() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    const dates = (f.elements.namedItem('dates') as HTMLInputElement).value;
    const guests = (f.elements.namedItem('guests') as HTMLInputElement).value;
    const interests = (f.elements.namedItem('interests') as HTMLInputElement).value;
    const budget = (f.elements.namedItem('budget') as HTMLInputElement).value;

    setLoading(true);
    setText('');

    const prompt = `Составь 2-дневный план по Камчатке. Даты: ${dates}. Гостей: ${guests}. Интересы: ${interests}. Бюджет: ${budget} RUB.`;
    const r = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const j = await r.json();
    setText(j.answer || j.data?.answer || j.error || '');
    setLoading(false);
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Туры по Камчатке</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Выберите тур или получите персональный маршрут от AI</p>
      </div>

      <button
        onClick={() => setOpen(true)}
        className="px-5 py-2.5 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90 transition-opacity"
      >
        AI.KAM — Подобрать маршрут
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 w-full max-w-[520px]">
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm font-semibold text-[var(--text-primary)]">ai.Kam · подбор маршрута</span>
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className={LABEL}>Даты</label>
                <input
                  name="dates"
                  placeholder="15–20 июля"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Количество гостей</label>
                <input
                  name="guests"
                  placeholder="Гостей"
                  type="number"
                  min={1}
                  defaultValue={2}
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Интересы</label>
                <input
                  name="interests"
                  placeholder="Вулканы, рыбалка, медведи..."
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Бюджет (RUB)</label>
                <input
                  name="budget"
                  placeholder="150000"
                  type="number"
                  className={INPUT}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2.5 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Генерация...' : 'Получить маршрут'}
              </button>

              {text && (
                <div className="whitespace-pre-wrap text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] border border-[var(--border)] p-4 rounded-md min-h-[80px]">
                  {text}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
