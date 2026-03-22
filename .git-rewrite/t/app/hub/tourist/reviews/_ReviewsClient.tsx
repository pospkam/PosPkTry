'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { Protected } from '@/components/auth/Protected';
import { useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  Star,
  Loader2,
  Plus,
  X,
  CheckCircle,
} from 'lucide-react';
import { useApiFetch } from '@/hooks/use-api-fetch';

interface Review {
  id: string;
  tourId: string | null;
  tourName: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

interface ReviewsApiData {
  reviews: Review[];
  total: number;
}

interface TourOption {
  id: string;
  name: string;
}

interface ToursApiData {
  tours: TourOption[];
  pagination: unknown;
}

interface FormState {
  tourId: string;
  rating: number;
  comment: string;
}

const EMPTY_FORM: FormState = { tourId: '', rating: 0, comment: '' };

function transformReviews(d: ReviewsApiData): Review[] {
  return (d?.reviews ?? []).map((r) => ({ ...r, comment: r.comment ?? '' }));
}

function transformTours(d: ToursApiData): TourOption[] {
  return (d?.tours ?? []).map((t) => ({ id: t.id, name: t.name }));
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={`star-${i}`}
          className={`w-4 h-4 ${i < rating ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}
          fill={i < rating ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );
}

interface StarSelectorProps {
  value: number;
  onChange: (val: number) => void;
}

function StarSelector({ value, onChange }: StarSelectorProps) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const starVal = i + 1;
        const filled = hovered > 0 ? starVal <= hovered : starVal <= value;
        return (
          <button
            key={`sel-star-${i}`}
            type="button"
            onClick={() => onChange(starVal)}
            onMouseEnter={() => setHovered(starVal)}
            onMouseLeave={() => setHovered(0)}
            className="p-1 rounded transition-transform hover:scale-110"
            aria-label={`Оценка ${starVal}`}
          >
            <Star
              className={`w-6 h-6 transition-colors ${filled ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}
              fill={filled ? 'currentColor' : 'none'}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function ReviewsClient() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    }>
      <ReviewsContent />
    </Suspense>
  );
}

function ReviewsContent() {
  const searchParams = useSearchParams();
  const tourIdParam = searchParams?.get('tourId') ?? null;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    data: reviews,
    loading,
    error,
    refetch: refetchReviews,
  } = useApiFetch<ReviewsApiData, Review[]>(
    '/api/reviews/my',
    transformReviews,
    { errorMessage: 'Не удалось загрузить отзывы' },
  );

  const {
    data: tours,
    loading: toursLoading,
    refetch: fetchTours,
  } = useApiFetch<ToursApiData, TourOption[]>(
    '/api/tours',
    transformTours,
    { errorMessage: 'Не удалось загрузить список туров', skip: true },
  );

  useEffect(() => {
    if (tourIdParam) {
      setShowForm(true);
      setForm((f) => ({ ...f, tourId: tourIdParam }));
      void fetchTours();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourIdParam]);

  const handleOpenForm = useCallback(() => {
    setShowForm(true);
    setForm(EMPTY_FORM);
    setSubmitError('');
    void fetchTours();
  }, [fetchTours]);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setSubmitError('');
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!form.tourId) {
        setSubmitError('Выберите тур');
        return;
      }
      if (form.rating === 0) {
        setSubmitError('Выберите оценку (от 1 до 5 звёзд)');
        return;
      }
      if (form.comment.trim().length < 10) {
        setSubmitError('Комментарий должен содержать не менее 10 символов');
        return;
      }

      setSubmitting(true);
      setSubmitError('');

      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tourId: form.tourId,
            rating: form.rating,
            comment: form.comment.trim(),
          }),
        });

        const json = (await res.json()) as {
          success: boolean;
          error?: string;
          message?: string;
        };

        if (!json.success) {
          setSubmitError(json.error ?? 'Ошибка при отправке отзыва');
          return;
        }

        setShowForm(false);
        setForm(EMPTY_FORM);
        setSuccessMessage('Отзыв добавлен');
        setTimeout(() => setSuccessMessage(''), 4000);
        await refetchReviews();
      } catch {
        setSubmitError('Не удалось отправить отзыв. Проверьте соединение.');
      } finally {
        setSubmitting(false);
      }
    },
    [form, refetchReviews],
  );

  const list = reviews ?? [];

  return (
    <Protected roles={['tourist', 'admin']}>
      <div className="max-w-5xl mx-auto px-4 py-6 lg:py-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Мои отзывы
          </h1>
          {!showForm && (
            <button
              onClick={handleOpenForm}
              className="ds-btn ds-btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Написать отзыв
            </button>
          )}
        </div>

        {/* Success banner */}
        {successMessage && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg border border-[var(--success)] bg-[var(--bg-card)] text-[var(--success)]">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        )}

        {/* Inline write-review form */}
        {showForm && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg mb-6 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-[var(--text-primary)]">
                Новый отзыв
              </h2>
              <button
                onClick={handleCloseForm}
                type="button"
                className="p-1 rounded text-[var(--text-muted)] hover:opacity-70 transition-opacity"
                aria-label="Закрыть форму"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Tour selector */}
              <div>
                <label className="ds-label block mb-1" htmlFor="review-tour">
                  Тур
                </label>
                {toursLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Загрузка списка туров...
                  </div>
                ) : (
                  <select
                    id="review-tour"
                    className="ds-input w-full"
                    value={form.tourId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tourId: e.target.value }))
                    }
                  >
                    <option value="">Выберите тур</option>
                    {(tours ?? []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Star rating */}
              <div>
                <label className="ds-label block mb-2">Оценка</label>
                <StarSelector
                  value={form.rating}
                  onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
                />
              </div>

              {/* Comment */}
              <div>
                <label className="ds-label block mb-1" htmlFor="review-comment">
                  Комментарий
                </label>
                <textarea
                  id="review-comment"
                  className="ds-input w-full resize-none"
                  rows={4}
                  placeholder="Поделитесь впечатлениями о туре (минимум 10 символов)"
                  value={form.comment}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, comment: e.target.value }))
                  }
                  maxLength={5000}
                />
                <div className="text-right text-xs mt-1 text-[var(--text-muted)]">
                  {form.comment.length} / 5000
                </div>
              </div>

              {submitError && (
                <p className="text-sm text-[var(--danger)]">{submitError}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="ds-btn ds-btn-primary flex items-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    'Отправить отзыв'
                  )}
                </button>
                <button
                  type="button"
                  className="ds-btn ds-btn-secondary"
                  onClick={handleCloseForm}
                  disabled={submitting}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reviews list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <MessageSquare className="w-16 h-16 mb-4 text-[var(--text-muted)]" />
            <p className="text-lg text-[var(--text-muted)]">{error}</p>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <MessageSquare className="w-16 h-16 mb-4 text-[var(--text-muted)]" />
            <p className="text-lg text-[var(--text-muted)]">
              У вас пока нет отзывов
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((review) => (
              <div
                key={review.id}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-base text-[var(--text-primary)]">
                    {review.tourName ?? 'Тур'}
                  </h3>
                  <span className="text-sm text-[var(--text-muted)]">
                    {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                <StarRating rating={review.rating} />

                {review.comment && (
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">
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
