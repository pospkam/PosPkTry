'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Users, MapPin, Star, Mountain } from 'lucide-react';

export interface TourCardData {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  price: number;
  currency: string;
  maxGroupSize: number;
  minGroupSize: number;
  rating: number;
  reviewCount: number;
  images: string[];
  included: string[];
  season: unknown[];
  route?: { title: string; category?: string } | null;
}

interface TourCardProps {
  tour: TourCardData;
  href?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  fishing:       'Рыбалка',
  volcanoes:     'Вулканы',
  vulkani:       'Вулканы',
  thermal:       'Термы',
  termalnye_istochniki: 'Термы',
  trekking:      'Треккинг',
  snowmobile:    'Снегоход',
  jeep:          'Джип-тур',
  helicopter:    'Вертолёт',
  vertoletnye_tury: 'Вертолёт',
  bears:         'Медведи',
  medvedi:       'Медведи',
  lakes:         'Озёра',
  mountains:     'Горы',
  rivers:        'Реки',
  eco:           'Эко-тур',
  combo:         'Комбо',
  adventure:     'Приключение',
  morskie_progulki: 'Море',
  rybalka:       'Рыбалка',
  geyzery:       'Гейзеры',
};

const DIFFICULTY_LABELS: Record<string, { label: string; cls: string }> = {
  easy:   { label: 'Лёгкий',   cls: 'bg-green-500/20 text-green-400' },
  medium: { label: 'Средний',  cls: 'bg-yellow-500/20 text-yellow-400' },
  hard:   { label: 'Сложный',  cls: 'bg-red-500/20 text-red-400' },
};

function formatDuration(hours: number): string {
  if (hours < 24) return `${hours} ч`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ' + (currency === 'RUB' ? '₽' : currency);
}

export function TourCard({ tour, href }: TourCardProps) {
  const diff = DIFFICULTY_LABELS[tour.difficulty] ?? DIFFICULTY_LABELS.medium;
  const categoryLabel = CATEGORY_LABELS[tour.category] ?? tour.category;
  const link = href ?? `/tours/${tour.id}`;
  const hasImage = tour.images.length > 0;

  return (
    <div className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden hover:border-premium-gold/50 transition-all duration-300 hover:shadow-xl hover:shadow-premium-gold/10 flex flex-col">
      {/* Изображение */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {hasImage ? (
          <Image
            src={tour.images[0]}
            alt={tour.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0a1628] to-[#0B1120] flex items-center justify-center">
            <Mountain className="w-16 h-16 text-white/30" />
          </div>
        )}
        {/* Градиентный overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Badges overlay */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-sm text-white/90">
            {categoryLabel}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${diff.cls}`}>
            {diff.label}
          </span>
        </div>

        {/* Рейтинг */}
        {tour.rating > 0 && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 text-premium-gold fill-premium-gold" />
            <span className="text-white text-xs font-bold">{tour.rating.toFixed(1)}</span>
            {tour.reviewCount > 0 && (
              <span className="text-white/50 text-xs">({tour.reviewCount})</span>
            )}
          </div>
        )}
      </div>

      {/* Контент */}
      <div className="p-5 flex flex-col flex-1">
        {/* Название */}
        <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-premium-gold transition-colors mb-1">
          {tour.name}
        </h3>

        {/* Маршрут */}
        {tour.route?.title && (
          <div className="flex items-center gap-1 text-xs text-white/50 mb-2">
            <MapPin className="w-3 h-3 text-premium-gold flex-shrink-0" />
            <span className="line-clamp-1">{tour.route.title}</span>
          </div>
        )}

        {/* Описание */}
        <p className="text-white/60 text-sm mb-4 line-clamp-2 flex-1">
          {tour.description}
        </p>

        {/* Параметры */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-sm text-white/70">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-premium-gold flex-shrink-0" />
            <span>{formatDuration(tour.duration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-premium-gold flex-shrink-0" />
            <span>{tour.minGroupSize}–{tour.maxGroupSize} чел</span>
          </div>
        </div>

        {/* Включено (первые 2 пункта) */}
        {tour.included.length > 0 && (
          <div className="mb-4 p-3 bg-white/5 rounded-xl">
            <p className="text-xs text-white/50 mb-1">Включено:</p>
            <p className="text-sm text-white/80 line-clamp-1">
              {tour.included.slice(0, 2).join(' • ')}
              {tour.included.length > 2 && ` +${tour.included.length - 2}`}
            </p>
          </div>
        )}

        {/* Цена */}
        <div className="mb-4">
          {tour.price > 0 ? (
            <>
              <span className="text-xl font-black text-premium-gold">
                от {formatPrice(tour.price, tour.currency)}
              </span>
              <span className="text-xs text-white/50 ml-1">/чел</span>
            </>
          ) : (
            <span className="text-lg font-bold text-white/60">По запросу</span>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 mt-auto">
          <Link
            href={link}
            className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-center font-medium text-white transition-colors text-sm"
          >
            Подробнее
          </Link>
          <Link
            href={`${link}?tab=booking`}
            className="flex-1 px-4 py-3 bg-premium-gold hover:bg-premium-gold/80 rounded-xl text-center font-bold text-premium-black transition-colors text-sm"
          >
            Забронировать
          </Link>
        </div>
      </div>
    </div>
  );
}
