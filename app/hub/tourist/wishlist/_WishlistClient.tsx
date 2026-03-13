'use client';

import Link from 'next/link';
import { Protected } from '@/components/auth/Protected';
import { Heart, Loader2, MapPin, ExternalLink } from 'lucide-react';
import { useApiFetch } from '@/hooks/use-api-fetch';

interface WishlistItem {
  id: string;
  item_type: string;
  item_id: string;
  priority: string;
  notes: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  tour: 'Тур',
  accommodation: 'Жильё',
  partner: 'Партнёр',
  destination: 'Место',
  activity: 'Активность',
};

const TYPE_HREFS: Record<string, (id: string) => string> = {
  tour: (id) => `/tours/${id}`,
  partner: (id) => `/partners/${id}`,
  destination: (_id) => `/map`,
  activity: (id) => `/tours?category=${id}`,
};

export default function WishlistClient() {
  const { data, loading, error, setData } = useApiFetch<WishlistItem[], WishlistItem[]>(
    '/api/tourist/wishlist',
    (d) => d ?? [],
    { errorMessage: 'Не удалось загрузить избранное' },
  );

  const items = data ?? [];

  const handleRemove = async (itemId: string) => {
    setData((prev) => (prev ?? []).filter((t) => t.id !== itemId));
    try {
      await fetch(`/api/tourist/wishlist?id=${itemId}`, { method: 'DELETE' });
    } catch {
      // silent
    }
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
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Heart className="w-16 h-16 mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Heart
              className="w-16 h-16 mb-4"
              style={{ color: 'var(--text-muted)' }}
            />
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
              Сохраните понравившиеся туры
            </p>
            <Link
              href="/tours"
              className="mt-4 px-6 py-3 rounded-xl font-medium text-sm"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              Смотреть туры
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const typeLabel = TYPE_LABELS[item.item_type] ?? item.item_type;
              const href = TYPE_HREFS[item.item_type]?.(item.item_id) ?? '/tours';
              return (
                <div
                  key={item.id}
                  className="rounded-lg border overflow-hidden"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div
                    className="h-40 flex flex-col items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--bg-primary)' }}
                  >
                    <MapPin className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
                    <span
                      className="text-xs font-medium px-2 py-1 rounded-full"
                      style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                    >
                      {typeLabel}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    <h3
                      className="font-semibold text-base truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {item.notes ?? `${typeLabel} #${item.item_id.slice(0, 8)}`}
                    </h3>

                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Добавлено: {new Date(item.created_at).toLocaleDateString('ru-RU')}
                    </p>

                    <div className="flex gap-2">
                      <Link
                        href={href}
                        className="flex-1 min-h-[44px] px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-1"
                        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Открыть
                      </Link>

                      <button
                        onClick={() => handleRemove(item.id)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border"
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
              );
            })}
          </div>
        )}
      </div>
    </Protected>
  );
}
