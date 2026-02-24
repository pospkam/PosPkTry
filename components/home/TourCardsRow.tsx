'use client';

import Image from 'next/image';
import Link from 'next/link';

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
    <div className="flex items-center gap-1" aria-label={`Рейтинг: ${rating} из 5`} role="img">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className="text-amber-400 text-sm">★</span>
        ))}
      </div>
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
    <section aria-label="Популярные туры" className="py-4 lg:py-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between px-4 lg:px-0 mb-4 lg:mb-5">
        <h2 className="text-2xl lg:text-xl font-medium text-white drop-shadow-sm lg:drop-shadow-none">Популярные туры</h2>
        <Link href="/tours" className="text-lg font-medium text-white/90 hover:underline flex items-center gap-1">
          Все <span className="text-xl">›</span>
        </Link>
      </div>

      {/* Скролл на мобилке */}
      <div className="flex overflow-x-auto gap-4 px-4 pb-4 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }} role="list">
        {FALLBACK_TOURS.map(tour => (
          <Link
            key={tour.id}
            href={`/tours?category=${tour.category}`}
            role="listitem"
            aria-label={`${tour.name}, ${tour.price.toLocaleString('ru-RU')} ₽`}
            className="relative flex-shrink-0 w-[160px] h-[220px] rounded-[24px] overflow-hidden shadow-lg shadow-black/10 transition-transform active:scale-[0.97] bg-white/20 backdrop-blur-md border border-white/10"
          >
            {/* Фото на верхнюю часть карточки */}
            <div className="relative w-full h-[65%]">
              <Image
                src={tour.image_url || '/placeholder-tour.jpg'}
                alt={tour.short_description}
                fill
                sizes="160px"
                className="object-cover rounded-t-[24px]"
                loading="lazy"
              />
            </div>

            {/* Контент внизу */}
            <div className="absolute bottom-0 left-0 right-0 p-3 h-[35%] flex flex-col justify-center">
              <div className="text-xl font-bold text-white mb-1">
                {tour.price.toLocaleString('ru-RU')}₽
              </div>
              <div className="flex items-center justify-between">
                <StarRating rating={tour.rating} />
                <span className="text-sm font-medium text-white/80">{tour.rating.toFixed(1)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
