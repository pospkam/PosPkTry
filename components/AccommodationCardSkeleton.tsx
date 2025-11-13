'use client';

import React from 'react';

export const AccommodationCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden animate-pulse">
      {/* Изображение skeleton */}
      <div className="h-56 w-full bg-white/10" />
      
      {/* Контент skeleton */}
      <div className="p-5">
        {/* Название */}
        <div className="h-6 bg-white/10 rounded w-3/4 mb-2" />
        <div className="h-4 bg-white/10 rounded w-1/2 mb-4" />
        
        {/* Описание */}
        <div className="space-y-2 mb-4">
          <div className="h-3 bg-white/10 rounded w-full" />
          <div className="h-3 bg-white/10 rounded w-5/6" />
        </div>
        
        {/* Удобства */}
        <div className="flex gap-2 mb-4">
          <div className="h-6 bg-white/10 rounded w-16" />
          <div className="h-6 bg-white/10 rounded w-16" />
          <div className="h-6 bg-white/10 rounded w-16" />
        </div>
        
        {/* Низ */}
        <div className="flex justify-between items-center pt-4 border-t border-white/10">
          <div className="h-8 bg-white/10 rounded w-20" />
          <div className="h-10 bg-white/10 rounded w-24" />
        </div>
        
        {/* Кнопка */}
        <div className="h-12 bg-white/10 rounded-xl w-full mt-4" />
      </div>
    </div>
  );
};

export default AccommodationCardSkeleton;



