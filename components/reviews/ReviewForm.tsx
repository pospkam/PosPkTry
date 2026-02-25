'use client';

import React, { useState } from 'react';
import { LoadingSpinner } from '@/components/admin/shared';
import { Star } from 'lucide-react';

interface ReviewFormProps {
  tourId?: string;
  accommodationId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Вынесенный компонент для рейтинга звёзд с hover эффектом
function StarRatingWithHover({ 
  rating, 
  hoveredRating,
  onChange,
  onHover 
}: { 
  rating: number; 
  hoveredRating: number;
  onChange: (r: number) => void;
  onHover: (r: number) => void;
}) {
  const labels = ['', 'Ужасно', 'Плохо', 'Нормально', 'Хорошо', 'Отлично!'];
  return (
    <div className="flex items-center gap-1 mb-4">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => onHover(star)}
          onMouseLeave={() => onHover(0)}
          className="text-3xl focus:outline-none transition-transform hover:scale-110"
        >
          <Star className={`w-10 h-10 ${
            star <= (hoveredRating || rating)
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-600'
          }`} />
        </button>
      ))}
      <span className="ml-3 text-white/70">
        {labels[hoveredRating || rating]}
      </span>
    </div>
  );
}

export function ReviewForm({
  tourId,
  accommodationId,
  onSuccess,
  onCancel
}: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!comment.trim()) {
      setError('Пожалуйста, напишите отзыв');
      return;
    }

    if (rating < 1 || rating > 5) {
      setError('Оценка должна быть от 1 до 5 звезд');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          accommodationId,
          rating,
          comment: comment.trim()
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Ошибка при отправке отзыва');
      }

      // Успешно отправлено
      setRating(5);
      setComment('');
      onSuccess?.();

    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold text-white mb-6">Оставить отзыв</h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Рейтинг */}
        <div>
          <span className="block text-white/70 mb-2">Ваша оценка</span>
          <StarRatingWithHover 
            rating={rating} 
            hoveredRating={hoveredRating}
            onChange={setRating}
            onHover={setHoveredRating}
          />
        </div>

        {/* Комментарий */}
        <div>
          <label htmlFor="review-comment" className="block text-white/70 mb-2">Ваш отзыв</label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Расскажите о вашем опыте..."
            rows={5}
            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold resize-none"
            required
          />
          <p className="text-xs text-white/50 mt-1">
            Минимум 10 символов
          </p>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || comment.trim().length < 10}
            className="flex-1 px-6 py-3 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner />
                Отправка...
              </span>
            ) : (
              'Отправить отзыв'
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
          )}
        </div>

        <p className="text-xs text-white/50 text-center">
          Отзыв будет опубликован после модерации
        </p>
      </form>
    </div>
  );
}

