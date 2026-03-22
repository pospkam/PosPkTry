'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Users, DollarSign } from 'lucide-react';

interface Tour {
  id: number;
  title: string;
  description: string;
  base_price: number;
  activity_type: string;
  location_type: string;
  location: string;
  operator_name: string;
  operator_id: number;
  bookings_count: number;
}

export default function MarketplaceClient() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('');

  useEffect(() => {
    const fetchTours = async () => {
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (activityFilter) params.append('activity_type', activityFilter);

        const res = await fetch(`/api/hub/marketplace/tours?${params}`);
        if (res.ok) {
          const data = await res.json();
          setTours(data.tours);
        }
      } catch (err) {
        console.error('Failed to fetch tours:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTours();
  }, [searchTerm, activityFilter]);

  const activityOptions = [
    { value: 'trekking', label: 'Треккинг' },
    { value: 'fishing', label: 'Рыбалка' },
    { value: 'thermal', label: 'Термальные' },
    { value: 'helicopter', label: 'Вертолёт' },
    { value: 'boat_trip', label: 'Круизы' }
  ];

  return (
    <div className="ds-page pb-20">
      <div className="mb-8">
        <h1 className="ds-h1 mb-6">Туры Камчатки</h1>

        {/* Search & Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <input
            type="text"
            placeholder="Поиск по названию или описанию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ds-input"
          />

          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="ds-input"
          >
            <option value="">Все виды активности</option>
            {activityOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)]">Загрузка туров...</p>
        </div>
      ) : tours.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)]">Туры не найдены</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tours.map(tour => (
            <Link
              key={tour.id}
              href={`/marketplace/tours/${tour.id}`}
              className="ds-card hover:shadow-lg transition-shadow duration-200 overflow-hidden"
            >
              <div className="p-6 h-full flex flex-col">
                {/* Header */}
                <div className="mb-3">
                  <h3 className="ds-h2 line-clamp-2 mb-2">{tour.title}</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {tour.operator_name}
                  </p>
                </div>

                {/* Description */}
                <p className="text-sm text-[var(--text-secondary)] line-clamp-3 mb-4 flex-grow">
                  {tour.description}
                </p>

                {/* Details */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <MapPin size={16} className="flex-shrink-0" />
                    <span>{tour.location_type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Users size={16} className="flex-shrink-0" />
                    <span>{tour.bookings_count} бронирований</span>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                  <span className="text-xs text-[var(--text-muted)]">От</span>
                  <div className="flex items-center gap-1 text-[var(--accent)] font-bold">
                    <DollarSign size={16} />
                    <span>{tour.base_price.toLocaleString('ru-RU')}₽</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <button className="w-full text-center text-sm text-[var(--ocean)] hover:text-[var(--accent)] transition-colors duration-200 font-semibold">
                    Подробнее →
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
