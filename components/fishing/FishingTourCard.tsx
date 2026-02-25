'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Fish, 
  MapPin, 
  Clock, 
  Users, 
  Star, 
  Calendar,
  Waves,
  Mountain
} from 'lucide-react';

export interface FishingTourData {
  id: string;
  name: string;
  description: string;
  price: number;
  priceOld?: number;
  duration: number; // дней
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  fishTypes: string[];
  season: {
    start: string;
    end: string;
  };
  maxParticipants: number;
  minParticipants?: number;
  includes: string[];
  notIncluded?: string[];
  requirements: string[];
  images: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  rating?: number;
  reviewsCount?: number;
  partner?: string;
  type?: 'daily' | 'multi' | 'family';
}

interface FishingTourCardProps {
  tour: FishingTourData;
  onBook?: (tourId: string) => void;
}

// Используем Lucide Fish вместо emoji

export function FishingTourCard({ tour, onBook }: FishingTourCardProps) {
  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return { text: 'Легкий', color: 'bg-green-500/20 text-green-400' };
      case 'medium': return { text: 'Средний', color: 'bg-yellow-500/20 text-yellow-400' };
      case 'hard': return { text: 'Сложный', color: 'bg-red-500/20 text-red-400' };
      default: return { text: difficulty, color: 'bg-gray-500/20 text-gray-400' };
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  const formatSeason = (start: string, end: string) => {
    const months: Record<string, string> = {
      '01': 'Янв', '02': 'Фев', '03': 'Мар', '04': 'Апр',
      '05': 'Май', '06': 'Июн', '07': 'Июл', '08': 'Авг',
      '09': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек',
    };
    const startMonth = months[start.split('-')[0]] || start;
    const endMonth = months[end.split('-')[0]] || end;
    return `${startMonth} — ${endMonth}`;
  };

  const difficulty = getDifficultyLabel(tour.difficulty);

  return (
    <div className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden hover:border-premium-gold/50 transition-all duration-300 hover:shadow-xl hover:shadow-premium-gold/10">
      {/* Image Section */}
      <div className="relative h-52 overflow-hidden">
        {tour.images && tour.images.length > 0 ? (
          <Image
            src={tour.images[0]}
            alt={tour.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-cyan-800 flex items-center justify-center">
            <Fish className="w-20 h-20 text-white/30" />
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${difficulty.color}`}>
            {difficulty.text}
          </span>
          {tour.partner && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">
              {tour.partner}
            </span>
          )}
        </div>

        {/* Rating */}
        {tour.rating && tour.rating > 0 && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
            <Star className="w-4 h-4 text-premium-gold fill-premium-gold" />
            <span className="text-sm font-bold text-white">{tour.rating.toFixed(1)}</span>
            {tour.reviewsCount && (
              <span className="text-xs text-white/60">({tour.reviewsCount})</span>
            )}
          </div>
        )}

        {/* Fish Types */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex flex-wrap gap-1">
            {tour.fishTypes.slice(0, 4).map((fish) => (
              <span 
                key={fish}
                className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white flex items-center gap-1"
              >
                <Fish className="w-3 h-3" />
                {fish}
              </span>
            ))}
            {tour.fishTypes.length > 4 && (
              <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white">
                +{tour.fishTypes.length - 4}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5">
        {/* Title & Price */}
        <div className="flex justify-between items-start gap-3 mb-3">
          <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-premium-gold transition-colors">
            {tour.name}
          </h3>
          <div className="text-right shrink-0">
            {tour.priceOld && (
              <div className="text-sm text-white/40 line-through">
                {formatPrice(tour.priceOld)} ₽
              </div>
            )}
            <div className="text-xl font-black text-premium-gold">
              {formatPrice(tour.price)} ₽
            </div>
            <div className="text-xs text-white/50">за {tour.duration > 1 ? 'тур' : 'сутки'}</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-white/60 text-sm mb-4 line-clamp-2">
          {tour.description}
        </p>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Clock className="w-4 h-4 text-premium-gold" />
            <span>{tour.duration} {tour.duration === 1 ? 'день' : tour.duration < 5 ? 'дня' : 'дней'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Users className="w-4 h-4 text-premium-gold" />
            <span>до {tour.maxParticipants} чел.</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <MapPin className="w-4 h-4 text-premium-gold" />
            <span className="truncate">{tour.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Calendar className="w-4 h-4 text-premium-gold" />
            <span>{formatSeason(tour.season.start, tour.season.end)}</span>
          </div>
        </div>

        {/* Includes Preview */}
        {tour.includes.length > 0 && (
          <div className="mb-4 p-3 bg-white/5 rounded-xl">
            <p className="text-xs text-white/50 mb-2">Включено:</p>
            <p className="text-sm text-white/80 line-clamp-1">
              {tour.includes.slice(0, 3).join(' • ')}
              {tour.includes.length > 3 && ` и ещё ${tour.includes.length - 3}`}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link 
            href={`/tours/fishing/${tour.id}`}
            className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-center font-medium text-white transition-colors"
          >
            Подробнее
          </Link>
          <button
            onClick={() => onBook?.(tour.id)}
            className="flex-1 px-4 py-3 bg-premium-gold hover:bg-premium-gold/80 rounded-xl text-center font-bold text-premium-black transition-colors"
          >
            Забронировать
          </button>
        </div>
      </div>
    </div>
  );
}
