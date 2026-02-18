'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface Tour {
  id: string;
  name: string;
  short_description: string;
  category: string;
  price: number;
  rating: number;
  review_count: number;
  image_url?: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Рейтинг: ${rating} из 5`} role="img">
      <span className="text-amber-400 text-sm">★</span>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{rating.toFixed(1)}</span>
    </div>
  );
}

// Fallback туры если API недоступен
const FALLBACK_TOURS: Tour[] = [
  {
    id: '1',
    name: 'Вулканный Тур',
    short_description: 'Поход к действующим вулканам',
    category: 'volcanoes',
    price: 15000,
    rating: 4.9,
    review_count: 127,
    image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80',
  },
  {
    id: '2',
    name: 'Медвежий Тур',
    href: '/tours?category=bears',
  },
  {
    id: 'thermal-tour',
    title: 'Термальный Тур',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80',
    imageAlt: 'Термальные источники Камчатки',
    price: 10000,
    rating: 4.8,
    href: '/tours?category=thermal',
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Рейтинг: ${rating} из 5`} role="img">
      <span className="text-amber-400 text-sm">★</span>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{rating.toFixed(1)}</span>
    </div>
  );
}

export function TourCardsRow() {
  return (
    <section aria-label="Популярные туры" className="py-2">
      {/* Заголовок */}
      <div className="flex items-center justify-between px-4 mb-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Популярные туры</h2>
        <Link href="/tours" className="text-sm font-medium text-[#4A7FD4] dark:text-[#7EB3FF]">
          Все →
        </Link>
      </div>

      {/* Горизонтальный скролл */}
      <div
        className="scrollbar-hide flex overflow-x-auto gap-3 px-4 pb-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="list"
      >
        {FEATURED_TOURS.map(tour => (
          <Link
            key={tour.id}
            href={tour.href}
            role="listitem"
            aria-label={`${tour.title}, ${tour.price.toLocaleString('ru-RU')} ₽`}
            className="flex-shrink-0 w-[170px] bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden transition-transform hover:-translate-y-1 active:scale-95"
          >
            {/* Фото */}
            <div className="relative h-[140px] w-full">
              <Image
                src={tour.imageUrl}
                alt={tour.imageAlt}
                fill
                sizes="170px"
                className="object-cover"
                loading="lazy"
              />
            </div>

            {/* Инфо */}
            <div className="px-3 py-2.5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1.5 line-clamp-2">
                {tour.title}
              </h3>
              <div className="flex items-center justify-between">
                <StarRating rating={tour.rating} />
                <span className="text-sm font-bold text-[#4A7FD4] dark:text-[#7EB3FF]">
                  {tour.price.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
