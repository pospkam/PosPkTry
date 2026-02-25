'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Backpack, Map, Tent, Mountain, Snowflake, Waves, Camera, Shield, Search, Loader2, Check } from 'lucide-react';

interface GearItem {
  id: string;
  name: string;
  description: string;
  category: string;
  pricePerDay: number;
  availableQuantity: number;
  images: string[];
}

export default function GearRentalPageClient() {
  const [gear, setGear] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetchGear();
  }, [category]);

  const fetchGear = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      
      const response = await fetch(`/api/gear?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setGear(result.data.gear);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'Все снаряжение', Icon: Backpack },
    { id: 'hiking', name: 'Походное', Icon: Map },
    { id: 'camping', name: 'Кемпинг', Icon: Tent },
    { id: 'climbing', name: 'Альпинизм', Icon: Mountain },
    { id: 'skiing', name: 'Лыжи/Сноуборд', Icon: Snowflake },
    { id: 'water', name: 'Водное', Icon: Waves },
    { id: 'photography', name: 'Фототехника', Icon: Camera },
    { id: 'safety', name: 'Безопасность', Icon: Shield },
  ];

  return (
    <main className="min-h-screen bg-transparent text-white">
      <div className="bg-white/15 border-b border-white/15">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-black text-white mb-2 flex items-center">
            <Backpack className="w-10 h-10 inline mr-2" />
            Прокат снаряжения
          </h1>
          <p className="text-white/70">
            Туристическое оборудование для походов по Камчатке
          </p>
        </div>
      </div>

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
                {React.createElement(cat.Icon, { className: 'w-4 h-4 inline mr-1' })}
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-white/70" />
            <p className="text-white/70">Загрузка снаряжения...</p>
          </div>
        ) : gear.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 mx-auto mb-4 text-sky-400 opacity-80" />
            <p className="text-white/70">Снаряжение не найдено</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {gear.map((item) => (
              <div
                key={item.id}
                className="bg-white/15 border border-white/15 rounded-2xl overflow-hidden hover:bg-white/10 transition-colors"
              >
                <div className="aspect-square bg-white/15 flex items-center justify-center">
                  <Backpack className="w-24 h-24 text-gray-400 opacity-80" />
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-white mb-2">
                    {item.name}
                  </h3>
                  
                  <p className="text-white/60 text-sm mb-3 line-clamp-2">
                    {item.description}
                  </p>
                  
                  <div className="text-white font-bold mb-2">
                    {item.pricePerDay.toLocaleString('ru-RU')} ₽/день
                  </div>
                  
                  <div className="text-green-400 text-sm flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Доступно: {item.availableQuantity} шт
                  </div>
                  
                  <button className="w-full mt-4 px-4 py-2 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-lg transition-colors">
                    Забронировать
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

