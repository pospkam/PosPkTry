'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, User, MessageSquare, Calendar, Users, Send, CheckCircle } from 'lucide-react';

const ACTIVITIES = [
  { value: 'volcano',    label: 'Вулканы' },
  { value: 'trekking',   label: 'Треккинг' },
  { value: 'fishing',    label: 'Рыбалка' },
  { value: 'thermal',    label: 'Термальные источники' },
  { value: 'helicopter', label: 'Вертолётные туры' },
  { value: 'bears',      label: 'Наблюдение за медведями' },
  { value: 'skiing',     label: 'Горные лыжи' },
  { value: 'snowmobile', label: 'Снегоходы' },
  { value: 'boat_trip',  label: 'Морские прогулки' },
  { value: 'kayak',      label: 'Байдарки' },
  { value: 'other',      label: 'Другое' },
];

type FormState = 'idle' | 'sending' | 'success' | 'error';

export default function ContactClient() {
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [dates, setDates]       = useState('');
  const [groupSize, setGroupSize] = useState('');
  const [comment, setComment]   = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [error, setError]       = useState<string | null>(null);

  const toggleInterest = (val: string) => {
    setInterests(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    setFormState('sending');
    setError(null);

    const source_data: Record<string, unknown> = { source: 'website' };
    if (interests.length > 0) source_data.interests = interests;
    if (dates.trim()) source_data.desired_dates = dates.trim();
    if (groupSize) source_data.trip_group_size = parseInt(groupSize, 10);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          comment: comment.trim() || undefined,
          source_url: typeof window !== 'undefined' ? window.location.href : undefined,
          source_data,
        }),
      });

      const data = await res.json() as { success?: boolean; error?: string };
      if (res.ok && data.success) {
        setFormState('success');
      } else {
        setError(data.error ?? 'Не удалось отправить заявку. Попробуйте позже.');
        setFormState('error');
      }
    } catch {
      setError('Нет соединения с сервером. Попробуйте позже.');
      setFormState('error');
    }
  };

  if (formState === 'success') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-10 max-w-md w-full text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'color-mix(in srgb, var(--success) 15%, transparent)' }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: 'var(--success)' }} />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Заявка принята</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Спасибо! Наш специалист свяжется с вами в ближайшее время.
            AI Кузьмич уже подбирает маршрут под ваши пожелания.
          </p>
          <Link
            href="/"
            className="inline-block mt-6 px-6 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--accent)' }}
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-lg mx-auto px-4 pt-20 pb-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-[var(--ocean)] hover:underline mb-4 inline-block">
            ← KamchatourHub
          </Link>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] font-[var(--font-playfair)]">
            Оставить заявку
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">
            Расскажите о желаемом туре — подберём маршрут и свяжемся с вами.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1.5 mb-1.5">
              <User size={14} />
              Имя <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Иван Иванов"
              required
              className="ds-input w-full"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1.5 mb-1.5">
              <Phone size={14} />
              Телефон <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+7 900 000 00 00"
              required
              className="ds-input w-full"
            />
          </div>

          {/* Interests */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">
              Что вас интересует?
            </label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map(a => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => toggleInterest(a.value)}
                  className="text-sm px-3 py-1.5 rounded-full border transition-all"
                  style={
                    interests.includes(a.value)
                      ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' }
                      : {}
                  }
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates + Group */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1.5 mb-1.5">
                <Calendar size={14} />
                Даты поездки
              </label>
              <input
                type="text"
                value={dates}
                onChange={e => setDates(e.target.value)}
                placeholder="Июль 2026"
                className="ds-input w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1.5 mb-1.5">
                <Users size={14} />
                Группа (чел.)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={groupSize}
                onChange={e => setGroupSize(e.target.value)}
                placeholder="2"
                className="ds-input w-full"
              />
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1.5 mb-1.5">
              <MessageSquare size={14} />
              Пожелания
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Хочу активный отдых, интересуют вулканы и рыбалка..."
              rows={4}
              className="ds-input w-full resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={formState === 'sending' || !name.trim() || !phone.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            <Send size={16} />
            {formState === 'sending' ? 'Отправляем...' : 'Отправить заявку'}
          </button>

          <p className="text-xs text-[var(--text-muted)] text-center">
            Нажимая кнопку, вы соглашаетесь на обработку персональных данных
          </p>
        </form>
      </div>
    </div>
  );
}
