'use client';

import React from 'react';
import { Partner } from '@/types';
import { formatRating, getInitials, generateAvatarColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PartnerCardProps {
  partner: Partner;
  className?: string;
  onClick?: () => void;
}

export function PartnerCard({ partner, className, onClick }: PartnerCardProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'operator':
        return ' ';
      case 'guide':
        return '';
      case 'transfer':
        return ' ';
      case 'stay':
        return '';
      case 'souvenir':
        return ' ';
      case 'gear':
        return '';
      case 'cars':
        return '';
      case 'restaurant':
        return '';
      default:
        return ' ';
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'operator':
        return 'Туроператор';
      case 'guide':
        return 'Гид';
      case 'transfer':
        return 'Трансфер';
      case 'stay':
        return 'Размещение';
      case 'souvenir':
        return 'Сувениры';
      case 'gear':
        return 'Снаряжение';
      case 'cars':
        return 'Авто';
      case 'restaurant':
        return 'Ресторан';
      default:
        return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'operator':
        return 'bg-blue-100 text-blue-800';
      case 'guide':
        return 'bg-green-100 text-green-800';
      case 'transfer':
        return 'bg-purple-100 text-purple-800';
      case 'stay':
        return 'bg-yellow-100 text-yellow-800';
      case 'souvenir':
        return 'bg-pink-100 text-pink-800';
      case 'gear':
        return 'bg-orange-100 text-orange-800';
      case 'cars':
        return 'bg-gray-100 text-gray-800';
      case 'restaurant':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Логотип и категория */}
      <div className="relative h-32 bg-gray-100">
        {partner.logo ? (
          <img
            src={partner.logo.url}
            alt={partner.name}
            className="w-full h-full object-contain p-4"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl',
                generateAvatarColor(partner.name)
              )}
            >
              {getInitials(partner.name)}
            </div>
          </div>
        )}
        
        {/* Категория */}
        <div className="absolute top-3 left-3">
          <span
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1',
              getCategoryColor(partner.category)
            )}
          >
            <span>{getCategoryIcon(partner.category)}</span>
            <span>{getCategoryText(partner.category)}</span>
          </span>
        </div>
        
        {/* Верификация */}
        {partner.isVerified && (
          <div className="absolute top-3 right-3">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
              <span>[]</span>
              <span>Проверен</span>
            </span>
          </div>
        )}
      </div>

      {/* Контент карточки */}
      <div className="p-4">
        {/* Название и рейтинг */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {partner.name}
          </h3>
          {partner.rating > 0 && (
            <div className="flex items-center space-x-1 ml-2">
              <span className="text-yellow-500"></span>
              <span className="text-sm font-medium">{formatRating(partner.rating)}</span>
              <span className="text-xs text-gray-500">({partner.reviewCount})</span>
            </div>
          )}
        </div>

        {/* Описание */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {partner.description}
        </p>

        {/* Контактная информация */}
        {partner.contact && (
          <div className="space-y-2 mb-4">
            {partner.contact.phone && (
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-2"> </span>
                <span>{partner.contact.phone}</span>
              </div>
            )}
            
            {partner.contact.email && (
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-2"> </span>
                <span className="truncate">{partner.contact.email}</span>
              </div>
            )}
            
            {partner.contact.website && (
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-2"></span>
                <span className="truncate">{partner.contact.website}</span>
              </div>
            )}
            
            {partner.contact.telegram && (
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-2"> </span>
                <span>{partner.contact.telegram}</span>
              </div>
            )}
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex space-x-2">
          <button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
            onClick={(e) => {
              e.stopPropagation();
              // Здесь будет логика связи с партнером
            }}
          >
            Связаться
          </button>
          
          <button
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
            onClick={(e) => {
              e.stopPropagation();
              // Здесь будет логика просмотра профиля
            }}
          >
            Профиль
          </button>
        </div>
      </div>
    </div>
  );
}