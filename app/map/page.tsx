'use client';

import { useState } from 'react';
import YandexMap from '@/components/YandexMap';
import Link from 'next/link';

// Типы активностей
type ActivityType = 'all' | 'volcano' | 'nature' | 'geyser' | 'ocean' | 'thermal';

// Маркеры с активностями
const KAMCHATKA_MARKERS = [
  {
    coords: [53.0444, 158.6483] as [number, number],
    title: 'Петропавловск-Камчатский',
    description: 'Столица Камчатского края',
    activity: 'nature' as ActivityType,
    color: 'blue'
  },
  {
    coords: [53.1574, 158.3866] as [number, number],
    title: 'Авачинская бухта',
    description: 'Одна из крупнейших бухт мира',
    activity: 'ocean' as ActivityType,
    color: 'blue'
  },
  {
    coords: [53.2550, 158.6474] as [number, number],
    title: 'Вулкан Авачинский',
    description: 'Действующий вулкан высотой 2741 м',
    activity: 'volcano' as ActivityType,
    color: 'orange'
  },
  {
    coords: [53.2869, 158.7030] as [number, number],
    title: 'Вулкан Корякский',
    description: 'Действующий вулкан высотой 3456 м',
    activity: 'volcano' as ActivityType,
    color: 'orange'
  },
  {
    coords: [54.7595, 160.2658] as [number, number],
    title: 'Долина Гейзеров',
    description: 'Одно из семи чудес России',
    activity: 'geyser' as ActivityType,
    color: 'green'
  },
  {
    coords: [52.0803, 157.9786] as [number, number],
    title: 'Курильское озеро',
    description: 'Место нереста лосося и обитания медведей',
    activity: 'nature' as ActivityType,
    color: 'green'
  },
  {
    coords: [52.9328, 158.0444] as [number, number],
    title: 'Мутновская ГеоЭС',
    description: 'Термальные источники',
    activity: 'thermal' as ActivityType,
    color: 'red'
  },
  {
    coords: [53.3833, 158.8833] as [number, number],
    title: 'Налычевская долина',
    description: 'Природный парк с термальными источниками',
    activity: 'thermal' as ActivityType,
    color: 'red'
  }
];

// Фильтры активностей
const ACTIVITY_FILTERS = [
  { id: 'all' as ActivityType, name: 'Все точки', count: KAMCHATKA_MARKERS.length },
  { id: 'volcano' as ActivityType, name: 'Вулканы', count: KAMCHATKA_MARKERS.filter(m => m.activity === 'volcano').length },
  { id: 'nature' as ActivityType, name: 'Природа', count: KAMCHATKA_MARKERS.filter(m => m.activity === 'nature').length },
  { id: 'geyser' as ActivityType, name: 'Гейзеры', count: KAMCHATKA_MARKERS.filter(m => m.activity === 'geyser').length },
  { id: 'ocean' as ActivityType, name: 'Океан', count: KAMCHATKA_MARKERS.filter(m => m.activity === 'ocean').length },
  { id: 'thermal' as ActivityType, name: 'Термальные источники', count: KAMCHATKA_MARKERS.filter(m => m.activity === 'thermal').length }
];

export default function MapPage() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ActivityType>('all');

  // Фильтрация маркеров
  const filteredMarkers = activeFilter === 'all' 
    ? KAMCHATKA_MARKERS 
    : KAMCHATKA_MARKERS.filter(m => m.activity === activeFilter);

  if (!isExpanded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <button
          onClick={() => setIsExpanded(true)}
          className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-3"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Открыть карту
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white">
      {/* Панель управления */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Левая часть - логотип и название */}
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-blue-600 hover:text-blue-700">
              KamHub
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-lg font-semibold text-gray-800">Карта Камчатки</h1>
          </div>

          {/* Кнопка свернуть */}
          <button
            onClick={() => setIsExpanded(false)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline">Свернуть карту</span>
          </button>
        </div>

        {/* Фильтры активностей */}
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {ACTIVITY_FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeFilter === filter.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.name}
              <span className={`ml-2 text-xs ${
                activeFilter === filter.id ? 'text-blue-200' : 'text-gray-500'
              }`}>
                ({filter.count})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Карта на весь экран */}
      <div className="absolute inset-0 pt-32">
        <YandexMap
          center={[53.0444, 158.6483]}
          zoom={8}
          markers={filteredMarkers}
          height="100%"
          className=""
        />
      </div>

      {/* Счетчик активных точек */}
      <div className="absolute bottom-4 left-4 z-40 bg-white rounded-lg shadow-lg px-4 py-2 border border-gray-200">
        <p className="text-sm text-gray-600">
          Показано точек: <span className="font-bold text-blue-600">{filteredMarkers.length}</span>
        </p>
      </div>
    </div>
  );
}
