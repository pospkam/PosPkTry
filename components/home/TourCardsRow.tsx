'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';

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
      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
      <span className="text-[11px] font-semibold text-white/90">{rating.toFixed(1)}</span>
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
    short_description: 'Наблюдение за медведями',
    category: 'bears',
    price: 18000,
    rating: 4.8,
    review_count: 93,
    image_url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=400&q=80',
  },
  {
    id: '3',
    name: 'Термальный Тур',
    short_description: 'Горячие источники Камчатки',
    category: 'thermal',
    price: 10000,
    rating: 4.7,
    review_count: 156,
    image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80',
  },
  {
    id: '4',
    name: 'Рыбалка',
    short_description: 'Рыбалка на дикого лосося',
    category: 'fishing',
    price: 12000,
    rating: 4.6,
    review_count: 84,
    image_url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&q=80',
  },
];

export function TourCardsRow() {
  return (
    <section aria-label="Популярные туры" className="py-2">
      {/* Заголовок */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Популярные туры</h2>
        <Link href="/tours" className="text-sm font-medium text-[var(--accent)]">
          Все →
        </Link>
      </div>

      {/* Сетка 2 колонки — как в макете */}
      <div className="grid grid-cols-2 gap-3 px-4" role="list">
        {FALLBACK_TOURS.map(tour => (
          <Link
            key={tour.id}
            href={`/tours?category=${tour.category}`}
            role="listitem"
            aria-label={`${tour.name}, ${tour.price.toLocaleString('ru-RU')} ₽`}
            className="relative rounded-2xl overflow-hidden shadow-[var(--shadow-md)] transition-transform active:scale-[0.97] aspect-[3/4] bg-[var(--bg-card)]"
          >
            {/* Фото на всю карточку */}
            <Image
              src={tour.image_url || '/placeholder-tour.jpg'}
              alt={tour.short_description}
              fill
              sizes="(max-width: 768px) 46vw, 350px"
              className="object-cover"
              loading="lazy"
            />

            {/* Тёмный gradient overlay снизу — для текста */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Цена — бейдж сверху-справа */}
            <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-0.5">
              <span className="text-[11px] font-bold text-white">
                {tour.price.toLocaleString('ru-RU')} ₽
              </span>
            </div>

            {/* Инфо внизу — на тёмном overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="text-[13px] font-bold text-white leading-tight mb-1 drop-shadow-md line-clamp-2">
                {tour.name}
              </h3>
              <p className="text-[10px] text-white/60 mb-1.5 line-clamp-1">
                {tour.short_description}
              </p>
              <div className="flex items-center gap-1.5">
                <StarRating rating={tour.rating} />
                <span className="text-[10px] text-white/50">({tour.review_count})</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
