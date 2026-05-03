'use client';

import { Star, MessageSquarePlus, ChevronRight } from 'lucide-react';
import type { PlaceReview } from './types';

interface Props {
  placeId: string;
  reviews: PlaceReview[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= rating ? 'fill-[var(--warning)] text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}
        />
      ))}
    </div>
  );
}

export default function PlaceReviews({ placeId, reviews }: Props) {
  const avgRating = reviews.length
    ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10
    : null;

  return (
    <section className="max-w-3xl mx-auto px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          <Star className="w-5 h-5 text-[var(--warning)]" />
          Отзывы о месте
          {avgRating != null && (
            <span className="text-base font-normal text-[var(--text-secondary)] ml-1">
              {avgRating} · {reviews.length}
            </span>
          )}
        </h2>
        <a
          href={`/places/${placeId}/review`}
          className="ds-btn ds-btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Оставить отзыв
        </a>
      </div>

      {reviews.length >= 10 && (
        <a
          href={`/places/${placeId}/reviews`}
          className="inline-flex items-center gap-1 text-sm text-[var(--ocean)] hover:text-[var(--accent)] font-medium transition-colors"
        >
          Все отзывы <ChevronRight className="w-4 h-4" />
        </a>
      )}

      {reviews.length === 0 ? (
        <div className="ds-card p-6 text-center space-y-2">
          <p className="text-[var(--text-muted)] text-sm">Отзывов пока нет.</p>
          <p className="text-[var(--text-muted)] text-xs">Вы были здесь? Поделитесь впечатлениями — это поможет другим туристам.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="ds-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-primary)]">{r.authorName}</span>
                <div className="flex items-center gap-2">
                  <StarRating rating={r.rating} />
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(r.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
              {r.comment && (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
