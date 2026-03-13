'use client';

import React from 'react';
import Image from 'next/image';

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
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden hover:bg-[var(--bg-hover)] transition-all hover:scale-105">
      <div className="relative h-48 bg-[var(--bg-card)]">
        {souvenir.imageUrl ? (
          <Image src={souvenir.imageUrl} alt={souvenir.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl"></div>
        )}
        {!souvenir.inStock && (
          <div className="absolute top-2 right-2 px-3 py-1 bg-red-500/90 text-white text-xs rounded-full">Нет в наличии</div>
        )}
      </div>
      <div className="p-4">
        <div className="mb-2"><span className="text-xs text-[var(--text-muted)]">{souvenir.category}</span></div>
        <h3 className="font-bold text-lg mb-2 text-[var(--text-primary)] line-clamp-2">{souvenir.name}</h3>
        <p className="text-[var(--text-muted)] text-sm mb-4 line-clamp-2">{souvenir.description}</p>
        {souvenir.rating && (
          <div className="flex items-center gap-1 mb-3">
            <span className="text-yellow-400 text-sm"></span>
            <span className="text-[var(--text-muted)] text-sm">{souvenir.rating.toFixed(1)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div><p className="text-2xl font-bold text-[var(--accent)]">{souvenir.price.toLocaleString('ru-RU')} ₽</p></div>
          <button onClick={() => onAddToCart(souvenir.id)} disabled={!souvenir.inStock} className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-[var(--bg-primary)] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {souvenir.inStock ? 'В корзину' : 'Нет в наличии'}
          </button>
        </div>
      </div>
    </div>
  );
}