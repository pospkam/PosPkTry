'use client';

import { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import Link from 'next/link';

interface Tour {
  id: number;
  title: string;
  base_price: number;
  activity_type: string;
  location_type: string;
  description: string;
  operator_name: string;
}

export default function MarketplaceClient() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [filtered, setFiltered] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');

  useEffect(() => {
    const fetchTours = async () => {
      try {
        const res = await fetch('/api/hub/marketplace/tours');
        if (res.ok) {
          const data = await res.json();
          setTours(data.tours || []);
          setFiltered(data.tours || []);
        }
      } catch (err) {
        console.error('Failed to fetch tours:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTours();
  }, []);

  useEffect(() => {
    let result = tours;

    if (search) {
      result = result.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (activityFilter !== 'all') {
      result = result.filter(t => t.activity_type === activityFilter);
    }

    setFiltered(result);
  }, [search, activityFilter, tours]);

  const ActivityBadge = ({ type }: { type: string }) => {
    const colors: Record<string, string> = {
      fishing: 'bg-blue-100 text-blue-800',
      trekking: 'bg-green-100 text-green-800',
      thermal: 'bg-red-100 text-red-800',
      helicopter: 'bg-purple-100 text-purple-800',
      boat_trip: 'bg-cyan-100 text-cyan-800'
    };
    return (
      <span className={`text-xs font-semibold px-2 py-1 rounded ${colors[type] || 'bg-gray-100'}`}>
        {type}
      </span>
    );
  };

  if (loading) {
    return <div className="p-6 text-center">Загрузка туров...</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Hero */}
      <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--ocean)] text-white p-8 mb-8">
        <h1 className="text-4xl font-bold mb-2">Туры Камчатки</h1>
        <p className="text-lg opacity-90">Откройте дикую красоту полуострова</p>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-12">
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="ds-label">Поиск</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="ds-input w-full pl-10"
                  placeholder="Вулкан, рыбалка, горячие источники..."
                />
              </div>
            </div>

            <div className="w-48">
              <label className="ds-label flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Тип активности
              </label>
              <select
                value={activityFilter}
                onChange={e => setActivityFilter(e.target.value)}
                className="ds-input w-full"
              >
                <option value="all">Все</option>
                <option value="trekking">Трекинг</option>
                <option value="fishing">Рыбалка</option>
                <option value="thermal">Горячие источники</option>
                <option value="helicopter">Вертолёт</option>
                <option value="boat_trip">Лодка</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-[var(--text-secondary)] mb-6">Найдено туров: {filtered.length}</p>

        {/* Tours Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)]">По вашим критериям туров не найдено</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(tour => (
              <Link
                key={tour.id}
                href={`/marketplace/tours/${tour.id}`}
                className="ds-card hover:shadow-lg transition group overflow-hidden"
              >
                <div className="h-48 bg-gradient-to-br from-[var(--accent)] to-[var(--ocean)] opacity-10 group-hover:opacity-20 transition" />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-[var(--text-primary)] line-clamp-2">
                      {tour.title}
                    </h3>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
                    {tour.description}
                  </p>

                  <div className="flex gap-2 mb-3 flex-wrap">
                    <ActivityBadge type={tour.activity_type} />
                    <span className="text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] px-2 py-1 rounded">
                      {tour.location_type}
                    </span>
                  </div>

                  <div className="border-t border-[var(--border)] pt-3 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">от</p>
                      <p className="text-2xl font-bold text-[var(--accent)]">
                        {tour.base_price.toLocaleString()} ₽
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--text-muted)]">Оператор</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {tour.operator_name}
                      </p>
                    </div>
                  </div>

                  <button className="ds-btn ds-btn-primary w-full mt-4">
                    Подробнее
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
