'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin, Users, ChevronRight, Heart, ShoppingCart, Check,
  AlertCircle, Clock, Sparkles, Search, SlidersHorizontal,
  X, ChevronDown, CheckCircle2, Flame, ThermometerSun, Fish,
  PawPrint, Helicopter, Waves, Snowflake,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

/* ─── Types ─── */

interface Tour {
  id: number;
  title: string;
  description: string;
  short_description: string | null;
  base_price: number;
  price_old: number | null;
  price_unit: string | null;
  activity_type: string;
  location_type: string;
  location_name: string | null;
  tour_image: string | null;
  operator_name: string;
  operator_id: string;
  bookings_count: number;
  duration_hours: number | null;
  duration_type: string | null;
  multi_day_count: number | null;
  difficulty: string | null;
  included: string[] | null;
  season_start: string | null;
  season_end: string | null;
}

/* ─── Constants ─── */

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

const PRICE_UNIT_SHORT: Record<string, string> = {
  per_person: '/ чел.',
  per_tour: '/ группа',
  per_day_per_person: '/ чел. / день',
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
  { value: '',           label: 'Все' },
  { value: 'fishing',    label: 'Рыбалка' },
  { value: 'trekking',   label: 'Треккинг' },
  { value: 'rafting',    label: 'Сплав' },
  { value: 'thermal',    label: 'Термальные' },
  { value: 'helicopter', label: 'Вертолёт' },
  { value: 'boat_trip',  label: 'Морской тур' },
  { value: 'bears',      label: 'Медведи' },
  { value: 'snowmobile', label: 'Снегоход' },
];

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Рекомендуемые' },
  { value: 'price_asc',   label: 'Цена: дешевле' },
  { value: 'price_desc',  label: 'Цена: дороже' },
  { value: 'recent',      label: 'Новые' },
];

const PRICE_RANGES = [
  { value: '',              label: 'Любая цена',         min: undefined, max: undefined },
  { value: '0-25000',       label: 'до 25 000 ₽',        min: 0,         max: 25000 },
  { value: '25000-60000',   label: '25 000 — 60 000 ₽',  min: 25000,     max: 60000 },
  { value: '60000-150000',  label: '60 000 — 150 000 ₽', min: 60000,     max: 150000 },
  { value: '150000',        label: 'от 150 000 ₽',       min: 150000,    max: undefined },
];

const DIFFICULTY_OPTIONS = [
  { value: '',       label: 'Любая' },
  { value: 'easy',   label: 'Лёгкая' },
  { value: 'medium', label: 'Средняя' },
  { value: 'hard',   label: 'Сложная' },
];

const DURATION_OPTIONS = [
  { value: '',          label: 'Любая' },
  { value: 'day',       label: '1 день' },
  { value: 'multi_day', label: 'Многодневный' },
];

const DIFFICULTY_BADGE: Record<string, { label: string; cls: string }> = {
  easy:   { label: 'Лёгкий',  cls: 'bg-[var(--success)]/20 text-[var(--success)]' },
  medium: { label: 'Средний', cls: 'bg-[var(--warning)]/20 text-[var(--warning)]' },
  hard:   { label: 'Сложный', cls: 'bg-[var(--danger)]/20 text-[var(--danger)]' },
};

/* ─── Helpers ─── */

function formatDuration(tour: Tour): string | null {
  if (tour.duration_type === 'multi_day' && tour.multi_day_count) {
    const d = tour.multi_day_count;
    return `${d} ${d === 1 ? 'день' : d < 5 ? 'дня' : 'дней'}`;
  }
  if (tour.duration_type === 'half_day') return 'Полдня';
  if (tour.duration_type === 'day') return '1 день';
  if (tour.duration_hours) {
    const h = Number(tour.duration_hours);
    if (h < 24) return `${h} ч`;
    const d = Math.round(h / 24);
    return `${d} ${d === 1 ? 'день' : d < 5 ? 'дня' : 'дней'}`;
  }
  return null;
}

function isInSeason(tour: Tour): boolean {
  if (!tour.season_start || !tour.season_end) return false;
  const now = new Date();
  return now >= new Date(tour.season_start) && now <= new Date(tour.season_end);
}

/* ─── Skeleton ─── */

function TourCardSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
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

/* ─── Tour Card (Premium) ─── */

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
  const diffBadge = tour.difficulty ? DIFFICULTY_BADGE[tour.difficulty] : null;
  const duration = formatDuration(tour);
  const inSeason = isInSeason(tour);
  const priceOld = tour.price_old ? Number(tour.price_old) : null;
  const basePrice = Number(tour.base_price);

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
        price: basePrice,
        activityType: tour.activity_type,
        image: tour.tour_image,
      });
    }
  };

  return (
    <div className="group bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden flex flex-col hover:border-[var(--accent)]/50 hover:shadow-xl hover:shadow-[var(--accent)]/10 transition-all duration-300 relative">
      {/* Image */}
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

          {/* Badges top-left */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-[var(--bg-card)]/90 text-[var(--text-primary)] px-2 py-0.5 rounded-full">
              {activityLabel}
            </span>
            {diffBadge && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${diffBadge.cls}`}>
                {diffBadge.label}
              </span>
            )}
          </div>

          {/* Season indicator */}
          {inSeason && (
            <span
              className="absolute top-3.5 right-14 w-2.5 h-2.5 rounded-full bg-[var(--success)] border-2 border-black/30"
              title="Сейчас сезон"
            />
          )}

          {/* Price overlay */}
          <div className="absolute bottom-3 left-3 flex items-baseline gap-2">
            {priceOld && priceOld > basePrice && (
              <span className="text-xs text-[#fff]/50 line-through">
                {priceOld.toLocaleString('ru-RU')} ₽
              </span>
            )}
            <span>
              <span className="text-xs text-[#fff]/70">от </span>
              <span className="font-bold text-[#fff] text-base">
                {basePrice.toLocaleString('ru-RU')} ₽
              </span>
              {tour.price_unit && (
                <span className="text-[10px] text-[#fff]/50 ml-1">
                  {PRICE_UNIT_SHORT[tour.price_unit] ?? ''}
                </span>
              )}
            </span>
          </div>
        </div>
      </Link>

      {/* Favorite */}
      <button
        onClick={() => onToggleLike(tour.id)}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-[var(--bg-card)]/80 flex items-center justify-center transition-colors hover:bg-[var(--bg-card)]"
        aria-label={isLiked ? 'Убрать из избранного' : 'В избранное'}
      >
        <Heart
          className={`w-4 h-4 transition-colors ${isLiked ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
        />
      </button>

      {/* Content */}
      <Link href={`/marketplace/tours/${tour.id}`} className="p-5 pb-3 flex flex-col flex-1">
        <p className="text-[11px] text-[var(--text-muted)] mb-1">{tour.operator_name}</p>
        <h3
          className="font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 mb-1 group-hover:text-[var(--accent)] transition-colors"
          style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem' }}
        >
          {tour.title}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3 flex-1">
          {tour.short_description ?? tour.description}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {tour.location_name ?? locationLabel}
          </span>
          {duration && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {duration}
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

      {/* Included preview */}
      {tour.included && tour.included.length > 0 && (
        <div className="mx-5 mb-3 p-2.5 bg-[var(--bg-hover)] rounded-lg">
          <div className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-[var(--success)] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
              {tour.included.slice(0, 2).join(' \u00B7 ')}
              {tour.included.length > 2 && (
                <span className="text-[var(--text-muted)]"> +{tour.included.length - 2}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Action bar */}
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

/* ─── Marketplace Client ─── */

export default function MarketplaceClient() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters
  const [activityFilter, setActivityFilter] = useState('');
  const [sort, setSort] = useState('recommended');
  const [difficulty, setDifficulty] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [durationType, setDurationType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Wishlist
  const [likedMap, setLikedMap] = useState<Map<number, string>>(new Map());

  const activeFiltersCount = [difficulty, priceRange, durationType].filter(Boolean).length;

  const getPriceParams = useCallback(() => {
    const range = PRICE_RANGES.find(r => r.value === priceRange);
    return { price_min: range?.min, price_max: range?.max };
  }, [priceRange]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm]);

  // Load wishlist
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

  // Fetch tours
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (activityFilter) params.append('activity_type', activityFilter);
    if (sort && sort !== 'recommended') params.append('sort', sort);
    if (difficulty) params.append('difficulty', difficulty);
    if (durationType) params.append('duration_type', durationType);
    const { price_min, price_max } = getPriceParams();
    if (price_min != null) params.append('price_min', String(price_min));
    if (price_max != null) params.append('price_max', String(price_max));

    setLoading(true);
    setError('');
    fetch(`/api/hub/marketplace/tours?${params}`)
      .then(r => {
        if (!r.ok) throw new Error('Ошибка загрузки');
        return r.json();
      })
      .then(data => {
        if (data?.tours) setTours(data.tours);
        if (data?.total != null) setTotal(data.total);
      })
      .catch(() => setError('Не удалось загрузить туры. Попробуйте обновить страницу.'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, activityFilter, sort, difficulty, priceRange, durationType, getPriceParams]);

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

  const resetFilters = () => {
    setDifficulty('');
    setPriceRange('');
    setDurationType('');
  };

  return (
    <div className="ds-page pb-20">
      {/* Header */}
      <div className="mb-8">
        <h1 className="ds-h1 mb-1">Туры Камчатки</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Реальные предложения операторов. Выберите направление — и увидите, куда поедете.
        </p>

        {/* ─── Visual Category Grid ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { key: 'trekking',   label: 'Вулканы',   img: '/images/activities/volcanoes.jpg',  icon: Flame },
            { key: 'thermal',    label: 'Термальные', img: '/images/activities/hotsprings.jpg', icon: ThermometerSun },
            { key: 'fishing',    label: 'Рыбалка',   img: '/images/activities/fishing.jpg',    icon: Fish },
            { key: 'bears',      label: 'Медведи',   img: '/images/categories/medvedi.jpg',    icon: PawPrint },
            { key: 'helicopter', label: 'Вертолёт',  img: '/images/activities/helicopter.jpg', icon: Helicopter },
            { key: 'boat_trip',  label: 'Море',      img: '/images/activities/sea.jpg',        icon: Waves },
            { key: 'rafting',    label: 'Сплав',     img: '/images/activities/rafting.jpg',    icon: Waves },
            { key: 'snowmobile', label: 'Снегоход',  img: '/images/activities/snowmobile.jpg', icon: Snowflake },
          ].map(cat => (
            <button
              key={cat.key}
              onClick={() => setActivityFilter(activityFilter === cat.key ? '' : cat.key)}
              className={`group relative h-28 sm:h-32 rounded-xl overflow-hidden transition-all duration-300 ${
                activityFilter === cat.key
                  ? 'ring-2 ring-[var(--accent)] scale-[1.03]'
                  : 'hover:scale-[1.02]'
              }`}
            >
              <Image
                src={cat.img}
                alt={cat.label}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
                <cat.icon className="w-6 h-6 mb-0.5 text-white drop-shadow-lg" />
                <span className="text-white text-sm font-semibold drop-shadow-lg">{cat.label}</span>
              </div>
              {activityFilter === cat.key && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* AI banner */}
        <Link
          href="/planner"
          className="flex items-center gap-3 p-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Не знаете что выбрать?</p>
            <p className="text-xs text-[var(--text-muted)]">Кузьмич поможет понять, что вам реально подходит по датам, бюджету и нагрузке</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--accent)] shrink-0" />
        </Link>
      </div>

      {/* ─── Tier 1: Search + Sort + Filters Toggle ─── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="ds-input w-full pl-9 pr-9"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="ds-input w-auto pr-8 text-sm"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`relative ds-btn ds-btn-secondary flex items-center gap-2 text-sm ${
            showFilters ? 'border-[var(--accent)] text-[var(--accent)]' : ''
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Фильтры</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--accent)] text-[#0D1117] text-[10px] flex items-center justify-center font-bold">
              {activeFiltersCount}
            </span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ─── Tier 2: Activity Chips ─── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {ACTIVITY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setActivityFilter(opt.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
              activityFilter === opt.value
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--text-primary)] bg-[var(--bg-card)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ─── Tier 3: Expandable Filter Panel ─── */}
      {showFilters && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Price */}
            <div>
              <p className="ds-label mb-2">Цена</p>
              <div className="flex flex-wrap gap-2">
                {PRICE_RANGES.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPriceRange(priceRange === opt.value ? '' : opt.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                      priceRange === opt.value
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 bg-[var(--bg-card)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <p className="ds-label mb-2">Сложность</p>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDifficulty(difficulty === opt.value ? '' : opt.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                      difficulty === opt.value
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 bg-[var(--bg-card)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <p className="ds-label mb-2">Длительность</p>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDurationType(durationType === opt.value ? '' : opt.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                      durationType === opt.value
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 bg-[var(--bg-card)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reset */}
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="mt-3 ds-btn ds-btn-secondary text-xs"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      {!loading && !error && (
        <p className="text-sm text-[var(--text-muted)] mb-6">
          {total > 0
            ? `${total} ${total === 1 ? 'тур' : total < 5 ? 'тура' : 'туров'}`
            : null}
        </p>
      )}

      {/* Grid */}
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
          <p className="text-sm text-[var(--text-muted)] mb-4">Попробуйте изменить фильтры или сначала пройти подбор через Кузьмича</p>
          {(activeFiltersCount > 0 || activityFilter || searchTerm) && (
            <button
              onClick={() => { resetFilters(); setActivityFilter(''); setSearchTerm(''); }}
              className="ds-btn ds-btn-secondary text-sm"
            >
              Сбросить все фильтры
            </button>
          )}
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
