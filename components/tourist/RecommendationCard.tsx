'use client';

import React from 'react';
import type { RecommendedTour, RecommendationStrategy } from '@/lib/recommendations/engine';

interface RecommendationCardProps {
  tour: RecommendedTour;
  onCardClick?: (tourId: string, strategy: RecommendationStrategy) => void;
}

const STRATEGY_BADGES: Record<RecommendationStrategy, { icon: string; color: string }> = {
  SIMILAR_USERS: { icon: '👥', color: 'from-blue-500/30 to-blue-600/20 border-blue-400/30' },
  TOUR_CONTENT: { icon: '🎯', color: 'from-purple-500/30 to-purple-600/20 border-purple-400/30' },
  ECO_OPTIMIZED: { icon: '🌿', color: 'from-green-500/30 to-green-600/20 border-green-400/30' },
};

/** Скелетон загрузки */
export function RecommendationCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 animate-pulse">
      <div className="h-40 bg-white/10" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/10 rounded w-full" />
        <div className="h-3 bg-white/10 rounded w-2/3" />
        <div className="h-8 bg-white/10 rounded-xl mt-3" />
      </div>
    </div>
  );
}

export default function RecommendationCard({ tour, onCardClick }: RecommendationCardProps) {
  const badge = STRATEGY_BADGES[tour.strategy];

  const handleClick = () => {
    // Трекинг клика
    fetch('/api/analytics/recommendation-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tourId: tour.id, strategy: tour.strategy }),
    }).catch(() => {}); // fire and forget

    onCardClick?.(tour.id, tour.strategy);

    // Переход на страницу тура
    window.location.href = `/tours/${tour.id}`;
  };

  const mainImage = Array.isArray(tour.images) && tour.images.length > 0
    ? tour.images[0]
    : null;

  return (
    <article
      role="article"
      onClick={handleClick}
      className="
        group relative rounded-2xl overflow-hidden
        bg-white/5 border border-white/10
        hover:border-white/25 hover:bg-white/10
        cursor-pointer transition-all duration-300
        hover:shadow-lg hover:shadow-black/20
        hover:-translate-y-0.5
      "
    >
      {/* Фото */}
      <div className="relative h-44 overflow-hidden bg-white/5">
        {mainImage ? (
          <img
            src={mainImage}
            alt={`Фото тура: ${tour.title}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">
            🏔️
          </div>
        )}

        {/* Eco-баллы badge */}
        {tour.eco_points_reward && tour.eco_points_reward > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-green-500/80 text-white text-xs font-semibold backdrop-blur-sm">
            🌿 +{tour.eco_points_reward} эко
          </div>
        )}
      </div>

      {/* Контент */}
      <div className="p-4">
        {/* Стратегия badge */}
        <div
          className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
            bg-gradient-to-r border backdrop-blur-sm mb-2
            ${badge.color}
          `}
        >
          <span>{badge.icon}</span>
          <span className="text-white/80">{tour.strategyLabel}</span>
        </div>

        <h3 className="text-sm font-semibold text-white line-clamp-2 mb-1 group-hover:text-blue-300 transition-colors">
          {tour.title}
        </h3>

        {tour.description && (
          <p className="text-xs text-white/50 line-clamp-2 mb-3">
            {tour.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-white/50">
            {tour.duration && <span>⏱ {tour.duration} дн.</span>}
            {tour.difficulty && (
              <span className="capitalize">
                {tour.difficulty === 'easy'
                  ? '🟢'
                  : tour.difficulty === 'moderate'
                  ? '🟡'
                  : '🔴'}{' '}
                {tour.difficulty === 'easy'
                  ? 'лёгкий'
                  : tour.difficulty === 'moderate'
                  ? 'средний'
                  : 'экстремальный'}
              </span>
            )}
          </div>

          {tour.price && (
            <span className="text-sm font-bold text-white">
              {tour.price.toLocaleString('ru-RU')} ₽
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
