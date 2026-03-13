'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Users, Target, Leaf, Mountain, Clock, Circle } from 'lucide-react';
import type { RecommendedTour, RecommendationStrategy } from '@/lib/recommendations/engine';

interface RecommendationCardProps {
  tour: RecommendedTour;
  onCardClick?: (tourId: string, strategy: RecommendationStrategy) => void;
}

const STRATEGY_BADGES: Record<RecommendationStrategy, { icon: React.ReactNode; label: string }> = {
  SIMILAR_USERS: { icon: <Users className="w-3.5 h-3.5" />, label: 'Похожие пользователи' },
  TOUR_CONTENT: { icon: <Target className="w-3.5 h-3.5" />, label: 'По содержанию' },
  ECO_OPTIMIZED: { icon: <Leaf className="w-3.5 h-3.5" />, label: 'Эко-выбор' },
};

/** Скелетон загрузки */
export function RecommendationCardSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] animate-pulse">
      <div className="h-40 bg-[var(--bg-hover)]" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-[var(--bg-hover)] rounded w-3/4" />
        <div className="h-3 bg-[var(--bg-hover)] rounded w-full" />
        <div className="h-3 bg-[var(--bg-hover)] rounded w-2/3" />
        <div className="h-8 bg-[var(--bg-hover)] rounded-lg mt-3" />
      </div>
    </div>
  );
}

export default function RecommendationCard({ tour, onCardClick }: RecommendationCardProps) {
  const badge = STRATEGY_BADGES[tour.strategy];

  const handleClick = () => {
    fetch('/api/analytics/recommendation-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tourId: tour.id, strategy: tour.strategy }),
    }).catch(() => {});

    onCardClick?.(tour.id, tour.strategy);
  };

  const mainImage = Array.isArray(tour.images) && tour.images.length > 0
    ? tour.images[0]
    : null;

  return (
    <Link
      href={`/tours/${tour.id}`}
      onClick={handleClick}
      className="
        group relative rounded-lg overflow-hidden
        bg-[var(--bg-card)] border border-[var(--border)]
        hover:border-[var(--accent)] hover:bg-[var(--bg-hover)]
        cursor-pointer transition-all duration-200
        hover:-translate-y-0.5 block
      "
    >
      {/* Photo */}
      <div className="relative h-44 overflow-hidden bg-[var(--bg-hover)]">
        {mainImage ? (
          <Image
            src={mainImage}
            alt={`Фото тура: ${tour.title}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Mountain className="w-16 h-16 text-[var(--text-muted)]" />
          </div>
        )}

        {tour.eco_points_reward && tour.eco_points_reward > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-[var(--success)] text-[var(--bg-card)] text-xs font-semibold flex items-center gap-1">
            <Leaf className="w-3 h-3" /> +{tour.eco_points_reward} эко
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-hover)] border border-[var(--border)] mb-2">
          <span className="text-[var(--accent)]">{badge.icon}</span>
          <span className="text-[var(--text-secondary)]">{tour.strategyLabel ?? badge.label}</span>
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
    </Link>
  );
}
