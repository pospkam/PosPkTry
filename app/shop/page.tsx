'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';

interface Souvenir {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  stockQuantity: number;
  rating: number;
}

export default function ShopPage() {
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetchSouvenirs();
  }, [category]);

  const fetchSouvenirs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      
      const response = await fetch(`/api/souvenirs?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setSouvenirs(result.data.souvenirs);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'Все товары', icon: '🎁' },
    { id: 'traditional_art', name: 'Традиционное искусство', icon: '🎨' },
    { id: 'jewelry', name: 'Украшения', icon: '💎' },
    { id: 'textiles', name: 'Текстиль', icon: '🧵' },
    { id: 'woodwork', name: 'Изделия из дерева', icon: '🪵' },
    { id: 'food_drinks', name: 'Еда и напитки', icon: '🍯' },
  ];

  return (
    <main className="min-h-screen bg-transparent text-white">
      {/* Header */}
      <div className="bg-white/15 border-b border-white/15">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-black text-white mb-2">
            🎁 Магазин Сувениров Камчатки
          </h1>
          <p className="text-white/70">
            Авторские изделия от потомственных мастеров
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white/15 border-b border-white/15">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  category === cat.id
                    ? 'bg-premium-gold text-premium-black'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-white/70">Загрузка товаров...</p>
          </div>
        ) : souvenirs.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-white/70">Товары не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {souvenirs.map((souvenir) => (
              <Link
                key={souvenir.id}
                href={`/shop/${souvenir.id}`}
                className="bg-white/15 border border-white/15 rounded-2xl overflow-hidden hover:bg-white/10 transition-colors group"
              >
                <div className="aspect-square bg-white/15 flex items-center justify-center">
                  {souvenir.images.length > 0 ? (
                    <img
                      src={souvenir.images[0]}
                      alt={souvenir.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-6xl">🎁</div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-white mb-2 group-hover:text-white transition-colors">
                    {souvenir.name}
                  </h3>
                  
                  <p className="text-white/60 text-sm mb-3 line-clamp-2">
                    {souvenir.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-white font-bold text-lg">
                      {souvenir.price.toLocaleString('ru-RU')} ₽
                    </div>
                    
                    <div className="flex items-center gap-1 text-sm text-white/60">
                      <Star className="w-4 h-4" /> {souvenir.rating.toFixed(1)}
                    </div>
                  </div>
                  
                  {souvenir.stockQuantity > 0 ? (
                    <div className="mt-3 text-green-400 text-sm">
                      ✅ В наличии
                    </div>
                  ) : (
                    <div className="mt-3 text-red-400 text-sm">
                      ❌ Нет в наличии
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Partner Info */}
      <div className="bg-white/15 border-t border-white/15 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🤝</div>
            <div>
              <h3 className="font-bold text-white mb-1">
                Официальный партнёр: &ldquo;Дар Севера&rdquo;
              </h3>
              <p className="text-white/70 text-sm">
                Авторские этнические изделия от потомственных мастеров Камчатки
              </p>
              <a 
                href="https://dar-severa.ru/" 
                target="_blank"
                className="text-white hover:underline text-sm"
              >
                dar-severa.ru →
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

