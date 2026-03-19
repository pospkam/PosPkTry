'use client';

import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

const INTERESTS = [
  { id: 'fishing',       label: 'Рыбалка' },
  { id: 'volcano',       label: 'Вулканы' },
  { id: 'bears',         label: 'Медведи' },
  { id: 'helicopter',    label: 'Вертолёт' },
  { id: 'thermal',       label: 'Термальные' },
  { id: 'trekking',      label: 'Треккинг' },
  { id: 'snowmobile',    label: 'Снегоходы' },
  { id: 'sea',           label: 'Море' },
];

export function TripPlanner() {
  const [interests, setInterests] = useState<string[]>([]);
  const [arrival, setArrival]     = useState('');
  const [departure, setDeparture] = useState('');
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  const toggle = (id: string) =>
    setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  async function submit() {
    if (!name.trim()) { setError('Укажите имя'); return; }
    if (!phone.trim()) { setError('Укажите телефон'); return; }
    setError('');
    setLoading(true);

    const parts: string[] = [];
    if (interests.length) parts.push(`Интересы: ${interests.join(', ')}`);
    if (arrival)   parts.push(`Прилёт: ${arrival}`);
    if (departure) parts.push(`Отъезд: ${departure}`);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        name.trim(),
          phone:       phone.trim(),
          comment:     parts.join(' · ') || undefined,
          source_url:  typeof window !== 'undefined' ? window.location.href : '/',
          source_data: { interests, arrival, departure, source: 'trip_planner' },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
      } else {
        setError(data.error ?? 'Что-то пошло не так. Попробуйте снова.');
      }
    } catch {
      setError('Нет соединения. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <section id="planner" className="py-12 md:py-20 px-6 md:px-10 max-w-4xl mx-auto">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-10 md:p-16 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--success)]/15 flex items-center justify-center mx-auto mb-6">
            <Check className="w-6 h-6 text-[var(--success)]" />
          </div>
          <h2 className="font-playfair text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-3">
            Запрос получен
          </h2>
          <p className="text-[var(--text-secondary)] max-w-sm mx-auto">
            Перезвоним в течение дня и подберём программу под ваши даты.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="planner" className="py-12 md:py-20 px-6 md:px-10 max-w-4xl mx-auto">
      <div className="space-y-10">

        {/* Заголовок */}
        <div className="space-y-2">
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
            Спланировать поездку
          </h2>
          <p className="text-[var(--text-secondary)]">
            Расскажите что хотите увидеть — подберём программу под вас
          </p>
        </div>

        {/* Интересы */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Что хотите делать
          </p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(i => (
              <button
                key={i.id}
                type="button"
                onClick={() => toggle(i.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                  interests.includes(i.id)
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                    : 'bg-transparent border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>

        {/* Даты — необязательные */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">
              Прилёт <span className="text-[var(--text-muted)] font-normal">(необязательно)</span>
            </label>
            <input
              type="date"
              value={arrival}
              onChange={e => setArrival(e.target.value)}
              className="ds-input w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">
              Отъезд <span className="text-[var(--text-muted)] font-normal">(необязательно)</span>
            </label>
            <input
              type="date"
              value={departure}
              onChange={e => setDeparture(e.target.value)}
              className="ds-input w-full"
            />
          </div>
        </div>

        {/* Контакт */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Имя</label>
            <input
              type="text"
              placeholder="Как вас зовут"
              value={name}
              onChange={e => setName(e.target.value)}
              className="ds-input w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Телефон</label>
            <input
              type="tel"
              placeholder="+7 900 000-00-00"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="ds-input w-full"
            />
            <p className="text-xs text-[var(--text-muted)]">Оператор перезвонит сам — вам ничего делать не нужно</p>
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <p className="text-sm text-[var(--danger)]">{error}</p>
        )}

        {/* Кнопка */}
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="ds-btn ds-btn-primary flex items-center gap-2 px-8"
        >
          {loading ? 'Отправляем…' : 'Запросить программу'}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>

      </div>
    </section>
  );
}
