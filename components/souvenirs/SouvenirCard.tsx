'use client';

import React from 'react';

interface Souvenir {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
  inStock: boolean;
  rating?: number;
}

interface SouvenirCardProps {
  souvenir: Souvenir;
  onAddToCart: (id: string) => void;
}

export function SouvenirCard({ souvenir, onAddToCart }: SouvenirCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all hover:scale-105">
      <div className="relative h-48 bg-white/10">
        {souvenir.imageUrl ? (
          <img src={souvenir.imageUrl} alt={souvenir.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl"></div>
        )}
        {!souvenir.inStock && (
          <div className="absolute top-2 right-2 px-3 py-1 bg-red-500/90 text-white text-xs rounded-full">Нет в наличии</div>
        )}
      </div>
      <div className="p-4">
        <div className="mb-2"><span className="text-xs text-white/50">{souvenir.category}</span></div>
        <h3 className="font-bold text-lg mb-2 text-white line-clamp-2">{souvenir.name}</h3>
        <p className="text-white/70 text-sm mb-4 line-clamp-2">{souvenir.description}</p>
        {souvenir.rating && (
          <div className="flex items-center gap-1 mb-3">
            <span className="text-yellow-400 text-sm"></span>
            <span className="text-white/70 text-sm">{souvenir.rating.toFixed(1)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div><p className="text-2xl font-black text-premium-gold">{souvenir.price.toLocaleString('ru-RU')} ₽</p></div>
          <button onClick={() => onAddToCart(souvenir.id)} disabled={!souvenir.inStock} className="px-4 py-2 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {souvenir.inStock ? 'В корзину' : 'Нет в наличии'}
          </button>
        </div>
      </div>
    </div>
  );
}