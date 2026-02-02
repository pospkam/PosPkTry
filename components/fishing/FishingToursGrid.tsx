'use client';

import React from 'react';
import { FishingTourCard, FishingTourData } from './FishingTourCard';
import { Fish, Loader2 } from 'lucide-react';

interface FishingToursGridProps {
  tours: FishingTourData[];
  loading?: boolean;
  onBook?: (tourId: string) => void;
}

export function FishingToursGrid({ tours, loading, onBook }: FishingToursGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-premium-gold animate-spin mx-auto mb-4" />
          <p className="text-white/70">Загрузка туров...</p>
        </div>
      </div>
    );
  }

  if (tours.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Fish className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Туры не найдены</h3>
          <p className="text-white/50">Попробуйте изменить параметры поиска</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tours.map((tour) => (
        <FishingTourCard 
          key={tour.id} 
          tour={tour} 
          onBook={onBook}
        />
      ))}
    </div>
  );
}
