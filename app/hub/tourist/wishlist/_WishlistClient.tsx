'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Protected } from '@/components/auth/Protected';
import { Heart, Loader2, ExternalLink, Mountain } from 'lucide-react';
import { useApiFetch } from '@/hooks/use-api-fetch';

interface WishlistItem {
  id: string;
  item_type: string;
  item_id: string;
  priority: string;
  notes: string | null;
  created_at: string;
}

interface TourDetail {
  name: string;
  images: string[];
  price: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

interface TourApiResponse {
  success: boolean;
  data?: TourDetail;
}

interface FetchedTour {
  id: string;
  detail: TourDetail;
}

const TYPE_LABELS: Record<string, string> = {
  tour: 'Тур',
  accommodation: 'Жильё',
  partner: 'Партнёр',
  destination: 'Место',
  activity: 'Активность',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный',
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

  const [tourDetails, setTourDetails] = useState<Map<string, TourDetail>>(new Map());
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  const items = data ?? [];

  useEffect(() => {
    if (!data) return;

    const tourItems = data.filter((item) => item.item_type === 'tour');
    if (tourItems.length === 0) return;

    const missingIds = tourItems
      .map((item) => item.item_id)
      .filter((id) => !fetchedIdsRef.current.has(id));

    if (missingIds.length === 0) return;

    missingIds.forEach((id) => fetchedIdsRef.current.add(id));

    Promise.allSettled(
      missingIds.map((tourId) =>
        fetch(`/api/tours/${tourId}`)
          .then<TourApiResponse>((res) => res.json())
          .then((json): FetchedTour | null => {
            if (json.success && json.data) {
              return { id: tourId, detail: json.data };
            }
            return null;
          })
          .catch((): null => null),
      ),
    ).then((results) => {
      setTourDetails((prev) => {
        const next = new Map(prev);
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            next.set(result.value.id, result.value.detail);
          }
        }
        return next;
      });
    });
  }, [data]);

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
      <div className="max-w-5xl mx-auto px-4 py-6 lg:py-8">
        <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-6">
          Избранное
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Heart className="w-16 h-16 mb-4 text-[var(--text-muted)]" />
            <p className="text-lg text-[var(--text-muted)]">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Heart className="w-16 h-16 mb-4 text-[var(--text-muted)]" />
            <p className="text-lg text-[var(--text-muted)]">
              Сохраните понравившиеся туры
            </p>
            <Link
              href="/marketplace"
              className="ds-btn ds-btn-primary mt-4 px-6 py-3"
            >
              Смотреть туры
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const typeLabel = TYPE_LABELS[item.item_type] ?? item.item_type;
              const href = TYPE_HREFS[item.item_type]?.(item.item_id) ?? '/tours';
              const detail = item.item_type === 'tour'
                ? tourDetails.get(item.item_id)
                : undefined;
              const coverImage = detail?.images?.[0] ?? null;
              const displayName =
                detail?.name ?? item.notes ?? `${typeLabel} #${item.item_id.slice(0, 8)}`;

              return (
                <div
                  key={item.id}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden flex flex-col"
                >
                  {/* Cover image / placeholder */}
                  <div className="relative h-40 flex flex-col items-center justify-center gap-2 bg-[var(--bg-primary)]">
                    {coverImage ? (
                      <Image
                        src={coverImage}
                        alt={displayName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <Mountain className="w-10 h-10 text-[var(--text-muted)]" />
                    )}
                    <span className="relative z-10 text-xs font-medium px-2 py-1 rounded-lg bg-[var(--accent)] text-[var(--bg-card)]">
                      {typeLabel}
                    </span>
                  </div>

                  <div className="p-4 space-y-3 flex flex-col flex-1">
                    <h3
                      className="font-semibold text-base text-[var(--text-primary)] line-clamp-2"
                      title={displayName}
                    >
                      {displayName}
                    </h3>

                    {detail && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {detail.price > 0 && (
                          <span className="text-sm font-semibold text-[var(--accent)]">
                            от {detail.price.toLocaleString('ru-RU')} ₽
                          </span>
                        )}
                        {detail.difficulty && (
                          <span className="text-xs px-2 py-0.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)]">
                            {DIFFICULTY_LABELS[detail.difficulty] ?? detail.difficulty}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-[var(--text-muted)]">
                      Добавлено: {new Date(item.created_at).toLocaleDateString('ru-RU')}
                    </p>

                    <div className="flex gap-2 mt-auto">
                      <Link
                        href={href}
                        className="ds-btn ds-btn-primary flex-1 min-h-[44px] px-4 flex items-center justify-center gap-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Открыть
                      </Link>

                      <button
                        onClick={() => handleRemove(item.id)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
                        aria-label="Удалить из избранного"
                      >
                        <Heart
                          className="w-5 h-5 text-[var(--danger)]"
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
