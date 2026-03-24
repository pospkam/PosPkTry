'use client';

import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Reveal } from '@/components/homepage/Reveal';

interface Review {
  id: string;
  rating: number;
  comment: string;
  userName: string;
  tourName: string;
  createdAt: string;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Только что';
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}д назад`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reviews?limit=6')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setReviews(data.data.slice(0, 3));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && reviews.length === 0) return null;

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">
            Отзывы туристов
          </h2>
          <p className="text-sm text-[var(--text-muted)] flex items-center gap-2 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]" />
            </span>
            Реальные отзывы от путешественников
          </p>
        </Reveal>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
                <div className="ds-skeleton h-4 w-24 rounded mb-4" />
                <div className="ds-skeleton h-16 rounded mb-4" />
                <div className="ds-skeleton h-4 w-32 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {reviews.map(review => (
              <Reveal key={review.id}>
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 flex flex-col h-full">
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? 'text-[var(--accent)] fill-[var(--accent)]'
                            : 'text-[var(--text-muted)]'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Comment */}
                  <p className="text-sm text-[var(--text-primary)] flex-1 line-clamp-4">
                    {review.comment || 'Отличный тур!'}
                  </p>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-[var(--border)]">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{review.userName}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {review.tourName && `${review.tourName} · `}{relativeTime(review.createdAt)}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
