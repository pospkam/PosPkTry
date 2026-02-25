'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { LoadingSpinner } from '@/components/admin/shared';
import { Star } from 'lucide-react';

interface ReviewFormProps {
  tourId?: string;
  accommodationId?: string;
  transferId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Вынесенный компонент для рейтинга звёзд
function StarRating({ rating, onChange }: { rating: number; onChange: (r: number) => void }) {
  return (
    <div className="flex items-center gap-1 mb-4">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="text-2xl focus:outline-none"
        >
          <Star className={`w-8 h-8 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
      <span className="ml-2 text-white/70">{rating}/5</span>
    </div>
  );
}

export function ReviewForm({
  tourId,
  accommodationId,
  transferId,
  onSuccess,
  onCancel
}: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<File[]>([]);
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
      const formData = new FormData();
      formData.append('rating', rating.toString());
      formData.append('comment', comment.trim());

      if (tourId) formData.append('tourId', tourId);
      if (accommodationId) formData.append('accommodationId', accommodationId);
      if (transferId) formData.append('transferId', transferId);

      // Добавляем изображения
      images.forEach((image, index) => {
        formData.append(`images`, image);
      });

      const response = await fetch('/api/reviews', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Ошибка при отправке отзыва');
      }

      // Успешно отправлено
      alert('Спасибо за отзыв! Он будет опубликован после модерации.');
      onSuccess?.();

      // Сброс формы
      setRating(5);
      setComment('');
      setImages([]);

    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files);
      if (images.length + newImages.length > 5) {
        setError('Можно загрузить максимум 5 изображений');
        return;
      }
      setImages([...images, ...newImages]);
      setError(null);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
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
          <StarRating rating={rating} onChange={setRating} />
        </div>

        {/* Комментарий */}
        <div>
          <label htmlFor="review-comment" className="block text-white/70 mb-2">Ваш отзыв</label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Расскажите о вашем опыте..."
            rows={4}
            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold resize-none"
            required
          />
        </div>

        {/* Изображения */}
        <div>
          <label htmlFor="review-images" className="block text-white/70 mb-2">Фотографии (опционально)</label>
          <input
            id="review-images"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="block w-full text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-premium-gold file:text-premium-black hover:file:bg-premium-gold/80"
          />
          <p className="text-xs text-white/50 mt-1">
            Максимум 5 изображений, до 10MB каждое
          </p>

          {/* Предпросмотр изображений */}
          {images.length > 0 && (
            <div className="grid grid-cols-5 gap-2 mt-3">
              {images.map((image) => (
                <div key={image.name} className="relative">
                  <Image
                    src={URL.createObjectURL(image)}
                    alt="Preview"
                    width={64}
                    height={64}
                    className="w-full h-16 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(images.indexOf(image))}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
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
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
            >
              Отмена
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
