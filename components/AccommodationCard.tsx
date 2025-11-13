'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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

const amenityIcons: Record<string, string> = {
  wifi: '📶',
  parking: '🅿️',
  breakfast: '🍳',
  spa: '💆',
  pool: '🏊',
  gym: '🏋️',
  restaurant: '🍽️',
  bar: '🍸',
  pets: '🐕',
};

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
          bg-white/5 border border-white/10 rounded-2xl overflow-hidden
          hover:border-premium-gold/50 transition-all duration-300
          cursor-pointer group
          ${isHovered ? 'transform scale-[1.02] shadow-2xl shadow-premium-gold/20' : ''}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Изображение */}
        <div className="relative h-56 w-full overflow-hidden bg-white/5">
          {!imgError ? (
            <Image
              src={mainImage}
              alt={images[0]?.alt || name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50 text-6xl">
              🏨
            </div>
          )}
          
          {/* Избранное */}
          <button
            onClick={handleFavoriteClick}
            className={`
              absolute top-4 right-4 p-2 rounded-full backdrop-blur-sm
              transition-all duration-200
              ${isFavorite 
                ? 'bg-red-500/90 text-white' 
                : 'bg-black/30 text-white/70 hover:bg-black/50 hover:text-white'}
            `}
            aria-label="Добавить в избранное"
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
            <span className="px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-xs text-white/90 font-medium">
              {typeLabels[type] || type}
            </span>
            {starRating && (
              <span className="px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-xs text-premium-gold font-medium">
                {'⭐'.repeat(starRating)}
              </span>
            )}
          </div>
        </div>
        
        {/* Контент */}
        <div className="p-5">
          {/* Название и адрес */}
          <div className="mb-3">
            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-premium-gold transition-colors line-clamp-1">
              {name}
            </h3>
            <p className="text-sm text-white/60 line-clamp-1">
              📍 {address}
            </p>
          </div>
          
          {/* Описание */}
          <p className="text-white/70 text-sm mb-4 line-clamp-2">
            {description}
          </p>
          
          {/* Удобства */}
          <div className="flex flex-wrap gap-2 mb-4">
            {displayAmenities.map((amenity, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-white/5 rounded-lg text-xs text-white/80 flex items-center gap-1"
              >
                <span>{amenityIcons[amenity] || '✓'}</span>
                <span className="capitalize">{amenity}</span>
              </span>
            ))}
            {amenities.length > 4 && (
              <span className="px-2 py-1 bg-white/5 rounded-lg text-xs text-white/60">
                +{amenities.length - 4}
              </span>
            )}
          </div>
          
          {/* Рейтинг и цена */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {/* Рейтинг */}
            <div className="flex items-center gap-2">
              {rating > 0 ? (
                <>
                  <div className="px-2 py-1 bg-premium-gold/20 rounded-lg">
                    <span className="text-premium-gold font-bold">{rating.toFixed(1)}</span>
                  </div>
                  <div className="text-xs text-white/60">
                    {reviewCount > 0 && (
                      <span>{reviewCount} отзыв{reviewCount % 10 === 1 && reviewCount !== 11 ? '' : reviewCount % 10 >= 2 && reviewCount % 10 <= 4 && (reviewCount < 10 || reviewCount > 20) ? 'а' : 'ов'}</span>
                    )}
                  </div>
                </>
              ) : (
                <span className="text-xs text-white/50">Пока нет отзывов</span>
              )}
            </div>
            
            {/* Цена */}
            <div className="text-right">
              <div className="text-xs text-white/60 mb-1">от</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-premium-gold">
                  {pricePerNight.from.toLocaleString('ru-RU')}
                </span>
                <span className="text-sm text-white/70">₽</span>
              </div>
              <div className="text-xs text-white/50">за ночь</div>
            </div>
          </div>
          
          {/* Кнопка бронирования */}
          <button
            className="
              w-full mt-4 py-3 px-4 rounded-xl
              bg-premium-gold text-premium-black font-bold
              hover:bg-premium-gold/90 transition-all duration-200
              hover:shadow-lg hover:shadow-premium-gold/30
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

export default AccommodationCard;



