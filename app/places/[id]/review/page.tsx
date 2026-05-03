'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Star, ArrowLeft, Send } from 'lucide-react';
import { Header } from '@/components/layout/Header';

interface Props {
  params: Promise<{ id: string }>;
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="p-1 transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              i <= (hover || value)
                ? 'fill-[var(--warning)] text-[var(--warning)]'
                : 'text-[var(--text-muted)]'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS = ['', 'Ужасно', 'Плохо', 'Нормально', 'Хорошо', 'Отлично'];

export default function PlaceReviewPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  const [rating, setRating]         = useState(0);
  const [comment, setComment]       = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [done, setDone]             = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setError('Выберите оценку'); return; }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/places/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment, authorName: authorName || 'Турист' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Ошибка');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <>
        <Header />
        <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
          <div className="text-5xl">🏔</div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
            Спасибо за отзыв!
          </h1>
          <p className="text-[var(--text-secondary)]">Ваш отзыв поможет другим туристам.</p>
          <button
            onClick={() => router.push(`/places/${id}`)}
            className="ds-btn ds-btn-primary"
          >
            Вернуться к месту
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <button
          onClick={() => router.push(`/places/${id}`)}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>

        <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
          Отзыв о месте
        </h1>

        <form onSubmit={submit} className="space-y-5">
          {/* Rating */}
          <div className="ds-card p-5 space-y-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Ваша оценка</p>
            <StarPicker value={rating} onChange={setRating} />
            {rating > 0 && (
              <p className="text-sm text-[var(--text-secondary)]">{RATING_LABELS[rating]}</p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <label className="ds-label">Комментарий</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Расскажите о своих впечатлениях — погода, доступность, что удивило..."
              rows={4}
              maxLength={3000}
              className="ds-input w-full resize-none"
            />
            <p className="text-xs text-[var(--text-muted)] text-right">{comment.length}/3000</p>
          </div>

          {/* Author */}
          <div className="space-y-1.5">
            <label className="ds-label">Ваше имя (необязательно)</label>
            <input
              type="text"
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              placeholder="Турист"
              maxLength={100}
              className="ds-input w-full"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !rating}
            className="ds-btn ds-btn-primary w-full inline-flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Отправка...' : 'Отправить отзыв'}
          </button>
        </form>
      </div>
    </>
  );
}
