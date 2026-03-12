'use client';

import React, { useState, useEffect } from 'react';
import { AdminProtected } from '@/components/auth/AdminProtected';
import { AdminNav } from '@/components/admin/AdminNav';
import {
  DataTable,
  Pagination,
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  Column
} from '@/components/admin/shared';
import { Star, Sparkles, Loader2 } from 'lucide-react';

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
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (verifiedFilter !== 'all') params.append('verified', verifiedFilter);

      const response = await fetch(`/api/admin/content/reviews?${params}`);
      const result = await response.json();

      if (result.success) {
        setReviews(result.data.data);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (reviewId: string, action: 'approve' | 'delete') => {
    if (action === 'delete' && !confirm('Вы уверены, что хотите удалить этот отзыв?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/content/reviews/${reviewId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        fetchReviews();
      }
    } catch (error) {
      console.error('Error moderating review:', error);
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
      render: (review) => (
        <span className="text-white/80">{review.userName}</span>
      )
    },
    {
      key: 'tourName',
      title: 'Тур',
      render: (review) => (
        <span className="text-white/80">{review.tourName}</span>
      )
    },
    {
      key: 'rating',
      title: 'Оценка',
      render: (review) => (
        <div className="flex">
          {[...Array(5)].map((_, starIndex) => (
            <Star
              key={`star-${starIndex}`}
              className={`w-4 h-4 ${starIndex < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`}
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
        <p className="text-white/80 max-w-md truncate">
          {review.comment || '—'}
        </p>
      )
    },
    {
      key: 'isVerified',
      title: 'Статус',
      render: (review) => (
        <StatusBadge status={review.isVerified ? 'success' : 'pending'} />
      )
    },
    {
      key: 'createdAt',
      title: 'Дата',
      render: (review) => (
        <span className="text-white/60 text-sm">
          {new Date(review.createdAt).toLocaleDateString('ru-RU')}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (review) => (
        <div className="space-y-2">
          <div className="flex space-x-2">
            <button
              onClick={() => handleAnalyze(review.id)}
              disabled={analyzing === review.id}
              className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {analyzing === review.id ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              AI Анализ
            </button>
            {!review.isVerified && (
              <button
                onClick={() => handleModerate(review.id, 'approve')}
                className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-colors"
              >
                Одобрить
              </button>
            )}
            <button
              onClick={() => handleModerate(review.id, 'delete')}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors"
            >
              Удалить
            </button>
          </div>
          {analyses[review.id] && (
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                analyses[review.id].sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                analyses[review.id].sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {analyses[review.id].sentiment === 'positive' ? 'Позитив' :
                 analyses[review.id].sentiment === 'negative' ? 'Негатив' : 'Нейтрал'}
              </span>
              <span className="text-white/50">
                Спам: {Math.round(analyses[review.id].spamProbability * 100)}%
              </span>
              <span className="text-white/60 truncate max-w-[200px]">
                {analyses[review.id].summary}
              </span>
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <AdminProtected>
      <main className="min-h-screen bg-transparent text-white">
        <AdminNav />
        
        {/* Header */}
        <div className="bg-white/15 border-b border-white/15 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-black text-white">
                  Модерация отзывов
                </h1>
                <p className="text-white/70 mt-1">
                  Одобрение и удаление отзывов пользователей
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <select
                value={verifiedFilter}
                onChange={(e) => {
                  setVerifiedFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyber-cyan/60"
              >
                <option value="all">Все отзывы</option>
                <option value="true">Одобренные</option>
                <option value="false">На модерации</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" message="Загрузка отзывов..." />
            </div>
          ) : reviews.length === 0 ? (
            <EmptyState
              title="Отзывы не найдены"
              description="Отзывов для модерации пока нет"
            />
          ) : (
            <div className="space-y-6">
              <DataTable
                columns={columns}
                data={reviews}
              />

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </main>
    </AdminProtected>
  );
}

