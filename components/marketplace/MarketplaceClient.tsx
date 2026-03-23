'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Users, ChevronRight } from 'lucide-react';

interface Tour {
  id: number;
  title: string;
  description: string;
  base_price: number;
  activity_type: string;
  location_type: string;
  location: string;
  tour_image: string | null;
  operator_name: string;
  operator_id: number;
  bookings_count: number;
}

const ACTIVITY_LABELS: Record<string, string> = {
  trekking: 'Треккинг',
  fishing: 'Рыбалка',
  thermal: 'Термальные',
  helicopter: 'Вертолёт',
  boat_trip: 'Морские',
  bears: 'Медведи',
  snowmobile: 'Снегоход',
};

const ACTIVITY_OPTIONS = [
  { value: 'trekking',   label: 'Треккинг'   },
  { value: 'fishing',    label: 'Рыбалка'    },
  { value: 'thermal',    label: 'Термальные' },
  { value: 'helicopter', label: 'Вертолёт'   },
  { value: 'boat_trip',  label: 'Морские'    },
];

function TourCardSkeleton() {
  return (
    <div className="ds-card overflow-hidden">
      <div className="ds-skeleton h-48 w-full" />
      <div className="p-5 space-y-3">
        <div className="ds-skeleton h-4 w-1/3 rounded" />
        <div className="ds-skeleton h-5 w-4/5 rounded" />
        <div className="ds-skeleton h-3 w-full rounded" />
        <div className="ds-skeleton h-3 w-3/4 rounded" />
        <div className="ds-skeleton h-4 w-1/4 rounded mt-4" />
      </div>
    </div>
  );
}

function TourCard({ tour }: { tour: Tour }) {
  const activityLabel = ACTIVITY_LABELS[tour.activity_type] ?? tour.activity_type;

  return (
    <Link
      href={`/marketplace/tours/${tour.id}`}
      className="ds-card overflow-hidden group flex flex-col hover:shadow-md transition-shadow duration-200"
    >
      {/* Фото тура */}
      <div className="relative h-48 bg-[var(--bg-hover)] flex-shrink-0 overflow-hidden">
        {tour.tour_image ? (
          <Image
            src={tour.tour_image}
            alt={tour.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
        )}
        {/* Бейдж активности */}
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-black/60 text-white px-2 py-0.5 rounded-full">
            {activityLabel}
          </span>
        </div>
      </div>

      {/* Контент */}
      <div className="p-5 flex flex-col flex-1">
        <p className="text-[11px] text-[var(--text-muted)] mb-1">{tour.operator_name}</p>
        <h3 className="font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 mb-2">
          {tour.title}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 flex-1">
          {tour.description}
        </p>

        {/* Мета */}
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-4">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {tour.location_type}
          </span>
          {tour.bookings_count > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {tour.bookings_count}
            </span>
          )}
        </div>

        {/* Цена + CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <div>
            <span className="text-[10px] text-[var(--text-muted)]">от </span>
            <span className="font-bold text-[var(--accent)]">
              {tour.base_price.toLocaleString('ru-RU')} ₽
            </span>
          </div>
          <span className="flex items-center gap-0.5 text-xs text-[var(--ocean)] font-medium group-hover:gap-1.5 transition-all">
            Подробнее <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function MarketplaceClient() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (activityFilter) params.append('activity_type', activityFilter);

    setLoading(true);
    fetch(`/api/hub/marketplace/tours?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.tours) setTours(data.tours); })
      .catch(() => {/* silent */})
      .finally(() => setLoading(false));
  }, [searchTerm, activityFilter]);

  return (
    <div className="ds-page pb-20">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="ds-h1 mb-1">Туры Камчатки</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Проверенные операторы, реальные маршруты
        </p>
      </div>

      {/* Фильтры */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          placeholder="Поиск по названию..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="ds-input flex-1"
        />
        <select
          value={activityFilter}
          onChange={e => setActivityFilter(e.target.value)}
          className="ds-input sm:w-44"
        >
          <option value="">Все активности</option>
          {ACTIVITY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Сетка туров */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <TourCardSkeleton key={i} />)}
        </div>
      ) : tours.length === 0 ? (
        <div className="text-center py-16">
          <p className="ds-h2 mb-2">Туры не найдены</p>
          <p className="text-sm text-[var(--text-muted)]">Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tours.map(tour => <TourCard key={tour.id} tour={tour} />)}
        </div>
      )}
    </div>
  );
}
