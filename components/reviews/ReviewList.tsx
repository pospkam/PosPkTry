'use client';

import React from 'react';
import { Review } from '@/types';

interface ReviewListProps {
  reviews: Review[];
  showAddButton?: boolean;
  onAddReview?: () => void;
}

export function ReviewList({ reviews, showAddButton, onAddReview }: ReviewListProps) {
  if (reviews.length === 0 && !showAddButton) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
        <div className="text-6xl mb-4">⭐</div>
        <p className="text-white/70">Пока нет отзывов</p>
        <p className="text-white/50 text-sm mt-2">Будьте первым, кто оставит отзыв!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showAddButton && (
        <button
          onClick={onAddReview}
          className="w-full px-6 py-4 bg-premium-gold/20 hover:bg-premium-gold/30 border border-premium-gold/50 text-premium-gold rounded-xl font-semibold transition-colors"
        >
          ✍️ Оставить отзыв
        </button>
      )}

      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-yellow-400 text-lg">
                    {'★'.repeat(review.rating)}
                    <span className="text-gray-600">{'★'.repeat(5 - review.rating)}</span>
                  </span>
                  <span className="text-white font-semibold">
                    {review.rating === 5 ? 'Отлично!' : 
                     review.rating === 4 ? 'Хорошо' : 
                     review.rating === 3 ? 'Нормально' : 
                     review.rating === 2 ? 'Плохо' : 'Ужасно'}
                  </span>
                </div>
                <p className="text-white/50 text-sm">
                  {new Date(review.createdAt).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {review.isVerified && (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                  <span>✓</span>
                  <span>Проверен</span>
                </span>
              )}
            </div>

            {/* Comment */}
            <p className="text-white/80 leading-relaxed mb-4">
              {review.comment}
            </p>

            {/* Images */}
            {review.images && review.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {review.images.map((image, idx) => (
                  <img
                    key={idx}
                    src={image.url}
                    alt={image.alt || `Review image ${idx + 1}`}
                    className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

