'use client';

import dynamic from 'next/dynamic';
import { MarkerType } from '@/components/shared/LeafletMap';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

export default function MarkersTestPage() {
  const testMarkers = [
    {
      coords: [53.0444, 158.6483] as [number, number],
      title: 'TOUR: Вулканы (синий)',
      description: 'Кружок - тип TOUR, синий - по категории',
      color: 'blue',
      type: MarkerType.TOUR,
      category: 'vulkani',
      href: '/routes/test-1',
    },
    {
      coords: [53.0544, 158.6383] as [number, number],
      title: 'TRANSFER: Трансфер (зелёный)',
      description: 'Квадрат - тип TRANSFER',
      color: 'green',
      type: MarkerType.TRANSFER,
      href: '/transfer/test-1',
    },
    {
      coords: [53.0344, 158.6583] as [number, number],
      title: 'ACCOMMODATION: Отель (оранжевый)',
      description: 'Ромб - тип ACCOMMODATION',
      color: 'orange',
      type: MarkerType.ACCOMMODATION,
      href: '/accommodation/test-1',
    },
    {
      coords: [53.0644, 158.6283] as [number, number],
      title: 'RESTAURANT: Ресторан (красный)',
      description: 'Крест - тип RESTAURANT',
      color: 'red',
      type: MarkerType.RESTAURANT,
      href: '/restaurant/test-1',
    },
    {
      coords: [53.0244, 158.6683] as [number, number],
      title: 'POI: Достопримечательность (фиолетовый)',
      description: 'Звезда - тип POI',
      color: 'purple',
      type: MarkerType.POI,
      href: '/poi/test-1',
    },
    {
      coords: [53.0744, 158.6183] as [number, number],
      title: 'TOUR: Медведи (коричневый)',
      description: 'Кружок - тип TOUR, коричневый - по категории',
      color: 'brown',
      type: MarkerType.TOUR,
      category: 'medvedi',
      href: '/routes/test-2',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
          Тест типов маркеров на карте
        </h1>

        <div className="mb-6 p-4 bg-[var(--bg-card)] rounded-lg border border-[var(--border)]">
          <h2 className="text-lg font-semibold mb-3 text-[var(--text-primary)]">Типы маркеров:</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 border border-white"></div>
              <span className="text-[var(--text-secondary)]">TOUR — кружок</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 border border-white"></div>
              <span className="text-[var(--text-secondary)]">TRANSFER — квадрат</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 border border-white" style={{ transform: 'rotate(45deg)' }}></div>
              <span className="text-[var(--text-secondary)]">ACCOMMODATION — ромб</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 border border-white"></div>
              <span className="text-[var(--text-secondary)]">RESTAURANT — крест</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0 h-0 border-l-1.5 border-r-1.5 border-b-3 border-l-transparent border-r-transparent border-b-purple-500" style={{ transform: 'translate(6px, 0)' }}></div>
              <span className="text-[var(--text-secondary)]">POI — звезда</span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] overflow-hidden" style={{ height: '500px' }}>
          <LeafletMap
            markers={testMarkers}
            center={[53.0444, 158.6483]}
            zoom={10}
            height="100%"
            attribution={true}
          />
        </div>

        <div className="mt-6 p-4 bg-[var(--bg-card)] rounded-lg border border-[var(--border)]">
          <h3 className="font-semibold text-[var(--text-primary)] mb-2">Информация:</h3>
          <ul className="text-sm text-[var(--text-secondary)] space-y-1">
            <li>• Нажимайте на маркеры чтобы видеть их названия</li>
            <li>• Каждый тип имеет свою форму и цвет по категории</li>
            <li>• Цвета определяются по CATEGORY_COLORS список</li>
            <li>• Разные типы можно использовать в разных местах на платформе</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
