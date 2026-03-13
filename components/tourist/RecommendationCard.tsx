'use client';

import React from 'react';
import Image from 'next/image';
import { Users, Target, Leaf, Mountain, Clock, Circle } from 'lucide-react';
import type { RecommendedTour, RecommendationStrategy } from '@/lib/recommendations/engine';

interface RecommendationCardProps {
  tour: RecommendedTour;
  onCardClick?: (tourId: string, strategy: RecommendationStrategy) => void;
}

const STRATEGY_BADGES: Record<RecommendationStrategy, { icon: React.ReactNode; color: string }> = {
  SIMILAR_USERS: { icon: <Users className="w-4 h-4" />, color: 'from-blue-500/30 to-blue-600/20 border-blue-400/30' },
  TOUR_CONTENT: { icon: <Target className="w-4 h-4" />, color: 'from-purple-500/30 to-purple-600/20 border-purple-400/30' },
  ECO_OPTIMIZED: { icon: <Leaf className="w-4 h-4" />, color: 'from-green-500/30 to-green-600/20 border-green-400/30' },
};

/** Скелетон загрузки */
export function RecommendationCardSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] animate-pulse">
      <div className="h-40 bg-[var(--bg-card)]" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-[var(--bg-card)] rounded w-3/4" />
        <div className="h-3 bg-[var(--bg-card)] rounded w-full" />
        <div className="h-3 bg-[var(--bg-card)] rounded w-2/3" />
        <div className="h-8 bg-[var(--bg-card)] rounded-lg mt-3" />
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
        group relative rounded-lg overflow-hidden
        bg-[var(--bg-card)] border border-[var(--border)]
        hover:border-[var(--accent)]/50 hover:bg-[var(--bg-hover)]
        cursor-pointer transition-all duration-300
        hover:shadow-xl hover:shadow-[var(--accent)]/10
        hover:-translate-y-0.5
      "
    >
      {/* Фото */}
      <div className="relative h-44 overflow-hidden bg-[var(--bg-card)]">
        {mainImage ? (
          <Image
            src={mainImage}
            alt={`Фото тура: ${tour.title}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-30">
            <Mountain className="w-16 h-16" />
          </div>
        )}

        {/* Eco-баллы badge */}
        {tour.eco_points_reward && tour.eco_points_reward > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-[var(--success)]/80 text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1">
            <Leaf className="w-3 h-3" /> +{tour.eco_points_reward} эко
          </div>
        )}
      </div>

      {/* Контент */}
      <div className="p-4">
        {/* Стратегия badge */}
        <div
          className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
            bg-gradient-to-r border mb-2
            ${badge.color}
          `}
        >
          <span>{badge.icon}</span>
          <span className="text-[var(--text-secondary)]">{tour.strategyLabel}</span>
        </div>

        <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 mb-1 group-hover:text-[var(--accent)] transition-colors">
          {tour.title}
        </h3>

        {tour.description && (
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">
            {tour.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            {tour.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {tour.duration} дн.</span>}
            {tour.difficulty && (
              <span className="capitalize flex items-center gap-1">
                <Circle className={`w-2.5 h-2.5 fill-current ${
                  tour.difficulty === 'easy' ? 'text-[var(--success)]' :
                  tour.difficulty === 'moderate' ? 'text-[var(--warning)]' : 'text-[var(--danger)]'
                }`} />
                {tour.difficulty === 'easy'
                  ? 'лёгкий'
                  : tour.difficulty === 'moderate'
                  ? 'средний'
                  : 'экстремальный'}
              </span>
            )}
          </div>

          {tour.price && (
            <span className="text-sm font-bold text-[var(--accent)]">
              {tour.price.toLocaleString('ru-RU')} ₽
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
