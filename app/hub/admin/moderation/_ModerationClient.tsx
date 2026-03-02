'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { Shield, Check, X, Loader2, Star, Flag, MessageSquare } from 'lucide-react';

interface PendingReview { id: string; touristName: string; tourName: string; rating: number; text: string; date: string; flagged: boolean; }

export default function ModerationClient() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<PendingReview[]>([]);

  useEffect(() => {
    // Загрузка очереди модерации
    setTimeout(() => {
      setReviews([
        { id: '1', touristName: 'Анна М.', tourName: 'Восхождение на Авачинский', rating: 5, text: 'Потрясающий тур! Виды с вершины незабываемые. Гид -- профессионал.', date: '2026-02-25', flagged: false },
        { id: '2', touristName: 'user123', tourName: 'Рыбалка на реке', rating: 1, text: 'Этот отзыв содержит подозрительный контент и может быть спамом.', date: '2026-02-24', flagged: true },
        { id: '3', touristName: 'Дмитрий К.', tourName: 'Долина гейзеров', rating: 4, text: 'Отличная экскурсия, но дорого. Рекомендую брать тёплую одежду.', date: '2026-02-23', flagged: false },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  function approve(id: string) { setReviews(prev => prev.filter(r => r.id !== id)); }
  function reject(id: string) { setReviews(prev => prev.filter(r => r.id !== id)); }

  const pendingCount = reviews.length;
  const flaggedCount = reviews.filter(r => r.flagged).length;

  return (
    <Protected roles={['admin']}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Модерация</h1>
          {pendingCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--warning)]/15 text-[var(--warning)]">{pendingCount} ожидают</span>}
          {flaggedCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--danger)]/15 text-[var(--danger)]">{flaggedCount} жалобы</span>}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" /></div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">Очередь модерации пуста</p>
            <p className="text-sm text-[var(--text-muted)]">Все отзывы проверены</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => (
              <div key={review.id} className={`bg-[var(--bg-card)] border rounded-xl p-4 ${review.flagged ? 'border-[var(--danger)]/30' : 'border-[var(--border)]'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[var(--text-primary)]">{review.touristName}</span>
                      {review.flagged && <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--danger)]/15 text-[var(--danger)] inline-flex items-center gap-1"><Flag className="w-3 h-3" />Жалоба</span>}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-muted)]'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-2">{review.tourName} | {new Date(review.date).toLocaleDateString('ru-RU')}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{review.text}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => approve(review.id)} className="min-h-[44px] px-3 py-2 rounded-xl bg-[var(--success)] text-white text-sm font-medium inline-flex items-center gap-1 hover:opacity-90">
                      <Check className="w-4 h-4" /> Одобрить
                    </button>
                    <button onClick={() => reject(review.id)} className="min-h-[44px] px-3 py-2 rounded-xl bg-[var(--danger)] text-white text-sm font-medium inline-flex items-center gap-1 hover:opacity-90">
                      <X className="w-4 h-4" /> Отклонить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Protected>
  );
}
