'use client';

import { useEffect, useState, useCallback } from 'react';
import { Protected } from '@/components/auth/Protected';
import { Shield, Check, X, Loader2, Star, Flag, MessageSquare, AlertCircle } from 'lucide-react';

interface PendingReview {
  id: string; touristName: string; tourName: string;
  rating: number; text: string; date: string;
}

export default function ModerationClient() {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [reviews, setReviews]   = useState<PendingReview[]>([]);
  const [acting, setActing]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/content/reviews?verified=false&limit=50');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки');
      const rows = json.data?.data ?? [];
      setReviews(rows.map((r: {
        id: string; userName: string; tourName: string;
        rating: number; comment: string; createdAt: string;
      }) => ({
        id: r.id,
        touristName: r.userName,
        tourName: r.tourName,
        rating: r.rating,
        text: r.comment,
        date: r.createdAt,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function moderate(id: string, action: 'approve' | 'delete') {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/content/reviews/${id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setActing(null);
    }
  }

  return (
    <Protected roles={['admin']}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Модерация</h1>
          {!loading && reviews.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--warning)]/15 text-[var(--warning)]">
              {reviews.length} ожидают
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-[var(--danger)]" />
            <p className="text-[var(--text-secondary)] text-sm">{error}</p>
            <button onClick={load} className="text-sm text-[var(--accent)] underline">Повторить</button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">Очередь модерации пуста</p>
            <p className="text-sm text-[var(--text-muted)]">Все отзывы проверены</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => (
              <div key={review.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[var(--text-primary)]">{review.touristName}</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-[var(--warning)] fill-[var(--warning)]' : 'text-[var(--text-muted)]'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-2">
                      {review.tourName} | {new Date(review.date).toLocaleDateString('ru-RU')}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">{review.text}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => moderate(review.id, 'approve')}
                      disabled={acting === review.id}
                      className="min-h-[44px] px-3 py-2 rounded-lg bg-[var(--success)] text-[var(--text-primary)] text-sm font-medium inline-flex items-center gap-1 hover:opacity-90 disabled:opacity-50"
                    >
                      {acting === review.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Одобрить
                    </button>
                    <button
                      onClick={() => moderate(review.id, 'delete')}
                      disabled={acting === review.id}
                      className="min-h-[44px] px-3 py-2 rounded-lg bg-[var(--danger)] text-[var(--text-primary)] text-sm font-medium inline-flex items-center gap-1 hover:opacity-90 disabled:opacity-50"
                    >
                      {acting === review.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      Отклонить
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
