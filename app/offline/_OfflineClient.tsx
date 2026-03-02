'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, MapPin } from 'lucide-react';
import Link from 'next/link';

interface CachedTour {
  url: string;
  title: string;
}

/**
 * Offline page -- показывается когда нет подключения к интернету.
 * Показывает список кэшированных туров из Cache API.
 */
export default function OfflineClient() {
  const [cachedTours, setCachedTours] = useState<CachedTour[]>([]);

  useEffect(() => {
    async function loadCachedTours() {
      try {
        if (!('caches' in window)) return;
        const cache = await caches.open('kamchatour-v1');
        const keys = await cache.keys();
        // Ищем кэшированные страницы туров по паттерну /tours/[id]
        const tourPages = keys.filter(req => {
          const pathname = new URL(req.url).pathname;
          return /^\/tours\/[a-f0-9-]+$/i.test(pathname);
        });

        const tours: CachedTour[] = tourPages.map(req => {
          const pathname = new URL(req.url).pathname;
          const id = pathname.split('/').pop() ?? '';
          return {
            url: pathname,
            title: `Тур ${id.slice(0, 8)}...`,
          };
        });

        setCachedTours(tours);
      } catch {
        // Cache API недоступен
      }
    }

    void loadCachedTours();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6 text-center">
      <WifiOff className="w-16 h-16 text-[var(--text-muted)] mb-6" />

      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
        Нет подключения к интернету
      </h1>
      <p className="text-[var(--text-secondary)] mb-8 max-w-md">
        Доступны сохранённые туры из вашего последнего визита
      </p>

      {cachedTours.length > 0 && (
        <div className="w-full max-w-md mb-8">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
            Сохранённые туры
          </h2>
          <div className="space-y-2">
            {cachedTours.map(tour => (
              <Link
                key={tour.url}
                href={tour.url}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors min-h-[44px]"
              >
                <MapPin className="w-5 h-5 text-[var(--accent)] shrink-0" />
                <span className="text-[var(--text-primary)] text-sm">{tour.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => window.location.reload()}
        className="min-h-[44px] px-6 py-3 rounded-[var(--radius-md)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium inline-flex items-center gap-2 transition-colors"
      >
        <RefreshCw className="w-5 h-5" />
        Обновить страницу
      </button>
    </div>
  );
}
