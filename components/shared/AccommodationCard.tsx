'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Car } from 'lucide-react';

interface AccommodationCardProps {
  id: string;
  name: string;
  type: string;
  description: string;
  address: string;
  pricePerNight: {
    from: number;
    to?: number | null;
    currency: string;
  };
  rating: number;
  reviewCount: number;
  amenities: string[];
  images: Array<{ url: string; alt?: string }>;
  starRating?: number;
  onFavoriteToggle?: (id: string) => void;
  isFavorite?: boolean;
}

const typeLabels: Record<string, string> = {
  hotel: 'Отель',
  hostel: 'Хостел',
  apartment: 'Апартаменты',
  guesthouse: 'Гостевой дом',
  resort: 'Курорт',
  camping: 'Кемпинг',
  glamping: 'Глэмпинг',
  cottage: 'Коттедж',
};

const amenityIcons: Record<string, React.ReactNode> = {
  wifi: null,
  parking: <Car className="w-4 h-4" />,
  breakfast: null,
  spa: null,
  pool: null,
  gym: null,
  restaurant: null,
  bar: null,
  pets: null,
};

/**
 * AccommodationCard — карточка размещения для Kamchatour Hub
 * @param {AccommodationCardProps} props
 * @returns {JSX.Element}
 * @remarks
 * - Accessibility: alt для изображений, aria-label для кнопок, семантика для отзывов и цены
 * - UX: избранное, hover, skeleton, glassmorphism
 */
export const AccommodationCard: React.FC<AccommodationCardProps> = ({
  id,
  name,
  type,
  description,
  address,
  pricePerNight,
  rating,
  reviewCount,
  amenities,
  images,
  starRating,
  onFavoriteToggle,
  isFavorite = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const mainImage = images[0]?.url || '/placeholder-accommodation.jpg';
  const displayAmenities = amenities.slice(0, 4);
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFavoriteToggle) {
      onFavoriteToggle(id);
    }
  };
  
  return (
    <Link href={`/hub/stay/${id}`}>
      <div
        className={`
          bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden
          hover:border-[var(--accent)]/50 transition-all duration-300
          cursor-pointer group
          ${isHovered ? 'transform scale-[1.02] shadow-2xl shadow-[var(--accent)]/20' : ''}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Изображение */}
        <div className="relative h-56 w-full overflow-hidden bg-[var(--bg-card)]">
          {!imgError ? (
            <Image
              src={mainImage}
              alt={images[0]?.alt || name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-6xl">
              
            </div>
          )}
          
          {/* Избранное */}
          <button
            onClick={handleFavoriteClick}
            className={`
              absolute top-4 right-4 p-2 rounded-full
              transition-all duration-200
              ${isFavorite
                ? 'bg-[var(--danger)]/90 text-[var(--text-primary)]'
                : 'bg-[rgba(0,0,0,0.3)] text-[var(--text-muted)] hover:bg-[rgba(0,0,0,0.5)] hover:text-[var(--text-primary)]'}
            `}
            aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
          >
            <svg
              className="w-6 h-6"
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
          
          {/* Тип и звёзды */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <span className="px-3 py-1 bg-black/70 rounded-full text-xs text-[var(--text-secondary)] font-medium">
              {typeLabels[type] || type}
            </span>
            {starRating && (
              <span className="px-3 py-1 bg-black/70 rounded-full text-xs text-[var(--accent)] font-medium">
                {''.repeat(starRating)}
              </span>
            )}
          </div>
        </div>
        
        {/* Контент */}
        <div className="p-5">
          {/* Название и адрес */}
          <div className="mb-3">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent)] transition-colors line-clamp-1">
              {name}
            </h3>
            <p className="text-sm text-[var(--text-muted)] line-clamp-1">
               {address}
            </p>
          </div>
          
          {/* Описание */}
          <p className="text-[var(--text-muted)] text-sm mb-4 line-clamp-2">
            {description}
          </p>
          
          {/* Удобства */}
          <div className="flex flex-wrap gap-2 mb-4">
            {displayAmenities.map((amenity) => (
              <span
                key={amenity}
                className="px-2 py-1 bg-[var(--bg-card)] rounded-lg text-xs text-[var(--text-secondary)] flex items-center gap-1"
              >
                {amenityIcons[amenity]}
                <span className="capitalize">{amenity}</span>
              </span>
            ))}
            {amenities.length > 4 && (
              <span className="px-2 py-1 bg-[var(--bg-card)] rounded-lg text-xs text-[var(--text-muted)]">
                +{amenities.length - 4}
              </span>
            )}
          </div>
          
          {/* Рейтинг и цена */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
            {/* Рейтинг */}
            <div className="flex items-center gap-2">
              {rating > 0 ? (
                <>
                  <div className="px-2 py-1 bg-[var(--accent)]/20 rounded-lg">
                    <span className="text-[var(--accent)] font-bold">{rating.toFixed(1)}</span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)]" aria-label={`Количество отзывов: ${reviewCount}`}>
                    {reviewCount > 0 && (
                      <span>{reviewCount} отзыв{reviewCount % 10 === 1 && reviewCount !== 11 ? '' : reviewCount % 10 >= 2 && reviewCount % 10 <= 4 && (reviewCount < 10 || reviewCount > 20) ? 'а' : 'ов'}</span>
                    )}
                  </div>
                </>
              ) : (
                <span className="text-xs text-[var(--text-muted)]">Пока нет отзывов</span>
              )}
            </div>
            
            {/* Цена */}
            <div className="text-right" aria-label={`Цена от ${pricePerNight.from} рублей за ночь`}>
              <div className="text-xs text-[var(--text-muted)] mb-1">от</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[var(--accent)]">
                  {pricePerNight.from.toLocaleString('ru-RU')}
                </span>
                <span className="text-sm text-[var(--text-muted)]">₽</span>
              </div>
              <div className="text-xs text-[var(--text-muted)]">за ночь</div>
            </div>
          </div>
          
          {/* Кнопка бронирования */}
          <button
            className="
              w-full mt-4 py-3 px-4 rounded-lg
              bg-[var(--accent)] text-[var(--bg-card)] font-bold
              hover:bg-[var(--accent)]/90 transition-all duration-200
              hover:shadow-lg hover:shadow-[var(--accent)]/30
              active:scale-95
            "
            onClick={(e) => {
              e.preventDefault();
              window.location.href = `/hub/stay/${id}`;
            }}
          >
            Забронировать
          </button>
        </div>
      </div>
    </Link>
  );
};



