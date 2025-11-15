'use client';

import React from 'react';
import { Tour } from '@/types';
// import { formatCurrency, formatDuration, formatRating } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TourCardProps {
  tour: Tour;
  className?: string;
  onClick?: () => void;
}

export function TourCard({ tour, className, onClick }: TourCardProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDuration = (duration: string) => {
    return duration;
  };

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'Легкий';
      case 'medium':
        return 'Средний';
      case 'hard':
        return 'Сложный';
      default:
        return difficulty;
    }
  };

  return (
    <div
      className={cn(
        'bg-white/10 border-2 border-white/20 rounded-3xl overflow-hidden hover:bg-white/15 transition-all duration-500 cursor-pointer group hover:scale-105 hover:shadow-2xl',
        className
      )}
      onClick={onClick}
    >
      {/* Изображение тура с overlay */}
      <div className="relative h-56 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
        {tour.images && tour.images.length > 0 ? (
          <>
            <img
              src={tour.images[0]}
              alt={tour.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            {/* Градиентный overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-green-100">
            <div className="text-center">
              <div className="text-4xl mb-2">🏔️</div>
              <div className="text-gray-600 text-sm">{tour.title}</div>
            </div>
          </div>
        )}
        
        {/* Сложность - улучшенный бейдж */}
        <div className="absolute top-4 left-4">
          <span
            className={cn(
              'px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg'
            )}
          >
            {getDifficultyText(tour.difficulty)}
          </span>
        </div>
        
        {/* Рейтинг - улучшенный */}
        {tour.rating > 0 && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex items-center space-x-2 shadow-lg">
            <span className="text-yellow-400 text-lg">⭐</span>
            <span className="text-base font-bold text-white">{tour.rating}</span>
            <span className="text-sm text-white/80">({tour.reviewsCount})</span>
          </div>
        )}
      </div>

      {/* Контент карточки - улучшенный */}
      <div className="p-6 sm:p-8">
        {/* Название */}
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 line-clamp-2 group-hover:text-cyan-200 transition-colors duration-300">
          {tour.title}
        </h3>
        
        {/* Цена - более заметная */}
        <div className="mb-4 p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl border border-amber-400/30">
          <div className="text-sm text-amber-200 mb-1">Стоимость</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
              {formatCurrency(tour.priceFrom, 'RUB')}
            </span>
            <span className="text-sm text-white/70">за человека</span>
          </div>
        </div>

        {/* Описание */}
        <p className="text-white/70 text-sm mb-4 line-clamp-2">
          {tour.description}
        </p>

        {/* Детали тура */}
        <div className="space-y-2 mb-4">
          {/* Продолжительность */}
          <div className="flex items-center text-sm text-white/70">
            <span className="mr-2">⏱️</span>
            <span>{tour.duration}</span>
          </div>

          {/* Размер группы */}
          <div className="flex items-center text-sm text-white/70">
            <span className="mr-2">👥</span>
            <span>
              {tour.minParticipants === tour.maxParticipants
                ? `${tour.minParticipants} чел.`
                : `${tour.minParticipants}-${tour.maxParticipants} чел.`}
            </span>
          </div>

          {/* Сезон */}
          {tour.activity && (
            <div className="flex items-center text-sm text-white/70">
              <span className="mr-2">🌿</span>
              <span>Круглый год</span>
            </div>
          )}
        </div>

        {/* Оператор */}
        {tour.operator && (
          <div className="flex items-center text-sm text-white/70 mb-4">
            <span className="mr-2">🏢</span>
            <span>{tour.operator.name}</span>
            {tour.operator.rating > 0 && (
              <span className="ml-2 text-premium-gold">
                ⭐ {formatRating(tour.operator.rating)}
              </span>
            )}
          </div>
        )}

        {/* Кнопка бронирования - улучшенная */}
        <button
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/50 hover:scale-105 flex items-center justify-center gap-2 group/btn"
          onClick={(e) => {
            e.stopPropagation();
            // Здесь будет логика бронирования
          }}
        >
          <span>Забронировать</span>
          <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}