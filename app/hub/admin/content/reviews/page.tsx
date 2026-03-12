'use client';

import React, { useState, useEffect } from 'react';
import {
  DataTable,
  Pagination,
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  Column
} from '@/components/admin/shared';
import { Star, Sparkles, Loader2, MessageSquareText } from 'lucide-react';

interface AdminReview {
  id: string;
  userId: string;
  userName: string;
  tourId: string;
  tourName: string;
  rating: number;
  comment: string;
  isVerified: boolean;
  createdAt: Date;
}

interface AiAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  spamProbability: number;
  summary: string;
}

export default function ReviewsManagement() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [verifiedFilter, setVerifiedFilter] = useState('all');
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, AiAnalysis>>({});

  useEffect(() => {
    fetchReviews();
  }, [currentPage, verifiedFilter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage.toString(), limit: '20' });
      if (verifiedFilter !== 'all') params.append('verified', verifiedFilter);

      const response = await fetch(`/api/admin/content/reviews?${params}`);
      const result = await response.json();
      if (result.success) {
        setReviews(result.data.data);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (reviewId: string, action: 'approve' | 'delete') => {
    if (action === 'delete' && !confirm('Вы уверены, что хотите удалить этот отзыв?')) return;
    try {
      const response = await fetch(`/api/admin/content/reviews/${reviewId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (response.ok) fetchReviews();
    } catch {
      // ignore
    }
  };

  const handleAnalyze = async (reviewId: string) => {
    if (analyzing) return;
    setAnalyzing(reviewId);
    try {
      const response = await fetch(`/api/admin/content/reviews/${reviewId}/analyze`, {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        setAnalyses(prev => ({ ...prev, [reviewId]: result.data }));
      }
    } catch {
      // ignore
    } finally {
      setAnalyzing(null);
    }
  };

  const columns: Column<AdminReview>[] = [
    {
      key: 'userName',
      title: 'Пользователь',
      render: (review) => <span className="text-[var(--text-primary)]">{review.userName}</span>
    },
    {
      key: 'tourName',
      title: 'Тур',
      render: (review) => <span className="text-[var(--text-secondary)]">{review.tourName}</span>
    },
    {
      key: 'rating',
      title: 'Оценка',
      render: (review) => (
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star
              key={`star-${i}`}
              className={`w-3.5 h-3.5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-[var(--text-muted)]/30'}`}
              strokeWidth={1.5}
            />
          ))}
        </div>
      )
    },
    {
      key: 'comment',
      title: 'Комментарий',
      render: (review) => (
        <p className="text-[var(--text-secondary)] max-w-md truncate text-xs">{review.comment || '—'}</p>
      )
    },
    {
      key: 'isVerified',
      title: 'Статус',
      render: (review) => <StatusBadge status={review.isVerified ? 'success' : 'pending'} />
    },
    {
      key: 'createdAt',
      title: 'Дата',
      render: (review) => (
        <span className="text-[var(--text-muted)] text-xs font-mono">
          {new Date(review.createdAt).toLocaleDateString('ru-RU')}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (review) => (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <button
              onClick={() => handleAnalyze(review.id)}
              disabled={analyzing === review.id}
              className="px-2.5 py-1 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] rounded text-[10px] font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {analyzing === review.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              AI
            </button>
            {!review.isVerified && (
              <button
                onClick={() => handleModerate(review.id, 'approve')}
                className="px-2.5 py-1 bg-[var(--success)]/10 hover:bg-[var(--success)]/20 text-[var(--success)] rounded text-[10px] font-medium transition-colors"
              >
                Одобрить
              </button>
            )}
            <button
              onClick={() => handleModerate(review.id, 'delete')}
              className="px-2.5 py-1 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 text-[var(--danger)] rounded text-[10px] font-medium transition-colors"
            >
              Удалить
            </button>
          </div>
          {analyses[review.id] && (
            <div className="flex items-center gap-2 text-[10px]">
              <span className={`px-1.5 py-0.5 rounded font-medium ${
                analyses[review.id].sentiment === 'positive' ? 'bg-[var(--success)]/10 text-[var(--success)]' :
                analyses[review.id].sentiment === 'negative' ? 'bg-[var(--danger)]/10 text-[var(--danger)]' :
                'bg-[var(--bg-hover)] text-[var(--text-muted)]'
              }`}>
                {analyses[review.id].sentiment === 'positive' ? 'Позитив' :
                 analyses[review.id].sentiment === 'negative' ? 'Негатив' : 'Нейтрал'}
              </span>
              <span className="text-[var(--text-muted)]">
                Спам: {Math.round(analyses[review.id].spamProbability * 100)}%
              </span>
              <span className="text-[var(--text-secondary)] truncate max-w-[180px]">
                {analyses[review.id].summary}
              </span>
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MessageSquareText className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Модерация отзывов</h1>
        </div>
        <select
          value={verifiedFilter}
          onChange={(e) => { setVerifiedFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="all">Все отзывы</option>
          <option value="true">Одобренные</option>
          <option value="false">На модерации</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="Загрузка отзывов..." />
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState title="Отзывы не найдены" description="Отзывов для модерации пока нет" />
      ) : (
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
            <DataTable columns={columns} data={reviews} />
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
}
