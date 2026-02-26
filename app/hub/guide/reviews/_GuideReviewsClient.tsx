'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { Star, MessageSquare, Loader2, TrendingUp } from 'lucide-react';

interface Review {
  id: string;
  touristName: string;
  tourName: string;
  rating: number;
  text: string;
  date: string;
}

export default function GuideReviewsClient() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<number>(0);

  useEffect(() => {
    // Загрузка отзывов гида
    setTimeout(() => {
      setReviews([
        { id: '1', touristName: 'Анна М.', tourName: 'Восхождение на Авачинский', rating: 5, text: 'Отличный гид! Всё рассказал про вулкан, обеспечил безопасность группы.', date: '2026-02-20' },
        { id: '2', touristName: 'Дмитрий К.', tourName: 'Рыбалка на Жупанова', rating: 4, text: 'Хорошая организация, но погода подвела. Гид нашёл отличное место.', date: '2026-02-15' },
        { id: '3', touristName: 'Елена С.', tourName: 'Долина гейзеров', rating: 5, text: 'Незабываемый опыт! Иван -- лучший гид на Камчатке.', date: '2026-02-10' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  const filtered = filter > 0 ? reviews.filter(r => r.rating === filter) : reviews;

  return (
    <Protected roles={['guide', 'admin']}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="w-6 h-6 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Отзывы</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" /></div>
        ) : (
          <>
            {/* Средний рейтинг */}
            <div className="flex items-center gap-6 mb-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
              <div className="text-center">
                <p className="text-4xl font-bold text-[var(--text-primary)]">{avgRating}</p>
                <div className="flex items-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(Number(avgRating)) ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-muted)]'}`} />
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">{reviews.length} отзывов</p>
              </div>
              <div className="flex items-center gap-2 text-[var(--success)]">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-medium">Высокий рейтинг</span>
              </div>
            </div>

            {/* Фильтр по рейтингу */}
            <div className="flex gap-2 mb-4">
              {[0, 5, 4, 3, 2, 1].map(r => (
                <button
                  key={r}
                  onClick={() => setFilter(r)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-sm transition-colors ${
                    filter === r
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {r === 0 ? 'Все' : `${r} \u2605`}
                </button>
              ))}
            </div>

            {/* Список отзывов */}
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)]">Нет отзывов с таким рейтингом</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(review => (
                  <div key={review.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{review.touristName}</p>
                        <p className="text-xs text-[var(--text-muted)]">{review.tourName}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-muted)]'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mb-2">{review.text}</p>
                    <p className="text-xs text-[var(--text-muted)]">{new Date(review.date).toLocaleDateString('ru-RU')}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Protected>
  );
}
