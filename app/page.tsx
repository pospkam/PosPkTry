'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search, Mic, Home, MapPin, Heart, User, Sun, Moon,
  Mountain, PawPrint, Fish, Wind, Footprints, Helicopter, Waves, Music,
} from 'lucide-react';

export default function HomePage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const dark = theme === 'dark';

  return (
    <div className={`min-h-screen ${dark ? 'bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white' : 'bg-gradient-to-b from-[#F0F7FF] to-[#BBDEFB] text-gray-900'} flex flex-col`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${dark ? 'bg-[#0F172A]/80 border-gray-800' : 'bg-white/80 border-gray-200'} backdrop-blur-md border-b`}>
        <div className="max-w-screen-md mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold tracking-tight">Kamchatour Hub</div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition ${dark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-200'}`}
              aria-label="Переключить тему"
            >
              {dark ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <div className="w-12 h-12 relative rounded-full overflow-hidden border-2 border-orange-500/60 shadow-lg flex-shrink-0">
              <Image
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop"
                alt="Кузьмич"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </header>

      {/* Поиск */}
      <div className="px-4 pt-8 pb-10 max-w-screen-md mx-auto w-full">
        <div className="relative">
          <input
            type="text"
            placeholder="Куда едем?"
            className={`w-full pl-12 pr-14 py-5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-lg transition-all ${dark ? 'bg-gray-800/70 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={24} />
          </div>
          <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-orange-500 text-white p-3 rounded-full shadow-md hover:bg-orange-600 transition">
            <Mic size={20} />
          </button>
        </div>
        <button className="mt-4 w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-2xl shadow-xl transition-all">
          Найти
        </button>
      </div>

      {/* Категории — только иконки */}
      <div className="px-4 pb-10 max-w-screen-md mx-auto w-full">
        <div className="flex overflow-x-auto gap-5 pb-4 scrollbar-hide snap-x snap-mandatory">
          {categories.map((cat, i) => (
            <div key={i} className="flex flex-col items-center snap-center min-w-[88px]">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border hover:border-orange-500/50 transition-all shadow-md ${dark ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200'}`}>
                <cat.icon className="w-10 h-10 text-orange-400" strokeWidth={1.5} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Популярные туры */}
      <div className="px-4 pb-28 max-w-screen-md mx-auto w-full">
        <h2 className="text-xl font-bold mb-5">Популярные туры</h2>
        <div className="flex overflow-x-auto gap-4 pb-6 scrollbar-hide snap-x snap-mandatory">
          {tours.map((tour, i) => (
            <div
              key={i}
              className={`min-w-[280px] bg-white text-gray-900 rounded-2xl overflow-hidden shadow-xl border snap-center ${dark ? 'border-gray-700/30' : 'border-gray-200'}`}
            >
              <div className="relative h-48">
                <Image
                  src={tour.image}
                  alt={tour.name}
                  fill
                  className="object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg line-clamp-1">{tour.name}</h3>
                <p className="text-orange-600 font-bold mt-1">от {tour.price}</p>
                <div className="flex items-center mt-2">
                  <span className="text-yellow-500 text-lg">★★★★★</span>
                  <span className="ml-2 text-gray-600 text-sm">{tour.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-lg border-t border-gray-800 z-50">
        <div className="max-w-screen-md mx-auto flex justify-around py-3">
          <Link href="/" className="text-orange-400 hover:text-orange-300 transition p-2">
            <Home size={28} />
          </Link>
          <Link href="/search" className="text-gray-300 hover:text-orange-400 transition p-2">
            <Search size={28} />
          </Link>
          <Link href="/map" className="text-gray-300 hover:text-orange-400 transition p-2">
            <MapPin size={28} />
          </Link>
          <Link href="/tours" className="text-gray-300 hover:text-orange-400 transition p-2">
            <Heart size={28} />
          </Link>
          <Link href="/hub/tourist" className="text-gray-300 hover:text-orange-400 transition p-2">
            <User size={28} />
          </Link>
        </div>
      </nav>
    </div>
  );
}

const categories = [
  { icon: Mountain },
  { icon: PawPrint },
  { icon: Fish },
  { icon: Wind },
  { icon: Footprints },
  { icon: Helicopter },
  { icon: Waves },
  { icon: Music },
];

const tours = [
  {
    name: 'Авачинский вулкан',
    price: '85 000 ₽',
    rating: '4.9',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  },
  {
    name: 'Медведи в Кроноцком',
    price: '120 000 ₽',
    rating: '4.8',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
  },
  {
    name: 'Рыбалка на реке',
    price: '95 000 ₽',
    rating: '4.7',
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
  },
];
