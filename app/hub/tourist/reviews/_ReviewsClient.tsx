'use client';

import { useState, useEffect } from 'react';
import { Protected } from '@/components/auth/Protected';
import { MessageSquare, Star, Loader2 } from 'lucide-react';

interface Review {
  id: string;
  tourName: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={`star-${i}`}
          className="w-4 h-4"
          style={{
            color: i < rating ? 'var(--warning)' : 'var(--text-muted)',
          }}
          fill={i < rating ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );
}

export default function ReviewsClient() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch('/api/reviews/my');
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Ошибка загрузки');
        setReviews(
          (data.data?.reviews ?? []).map((r: {
            id: string; tourName: string | null; rating: number; comment: string; createdAt: string;
          }) => ({
            id: r.id,
            tourName: r.tourName,
            rating: r.rating,
            comment: r.comment ?? '',
            createdAt: r.createdAt,
          }))
        );
      } catch {
        setError('Не удалось загрузить отзывы');
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  return (
    <Protected roles={['tourist', 'admin']}>
      <div className="max-w-5xl mx-auto p-6">
        <h1
          className="text-2xl font-semibold mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          Мои отзывы
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: 'var(--accent)' }}
            />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <MessageSquare
              className="w-16 h-16 mb-4"
              style={{ color: 'var(--text-muted)' }}
            />
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
              {error}
            </p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <MessageSquare
              className="w-16 h-16 mb-4"
              style={{ color: 'var(--text-muted)' }}
            />
            <p
              className="text-lg"
              style={{ color: 'var(--text-muted)' }}
            >
              У вас пока нет отзывов
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border p-5"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3
                    className="font-semibold text-base"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {review.tourName ?? 'Тур'}
                  </h3>
                  <span
                    className="text-sm"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                <StarRating rating={review.rating} />

                {review.comment && (
                  <p
                    className="mt-3 text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Protected>
  );
}
