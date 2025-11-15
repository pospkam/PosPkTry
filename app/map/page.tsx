'use client';

import { useState } from 'react';
import YandexMap from '@/components/YandexMap';
import Link from 'next/link';

// Популярные туристические точки Камчатки
const KAMCHATKA_ATTRACTIONS = [
  {
    coords: [53.0444, 158.6483] as [number, number],
    title: 'Петропавловск-Камчатский',
    description: 'Столица Камчатского края',
    color: 'red'
  },
  {
    coords: [53.1574, 158.3866] as [number, number],
    title: 'Авачинская бухта',
    description: 'Одна из крупнейших бухт мира',
    color: 'blue'
  },
  {
    coords: [53.2550, 158.6474] as [number, number],
    title: 'Вулкан Авачинский',
    description: 'Действующий вулкан высотой 2741 м',
    color: 'orange'
  },
  {
    coords: [53.2869, 158.7030] as [number, number],
    title: 'Вулкан Корякский',
    description: 'Действующий вулкан высотой 3456 м',
    color: 'orange'
  },
  {
    coords: [54.7595, 160.2658] as [number, number],
    title: 'Долина Гейзеров',
    description: 'Одно из семи чудес России',
    color: 'green'
  },
  {
    coords: [52.0803, 157.9786] as [number, number],
    title: 'Курильское озеро',
    description: 'Место нереста лосося и обитания медведей',
    color: 'green'
  }
];

export default function MapPage() {
  const [selectedMarkers, setSelectedMarkers] = useState(KAMCHATKA_ATTRACTIONS);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Шапка */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                KamHub
              </Link>
              <span className="text-gray-400">|</span>
              <h1 className="text-xl font-semibold text-gray-800">Карта Камчатки</h1>
            </div>
            <Link 
              href="/" 
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              На главную
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Заголовок секции */}
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Интерактивная карта Камчатки
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Исследуйте главные достопримечательности и туристические маршруты полуострова
          </p>
        </div>

        {/* Карта */}
        <div className="mb-8">
          <YandexMap
            center={[53.0444, 158.6483]}
            zoom={8}
            markers={selectedMarkers}
            height="600px"
            className="shadow-2xl"
          />
        </div>

        {/* Список достопримечательностей */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">
            Популярные места
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {KAMCHATKA_ATTRACTIONS.map((attraction, index) => (
              <button
                key={index}
                onClick={() => {
                  // Центрируем карту на выбранной точке
                  setSelectedMarkers([attraction]);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-cyan-50 rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-all duration-300 text-left group"
              >
                <div>
                  <h4 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors mb-1">
                    {attraction.title}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {attraction.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Кнопка показать все */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setSelectedMarkers(KAMCHATKA_ATTRACTIONS)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl"
            >
              Показать все точки на карте
            </button>
          </div>
        </div>

        {/* Информационный блок */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h4 className="font-bold text-lg mb-2">29 вулканов</h4>
            <p className="text-gray-600 text-sm">
              Действующих вулканов на полуострове
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h4 className="font-bold text-lg mb-2">Дикая природа</h4>
            <p className="text-gray-600 text-sm">
              Медведи, лососи, орланы и киты
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h4 className="font-bold text-lg mb-2">Термальные источники</h4>
            <p className="text-gray-600 text-sm">
              Более 160 горячих источников
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

