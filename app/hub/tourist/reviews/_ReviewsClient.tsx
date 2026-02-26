'use client';

import { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { MessageSquare, Star, Loader2 } from 'lucide-react';

// Демо-данные отзывов туриста
interface Review {
  id: string;
  tourName: string;
  rating: number;
  text: string;
  date: string;
}

const DEMO_REVIEWS: Review[] = [
  {
    id: '1',
    tourName: 'Восхождение на Авачинский вулкан',
    rating: 5,
    text: 'Незабываемое впечатление! Гид был профессиональным, виды потрясающие.',
    date: '2026-01-15',
  },
  {
    id: '2',
    tourName: 'Морская рыбалка на Тихом океане',
    rating: 4,
    text: 'Отличная рыбалка, поймали много рыбы. Хотелось бы чуть больше времени на воде.',
    date: '2025-12-20',
  },
];

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

  // Имитация загрузки данных
  useEffect(() => {
    const timer = setTimeout(() => {
      setReviews(DEMO_REVIEWS);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
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
                    {review.tourName}
                  </h3>
                  <span
                    className="text-sm"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {new Date(review.date).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                <StarRating rating={review.rating} />

                <p
                  className="mt-3 text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {review.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Protected>
  );
}
