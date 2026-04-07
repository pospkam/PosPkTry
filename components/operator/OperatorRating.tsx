'use client';

import { Star, TrendingUp } from 'lucide-react';

interface OperatorRatingProps {
  rating: number;
  reviewCount: number;
  size?: 'sm' | 'md' | 'lg';
  showDistribution?: boolean;
  trend?: 'up' | 'down' | 'stable' | null;
}

export function OperatorRating({
  rating,
  reviewCount,
  size = 'md',
  showDistribution = false,
  trend,
}: OperatorRatingProps) {
  // Размеры звёзд и шрифта по вариантам
  const sizes = {
    sm: { star: 'w-3.5 h-3.5', rating: 'text-sm', label: 'text-xs' },
    md: { star: 'w-4 h-4', rating: 'text-base', label: 'text-sm' },
    lg: { star: 'w-5 h-5', rating: 'text-lg', label: 'text-base' },
  };

  const s = sizes[size];
  const hasRating = rating > 0;

  // Цвет в зависимости от рейтинга
  const ratingColor =
    rating >= 4.5
      ? 'var(--success)'
      : rating >= 4
        ? 'var(--ocean)'
        : rating >= 3.5
          ? 'var(--warning)'
          : 'var(--danger)';

  return (
    <div className="space-y-2">
      {/* Header row: stars, rating, reviews */}
      <div className="flex items-center gap-3">
        {/* Star icon + rating value */}
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`${s.star} transition-colors`}
                fill={i < Math.round(rating) ? ratingColor : 'none'}
                stroke={i < Math.round(rating) ? ratingColor : 'currentColor'}
                style={{
                  color:
                    i < Math.round(rating)
                      ? ratingColor
                      : 'var(--text-muted)',
                }}
              />
            ))}
          </div>
          <span
            className={`font-semibold ${s.rating}`}
            style={{ color: hasRating ? ratingColor : 'var(--text-muted)' }}
          >
            {hasRating ? rating.toFixed(1) : '—'}
          </span>
        </div>

        {/* Review count + trend */}
        <div className="flex items-center gap-1">
          <span className={`text-[var(--text-muted)] ${s.label}`}>
            {reviewCount > 0
              ? `${reviewCount} ${reviewCount === 1 ? 'отзыв' : reviewCount < 5 ? 'отзыва' : 'отзывов'}`
              : 'нет отзывов'}
          </span>
          {trend === 'up' && (
            <TrendingUp className="w-3.5 h-3.5 text-[var(--success)]" />
          )}
        </div>
      </div>

      {/* Visual rating bar (only for md/lg) */}
      {(size === 'md' || size === 'lg') && hasRating && (
        <div className="w-full bg-[var(--bg-hover)] rounded-full overflow-hidden h-2">
          <div
            className="h-full transition-all duration-500 rounded-full"
            style={{
              width: `${(rating / 5) * 100}%`,
              backgroundColor: ratingColor,
            }}
          />
        </div>
      )}

      {/* Star distribution (optional) */}
      {showDistribution && hasRating && (
        <div className="text-xs text-[var(--text-muted)] space-y-1 mt-3 pl-1">
          {[5, 4, 3, 2, 1].map(stars => {
            // Примерное распределение (в реальности нужно из БД)
            const percent = Math.round((rating / 5 - 0.1) * 30 + (5 - stars) * 15);
            return (
              <div key={stars} className="flex items-center gap-2">
                <span className="w-4 font-medium">{stars}★</span>
                <div className="flex-1 h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)]/50"
                    style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
