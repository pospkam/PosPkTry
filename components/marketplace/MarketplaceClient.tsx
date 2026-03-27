'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Users, ChevronRight, Heart, ShoppingCart, Check, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

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
  duration_hours: number | null;
}

function formatDuration(hours: number | null): string | null {
  if (!hours) return null;
  if (hours < 24) return `${hours} ч`;
  const d = Math.round(hours / 24);
  return `${d} ${d === 1 ? 'день' : d < 5 ? 'дня' : 'дней'}`;
}

const ACTIVITY_LABELS: Record<string, string> = {
  trekking:   'Треккинг',
  fishing:    'Рыбалка',
  thermal:    'Термальные',
  helicopter: 'Вертолёт',
  rafting:    'Сплав',
  boat_trip:  'Морской тур',
  bears:      'Медведи',
  snowmobile: 'Снегоход',
};

const LOCATION_LABELS: Record<string, string> = {
  mountain:   'Горы',
  volcano:    'Вулканы',
  hot_spring: 'Горячие источники',
  lake:       'Озёра',
  sea:        'Море',
  river:      'Реки',
  forest:     'Тайга',
  coast:      'Побережье',
};

const ACTIVITY_IMAGES: Record<string, string> = {
  fishing:    '/images/activities/fishing.jpg',
  trekking:   '/images/activities/volcanoes.jpg',
  thermal:    '/images/activities/hotsprings.jpg',
  helicopter: '/images/activities/helicopter.jpg',
  rafting:    '/images/activities/rafting.jpg',
  boat_trip:  '/images/activities/sea.jpg',
  bears:      '/images/categories/medvedi.jpg',
  snowmobile: '/images/activities/snowmobile.jpg',
};

const ACTIVITY_OPTIONS = [
  { value: 'trekking',   label: 'Треккинг'    },
  { value: 'fishing',    label: 'Рыбалка'     },
  { value: 'rafting',    label: 'Сплав'       },
  { value: 'thermal',    label: 'Термальные'  },
  { value: 'helicopter', label: 'Вертолёт'    },
  { value: 'boat_trip',  label: 'Морской тур' },
  { value: 'bears',      label: 'Медведи'     },
  { value: 'snowmobile', label: 'Снегоход'    },
];

function TourCardSkeleton() {
  return (
    <div className="ds-card overflow-hidden">
      <div className="ds-skeleton h-52 w-full" />
      <div className="p-5 space-y-3">
        <div className="ds-skeleton h-3 w-1/3 rounded" />
        <div className="ds-skeleton h-5 w-4/5 rounded" />
        <div className="ds-skeleton h-3 w-full rounded" />
        <div className="ds-skeleton h-3 w-3/4 rounded" />
        <div className="ds-skeleton h-4 w-1/4 rounded mt-4" />
      </div>
    </div>
  );
}

function TourCard({
  tour,
  isLiked,
  onToggleLike,
}: {
  tour: Tour;
  isLiked: boolean;
  onToggleLike: (tourId: number) => void;
}) {
  const { add, remove, has } = useCart();
  const inCart = has(tour.id);
  const activityLabel = ACTIVITY_LABELS[tour.activity_type] ?? tour.activity_type;
  const locationLabel = LOCATION_LABELS[tour.location_type] ?? tour.location_type;
  const imageSrc = tour.tour_image ?? ACTIVITY_IMAGES[tour.activity_type] ?? '/images/activities/volcanoes.jpg';

  const toggleCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCart) {
      remove(tour.id);
    } else {
      add({
        tourId: tour.id,
        title: tour.title,
        operatorName: tour.operator_name,
        price: tour.base_price,
        activityType: tour.activity_type,
        image: tour.tour_image,
      });
    }
  };

  return (
    <div className="ds-card overflow-hidden group flex flex-col hover:shadow-md transition-shadow duration-200 relative">
      {/* Фото */}
      <Link href={`/marketplace/tours/${tour.id}`} className="block flex-shrink-0">
        <div className="relative aspect-[4/3] bg-[var(--bg-hover)] overflow-hidden">
          <Image
            src={imageSrc}
            alt={tour.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-3 left-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-[var(--bg-card)]/90 text-[var(--text-primary)] px-2 py-0.5 rounded-full">
              {activityLabel}
            </span>
          </div>
          {/* Цена поверх фото — сразу видна */}
          <div className="absolute bottom-3 left-3">
            <span className="text-xs text-[#fff]/70">от </span>
            <span className="font-bold text-[#fff] text-base">
              {tour.base_price.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
      </Link>

      {/* Кнопка избранного */}
      <button
        onClick={() => onToggleLike(tour.id)}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-[var(--bg-card)]/80 flex items-center justify-center transition-colors hover:bg-[var(--bg-card)]"
        aria-label={isLiked ? 'Убрать из избранного' : 'В избранное'}
      >
        <Heart
          className={`w-4 h-4 transition-colors ${isLiked ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
        />
      </button>

      {/* Контент */}
      <Link href={`/marketplace/tours/${tour.id}`} className="p-5 flex flex-col flex-1">
        <p className="text-[11px] text-[var(--text-muted)] mb-1">{tour.operator_name}</p>
        <h3 className="font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 mb-2">
          {tour.title}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 flex-1">
          {tour.description}
        </p>

        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-4 flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {locationLabel}
          </span>
          {formatDuration(tour.duration_hours) && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(tour.duration_hours)}
            </span>
          )}
          {tour.bookings_count > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {tour.bookings_count}
            </span>
          )}
        </div>
      </Link>

      {/* Нижняя панель — вне Link */}
      <div className="px-5 pb-5 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCart}
            title={inCart ? 'Убрать из корзины' : 'В корзину'}
            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all duration-150 ${
              inCart
                ? 'bg-[var(--success)] border-[var(--success)] text-[#F0F6FC]'
                : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
            }`}
          >
            {inCart ? <Check className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
          </button>
        </div>
        <Link
          href={`/marketplace/tours/${tour.id}#booking`}
          className="ds-btn ds-btn-primary text-xs px-4 py-1.5"
        >
          Забронировать
        </Link>
      </div>
    </div>
  );
}

export default function MarketplaceClient() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [likedMap, setLikedMap] = useState<Map<number, string>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce поиска — 350ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm]);

  // Загружаем избранное
  useEffect(() => {
    fetch('/api/tourist/wishlist?type=tour')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data) {
          const map = new Map<number, string>();
          for (const item of data.data as { item_id: string; id: string | number }[]) {
            map.set(parseInt(item.item_id), String(item.id));
          }
          setLikedMap(map);
        }
      })
      .catch(() => {});
  }, []);

  // Загружаем туры
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (activityFilter) params.append('activity_type', activityFilter);

    setLoading(true);
    setError('');
    fetch(`/api/hub/marketplace/tours?${params}`)
      .then(r => {
        if (!r.ok) throw new Error('Ошибка загрузки');
        return r.json();
      })
      .then(data => { if (data?.tours) setTours(data.tours); })
      .catch(() => setError('Не удалось загрузить туры. Попробуйте обновить страницу.'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, activityFilter]);

  const handleToggleLike = useCallback(async (tourId: number) => {
    const wishlistRowId = likedMap.get(tourId);
    const isLiked = likedMap.has(tourId);

    if (isLiked && wishlistRowId) {
      setLikedMap(prev => { const next = new Map(prev); next.delete(tourId); return next; });
      const res = await fetch(`/api/tourist/wishlist?id=${wishlistRowId}`, { method: 'DELETE' });
      if (!res.ok) setLikedMap(prev => { const next = new Map(prev); next.set(tourId, wishlistRowId); return next; });
    } else {
      setLikedMap(prev => { const next = new Map(prev); next.set(tourId, ''); return next; });
      const res = await fetch('/api/tourist/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: 'tour', itemId: String(tourId) }),
      });
      if (res.ok) {
        const data = await res.json() as { data?: { id?: string | number } };
        setLikedMap(prev => { const next = new Map(prev); next.set(tourId, String(data?.data?.id ?? '')); return next; });
      } else {
        setLikedMap(prev => { const next = new Map(prev); next.delete(tourId); return next; });
      }
    }
  }, [likedMap]);

  return (
    <div className="ds-page pb-20">
      <div className="mb-8">
        <h1 className="ds-h1 mb-1">Туры Камчатки</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Проверенные операторы, реальные маршруты
        </p>
        {/* AI-баннер */}
        <Link
          href="/planner"
          className="flex items-center gap-3 p-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Не знаете что выбрать?</p>
            <p className="text-xs text-[var(--text-muted)]">Кузьмич подберёт тур под ваши даты, бюджет и интересы</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--accent)] shrink-0" />
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
          className="ds-input sm:w-48"
        >
          <option value="">Все активности</option>
          {ACTIVITY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Счётчик результатов */}
      {!loading && !error && (
        <p className="text-sm text-[var(--text-muted)] mb-6">
          {tours.length > 0
            ? `Найдено ${tours.length} ${tours.length === 1 ? 'тур' : tours.length < 5 ? 'тура' : 'туров'}`
            : null}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <TourCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      ) : tours.length === 0 ? (
        <div className="text-center py-16">
          <p className="ds-h2 mb-2">Туры не найдены</p>
          <p className="text-sm text-[var(--text-muted)]">Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tours.map(tour => (
            <TourCard
              key={tour.id}
              tour={tour}
              isLiked={likedMap.has(tour.id)}
              onToggleLike={handleToggleLike}
            />
          ))}
        </div>
      )}
    </div>
  );
}
