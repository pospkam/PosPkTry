'use client';

import { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { Heart, Loader2, MapPin } from 'lucide-react';

// Демо-данные избранных туров
interface WishlistTour {
  id: string;
  name: string;
  price: number;
  location: string;
}

const DEMO_TOURS: WishlistTour[] = [
  { id: '1', name: 'Восхождение на Авачинский вулкан', price: 12000, location: 'Авачинский вулкан' },
  { id: '2', name: 'Долина гейзеров — вертолетная экскурсия', price: 45000, location: 'Долина гейзеров' },
  { id: '3', name: 'Морская рыбалка на Тихом океане', price: 8500, location: 'Авачинская бухта' },
];

export default function WishlistClient() {
  const [loading, setLoading] = useState(true);
  const [tours, setTours] = useState<WishlistTour[]>([]);

  // Имитация загрузки демо-данных
  useEffect(() => {
    const timer = setTimeout(() => {
      setTours(DEMO_TOURS);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Удаление тура из избранного
  const handleRemove = (tourId: string) => {
    setTours((prev) => prev.filter((t) => t.id !== tourId));
  };

  return (
    <Protected roles={['tourist', 'admin']}>
      <div className="max-w-5xl mx-auto p-6">
        <h1
          className="text-2xl font-semibold mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          Избранное
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: 'var(--accent)' }}
            />
          </div>
        ) : tours.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Heart
              className="w-16 h-16 mb-4"
              style={{ color: 'var(--text-muted)' }}
            />
            <p
              className="text-lg"
              style={{ color: 'var(--text-muted)' }}
            >
              Сохраните понравившиеся туры
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tours.map((tour) => (
              <div
                key={tour.id}
                className="rounded-2xl border overflow-hidden"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                }}
              >
                {/* Плейсхолдер изображения */}
                <div
                  className="h-40 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bg-primary)' }}
                >
                  <MapPin
                    className="w-10 h-10"
                    style={{ color: 'var(--text-muted)' }}
                  />
                </div>

                <div className="p-4 space-y-3">
                  <h3
                    className="font-semibold text-base"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {tour.name}
                  </h3>

                  <p
                    className="text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {tour.location}
                  </p>

                  <p
                    className="text-lg font-bold"
                    style={{ color: 'var(--accent)' }}
                  >
                    {tour.price.toLocaleString('ru-RU')} &#8381;
                  </p>

                  <div className="flex gap-2">
                    <button
                      className="flex-1 min-h-[44px] px-4 rounded-xl font-medium text-sm transition-colors"
                      style={{
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                      }}
                    >
                      Забронировать
                    </button>

                    <button
                      onClick={() => handleRemove(tour.id)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-colors"
                      style={{ borderColor: 'var(--border)' }}
                      aria-label="Удалить из избранного"
                    >
                      <Heart
                        className="w-5 h-5"
                        style={{ color: 'var(--danger)' }}
                        fill="currentColor"
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Protected>
  );
}
