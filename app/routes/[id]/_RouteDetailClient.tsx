'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, MapPin, Clock, Calendar, Mountain,
  AlertTriangle, Users, Send,
  Star, CheckCircle, Phone, ChevronLeft, ChevronRight,
  TrendingUp, Thermometer, MessageSquare,
  Fish, Plane, PawPrint, Anchor, Snowflake, Car,
  Download, Navigation, ShieldAlert, ExternalLink,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import LeadModal from '@/components/routes/LeadModal';
import TourPaymentModal from '@/components/booking/TourPaymentModal';
import AvailabilityCalendar from '@/components/routes/AvailabilityCalendar';
import RouteCard, { type RouteItem } from '@/components/routes/RouteCard';
import { useSourceTracker } from '@/hooks/useSourceTracker';
import { AssistantButton } from '@/components/shared/AssistantButton';
import { MarkerType } from '@/components/shared/LeafletMap';
import DescriptionWithFishLinks from '@/components/shared/DescriptionWithFishLinks';

import SafetyWarnings from '@/components/safety/SafetyWarnings';
import { RouteGradientPlaceholder } from '@/components/routes/RouteGradientPlaceholder';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

const LOCATION_TYPE_LABELS: Record<string, string> = {
  volcano: 'Вулкан', geyser: 'Гейзерное поле', hot_spring: 'Термальный источник',
  lake: 'Озеро', mountain: 'Горный массив', river: 'Река', bay: 'Бухта',
  cape: 'Мыс', island: 'Остров', glacier: 'Ледник', forest: 'Лес и природный парк',
  beach: 'Пляж', waterfall: 'Водопад', rock: 'Скала',
  viewpoint: 'Смотровая площадка', settlement: 'Населённый пункт',
  museum: 'Музей', historical: 'Историческое место', other: 'Маршрут',
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  trekking: 'Треккинг', fishing: 'Рыбалка', bear_watching: 'Наблюдение за медведями',
  helicopter: 'Вертолётный тур', thermal: 'Термальные источники',
  boat_trip: 'Морская прогулка', snowmobile: 'Снегоход', jeep: 'Джип-тур',
  eco: 'Экотуризм', diving: 'Дайвинг', surf: 'Сёрфинг', ski: 'Фрирайд',
  cultural: 'Культура', photo: 'Фототур', camping: 'Кемпинг',
  sightseeing: 'Осмотр', other: 'Активный отдых',
};

const LOCATION_TYPE_IMAGES: Record<string, string> = {
  volcano:    '/images/partners/kamchatintour/avacha-winter.jpg',
  geyser:     '/images/partners/kamchatintour/seo4.jpg',
  hot_spring: '/images/partners/kamchatintour/laguna-winter.jpg',
  bay:        '/images/partners/kamchatintour/seo5.jpg',
  snowmobile: '/images/partners/kamchatintour/snowmobile.jpg',
  helicopter: '/images/partners/kamchatintour/helicopter.jpg',
  mountain:   '/images/partners/kamchatintour/winter-adventures.jpg',
  forest:     '/images/partners/kamchatintour/seo1.jpg',
  beach:      '/images/bento/khalaktyr.jpg',
  lake:       '/images/gallery/bay-sunset.jpg',
  river:      '/images/activities/fishing.jpg',
  viewpoint:  '/images/partners/kamchatintour/seo3.jpg',
  museum:     '/images/partners/kamchatintour/about1.jpg',
  historical: '/images/gallery/stela.jpg',
  other:      '/images/hero/hero-dark.jpg',
};

const ACTIVITY_COLORS: Record<string, string> = {
  fishing: 'var(--ocean)', trekking: 'var(--success)', thermal: 'var(--warning)',
  helicopter: 'var(--accent)', bear_watching: 'var(--danger)', boat_trip: 'var(--ocean)',
  snowmobile: 'var(--ocean)', jeep: 'var(--accent)', other: 'var(--text-muted)',
};

const DIFFICULTY_RU: Record<string, string> = {
  easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный',
  легкий: 'Лёгкий', средний: 'Средний', сложный: 'Сложный',
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'var(--success)', medium: 'var(--warning)', hard: 'var(--danger)',
  легкий: 'var(--success)', средний: 'var(--warning)', сложный: 'var(--danger)',
};

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

function formatDuration(hours: number, durationType?: string | null, multiDay?: number | null): string {
  if (durationType === 'multi_day' && multiDay) {
    if (multiDay === 1) return '1 день';
    if (multiDay >= 2 && multiDay <= 4) return `${multiDay} дня`;
    return `${multiDay} дней`;
  }
  const days = Math.round(hours / 24);
  if (days <= 0) return `${hours} ч`;
  if (days === 1) return '1 день';
  if (days < 5) return `${days} дня`;
  return `${days} дней`;
}

function formatSeasonDates(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const fmt = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  return `${fmt(start)} — ${fmt(end)}`;
}

function priceUnitLabel(unit: string | null): string {
  switch (unit) {
    case 'per_day_per_person': return '/ сут / чел';
    case 'per_person': return '/ чел';
    case 'per_day': return '/ сут';
    default: return '';
  }
}

interface Offer {
  tourId: number; tourName: string; shortDesc: string | null;
  priceBase: number | null; priceOld: number | null; priceUnit: string | null;
  effectivePrice: number | null;
  durationHours: number | null; durationType: string | null; multiDayCount: number | null;
  difficulty: string | null;
  maxGroupSize: number | null; minGroupSize: number | null;
  rating: number | null; reviewCount: number | null;
  included: string[];
  seasonStart: string | null; seasonEnd: string | null;
  operator: { id: string; name: string; slug: string | null; rating: number | null; reviewCount: number | null; verified: boolean; };
  tourImage: string | null; operatorHeroImage: string | null;
  nextDeparture: string | null; nextSlots: number | null;
}

interface RouteDetail {
  id: string; category: string; locationType: string | null; activityType: string | null;
  title: string; description: string;
  lat: number | null; lng: number | null;
  sourceUrl: string | null; sourceName: string | null;
  priceFrom: number | null; season: string | null; difficulty: string | null;
  durationDays: number | null; bestMonths: number[] | null;
  altitude: number | null; groupSizeMax: number | null; dangerLevel: string | null;
  equipment: string[] | null; kuzmichReview: string | null;
  photos: string[] | null; offers: Offer[];
  hasAiImage: boolean;
  mchsRequired: boolean;
  mchsPhone: string | null;
  parkName: string | null;
  parkApprovalUrl: string | null;
  hazards: string[] | null;
  distanceKm: number | null;
  elevationGainM: number | null;
  durationHours: number | null;
}

// ── Карточка оффера ───────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  fishing: Fish, trekking: Mountain, thermal: Thermometer,
  helicopter: Plane, bear_watching: PawPrint, boat_trip: Anchor,
  snowmobile: Snowflake, jeep: Car, other: MapPin,
};

function OfferCard({ offer, activityType, onBook }: {
  offer: Offer; activityType: string | null; onBook: () => void;
}) {
  const price = offer.effectivePrice ?? offer.priceBase;
  const nextDate = offer.nextDeparture
    ? new Date(offer.nextDeparture).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    : null;
  const accentColor = ACTIVITY_COLORS[activityType ?? 'other'] ?? 'var(--accent)';
  const duration = offer.durationHours
    ? formatDuration(offer.durationHours, offer.durationType, offer.multiDayCount)
    : null;
  const isLowSlots = offer.nextSlots != null && offer.nextSlots > 0 && offer.nextSlots <= 3;
  const cardImage = offer.tourImage || offer.operatorHeroImage;
  const ActivityIcon = ACTIVITY_ICONS[activityType ?? 'other'] ?? MapPin;
  const seasonStr = formatSeasonDates(offer.seasonStart, offer.seasonEnd);

  return (
    <div
      className="ds-card overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group flex flex-col md:flex-row md:gap-4"
      onClick={onBook}
    >
      {/* Фото — полная ширина на мобильном, сбоку на десктопном */}
      <div className="relative w-full md:w-40 md:flex-shrink-0 h-48 md:h-auto overflow-hidden">
        {cardImage ? (
          <Image
            src={cardImage}
            alt={offer.tourName}
            fill
            className="object-contain group-hover:scale-110 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 160px"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: `color-mix(in srgb, ${accentColor} 12%, var(--bg-hover))` }}
          >
            <ActivityIcon className="w-12 h-12 opacity-40" style={{ color: accentColor }} />
          </div>
        )}
        {/* Badge типа / сложность */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {offer.durationType && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] px-2 py-0.5 rounded">
              {offer.durationType === 'multi_day' ? `${offer.multiDayCount ?? ''}д` : '1д'}
            </span>
          )}
          {offer.difficulty && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{
                color: DIFFICULTY_COLOR[offer.difficulty],
                background: `color-mix(in srgb, ${DIFFICULTY_COLOR[offer.difficulty]} 20%, transparent)`,
                border: `1px solid color-mix(in srgb, ${DIFFICULTY_COLOR[offer.difficulty]} 40%, transparent)`,
              }}
            >
              {DIFFICULTY_RU[offer.difficulty]}
            </span>
          )}
        </div>
      </div>

      {/* Контент */}
      <div className="flex-1 p-4 md:p-0 md:py-1 flex flex-col justify-between gap-3">
        {/* Оператор + рейтинг */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-[var(--text-muted)]">{offer.operator.name}</span>
            {offer.operator.verified && <CheckCircle className="w-3.5 h-3.5 text-[var(--success)] flex-shrink-0" />}
          </div>
          {offer.operator.rating != null && offer.operator.rating > 0 && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Star className="w-3.5 h-3.5 fill-[var(--warning)] text-[var(--warning)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">{offer.operator.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Название + описание */}
        <div>
          <p className="text-base font-bold text-[var(--text-primary)] leading-snug">
            {offer.tourName}
          </p>
          {offer.shortDesc && (
            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">
              {offer.shortDesc}
            </p>
          )}
        </div>

        {/* Мета-информация в одну строку или сетку */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
          {duration && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" style={{ color: accentColor }} />
              {duration}
            </span>
          )}
          {(offer.minGroupSize || offer.maxGroupSize) && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" style={{ color: accentColor }} />
              {offer.minGroupSize && offer.maxGroupSize
                ? `${offer.minGroupSize}–${offer.maxGroupSize}`
                : `до ${offer.maxGroupSize}`}
            </span>
          )}
          {seasonStr && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span className="hidden sm:inline">{seasonStr}</span>
            </span>
          )}
        </div>

        {/* Включено в стоимость */}
        {offer.included.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {offer.included.slice(0, 3).map((item, i) => (
              <span key={i} className="text-[10px] bg-[var(--bg-hover)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded">
                {String(item)}
              </span>
            ))}
            {offer.included.length > 3 && (
              <span className="text-[10px] text-[var(--text-muted)] self-center">
                +{offer.included.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Цена + кнопка */}
        <div className="flex items-end justify-between gap-3 mt-auto pt-2 border-t border-[var(--border)]">
          <div>
            {price != null && price > 0 ? (
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-lg text-[var(--text-primary)]">
                  {price.toLocaleString('ru-RU')} ₽
                </span>
                {offer.priceUnit && (
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {priceUnitLabel(offer.priceUnit)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-[var(--text-muted)] font-medium">По запросу</span>
            )}
            {offer.priceOld != null && price != null && offer.priceOld > price && (
              <p className="text-xs line-through text-[var(--text-muted)]">
                было {offer.priceOld.toLocaleString('ru-RU')} ₽
              </p>
            )}
            {nextDate && (
              <p className={`text-[11px] mt-1 font-medium ${isLowSlots ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
                {isLowSlots
                  ? <AlertTriangle className="w-3 h-3 inline mr-0.5" />
                  : <CheckCircle className="w-3 h-3 inline mr-0.5" />
                }{isLowSlots ? `${offer.nextSlots} мест · ` : ''}{nextDate}
              </p>
            )}
          </div>
          <button
            type="button"
            className="ds-btn ds-btn-primary px-4 py-2 text-sm font-semibold flex-shrink-0 whitespace-nowrap"
            onClick={e => { e.stopPropagation(); onBook(); }}
          >
            Забронировать
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RouteDetailClient({ id }: { id: string }) {
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showLead, setShowLead] = useState(false);
  const [bookingOffer, setBookingOffer] = useState<Offer | null>(null);
  const [relatedRoutes, setRelatedRoutes] = useState<RouteItem[]>([]);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'date' | 'slots'>('price');
  const [calendarDate, setCalendarDate] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);
  const [filterDurationType, setFilterDurationType] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  useSourceTracker();

  const CACHE_KEY = `route_cache_${id}`;
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа

  useEffect(() => {
    fetch(`/api/routes/${id}`)
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setRoute(j.data);
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: j.data, ts: Date.now() })); } catch { /* игнорируем */ }
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        // Сеть недоступна — пробуем кеш
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) {
            const { data, ts } = JSON.parse(raw) as { data: RouteDetail; ts: number };
            if (Date.now() - ts < CACHE_TTL) { setRoute(data); setFromCache(true); return; }
          }
        } catch { /* игнорируем */ }
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!route) return;
    fetch(`/api/routes?activity_type=${route.activityType ?? ''}&limit=5&sort=recommended`)
      .then(r => r.json())
      .then(j => {
        if (j.success) setRelatedRoutes((j.data as RouteItem[]).filter(r => r.id !== id).slice(0, 4));
      })
      .catch(() => {});
  }, [route, id]);

  // Must be before early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (!route || (route.photos?.length ?? 0) > 0 || route.hasAiImage) return;
    fetch(`/api/images/route/${route.id}`).catch(() => undefined);
  }, [route?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <>
        <Header />
        <div className="ds-page pt-20 pb-10 space-y-3">
          <div className="ds-skeleton rounded h-56 w-full" />
          <div className="ds-skeleton rounded h-6 w-2/3" />
          <div className="ds-skeleton rounded h-4 w-1/2" />
        </div>
      </>
    );
  }

  if (notFound || !route) {
    return (
      <>
        <Header />
        <div className="ds-page pt-32 text-center space-y-4">
          <p className="text-[var(--text-secondary)]">Маршрут не найден</p>
          <Link href="/routes" className="ds-btn ds-btn-secondary">Назад к каталогу</Link>
        </div>
      </>
    );
  }

  const hasGeo = route.lat != null && route.lng != null;
  const locLabel = LOCATION_TYPE_LABELS[route.locationType ?? 'other'] ?? 'Маршрут';
  const actLabel = ACTIVITY_TYPE_LABELS[route.activityType ?? 'other'] ?? 'Активный отдых';

  // Фильтрация и сортировка туров
  const allOffers = route.offers ?? [];
  const filteredOffers = allOffers
    .filter(o => {
      const price = o.effectivePrice ?? o.priceBase ?? 0;
      if (price < priceRange[0] || price > priceRange[1]) return false;
      if (filterDifficulty && o.difficulty !== filterDifficulty) return false;
      if (filterDurationType && o.durationType !== filterDurationType) return false;
      return true;
    })
    .sort((a, b) => {
      const priceA = a.effectivePrice ?? a.priceBase ?? 0;
      const priceB = b.effectivePrice ?? b.priceBase ?? 0;
      const ratingA = a.rating ?? 0;
      const ratingB = b.rating ?? 0;
      const dateA = a.nextDeparture ? new Date(a.nextDeparture).getTime() : Infinity;
      const dateB = b.nextDeparture ? new Date(b.nextDeparture).getTime() : Infinity;

      switch (sortBy) {
        case 'price': return priceA - priceB;
        case 'rating': return ratingB - ratingA;
        case 'date': return dateA - dateB;
        case 'slots': return (b.nextSlots ?? 0) - (a.nextSlots ?? 0);
        default: return 0;
      }
    });

  const offers = filteredOffers;
  const maxPrice = allOffers.length > 0
    ? Math.max(...allOffers.map(o => o.effectivePrice ?? o.priceBase ?? 0).filter(p => p > 0))
    : 500000;
  const photos = [...new Set(route.photos ?? [])];
  const aiImageUrl = `/api/images/route/${route.id}`;
  const heroImage = photos[galleryIdx] ?? photos[0] ?? (route.hasAiImage ? aiImageUrl : null);
  const isAiHero = !photos.length && route.hasAiImage;
  const useGradient = !photos.length && !route.hasAiImage;

  const minPrice = allOffers.length > 0
    ? Math.min(...allOffers.map(o => o.effectivePrice ?? o.priceBase ?? 0).filter(p => p > 0))
    : (route.priceFrom ?? 0);
  const uniqueOperators = new Set(allOffers.map(o => o.operator.id)).size;
  const descParagraphs = route.description?.split('\n').filter(p => p.trim()) ?? [];
  const isLongDesc = descParagraphs.length > 3;

  return (
    <>
      <Header />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ height: '52vh', minHeight: 320, maxHeight: 520 }}>
        <div className="absolute inset-0 pt-16">
          {useGradient ? (
            <RouteGradientPlaceholder
              title={route.title}
              activityType={route.activityType}
              locationType={route.locationType}
              className="w-full h-full"
              showLabel={false}
            />
          ) : (
            <Image src={heroImage!} alt={route.title} fill className="object-contain" priority sizes="100vw" />
          )}
          {isAiHero && (
            <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
              <span>AI</span><span className="opacity-70">· временное фото</span>
            </div>
          )}
        </div>

        {/* Навигация */}
        <div className="absolute top-20 left-0 right-0 px-4 md:px-8 flex items-center justify-between">
          <Link
            href="/routes"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-primary)] hover:text-[var(--accent)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] px-3 py-1.5 rounded-lg transition-all border border-[var(--border)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Маршруты
          </Link>

          {/* Счётчик фото */}
          {photos.length > 1 && (
            <div className="flex items-center gap-2 bg-[var(--bg-card)] rounded-lg px-3 py-1.5 border border-[var(--border)]">
              <button type="button" onClick={() => setGalleryIdx(i => Math.max(0, i - 1))}
                className="w-6 h-6 flex items-center justify-center hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[var(--text-secondary)] text-xs">{galleryIdx + 1}/{photos.length}</span>
              <button type="button" onClick={() => setGalleryIdx(i => Math.min(photos.length - 1, i + 1))}
                className="w-6 h-6 flex items-center justify-center hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── МЕТА-ИНФОРМАЦИЯ (переместили из hero) ─────────────────────────── */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-16 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest">
              {locLabel}
            </span>
            <span className="text-[var(--text-muted)] text-xs">·</span>
            <span className="text-xs text-[var(--text-secondary)]">{actLabel}</span>
            {fromCache && (
              <span className="text-xs text-[var(--text-muted)] border border-[var(--border)] rounded px-1.5 py-0.5">
                из кеша
              </span>
            )}
          </div>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] leading-tight max-w-4xl"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            {route.title}
          </h1>
        </div>
      </div>

      {/* ── БЫСТРЫЕ ФАКТЫ ────────────────────────────────────────────────────── */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-16 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 overflow-x-auto">
          <div className="flex items-stretch gap-0 divide-x divide-[var(--border)]">
            {minPrice > 0 && (
              <div className="flex-shrink-0 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Цена</p>
                <p className="text-sm font-bold text-[var(--accent)]">от {minPrice.toLocaleString('ru-RU')} ₽</p>
              </div>
            )}
            {route.durationDays != null && (
              <div className="flex-shrink-0 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Длительность</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{formatDuration(0, 'multi_day', route.durationDays)}</p>
              </div>
            )}
            {route.difficulty && (
              <div className="flex-shrink-0 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Сложность</p>
                <p className="text-sm font-semibold" style={{ color: DIFFICULTY_COLOR[route.difficulty] ?? 'var(--text-primary)' }}>
                  {DIFFICULTY_RU[route.difficulty] ?? route.difficulty}
                </p>
              </div>
            )}
            {route.altitude != null && route.altitude > 0 && (
              <div className="flex-shrink-0 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Высота</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{route.altitude.toLocaleString('ru-RU')} м</p>
              </div>
            )}
            {route.groupSizeMax != null && (
              <div className="flex-shrink-0 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Группа</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">до {route.groupSizeMax} чел.</p>
              </div>
            )}
            {route.season && (
              <div className="flex-shrink-0 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Сезон</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{route.season}</p>
              </div>
            )}
            {offers.length > 0 && (
              <div className="flex-shrink-0 px-4 py-3 ml-auto">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Туров</p>
                <p className="text-sm font-semibold text-[var(--success)]">
                  {offers.length} {uniqueOperators > 1 ? `· ${uniqueOperators} операторов` : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ОСНОВНОЙ КОНТЕНТ ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-24">
        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">

          {/* ── Левая колонка ───────────────────────────────────────────────── */}
          <div className="space-y-8">

            {/* Описание */}
            {descParagraphs.length > 0 && (
              <section>
                <DescriptionWithFishLinks
                  paragraphs={descParagraphs}
                  className={`text-[var(--text-secondary)] leading-relaxed space-y-3 text-sm md:text-base overflow-hidden transition-all duration-300 ${
                    isLongDesc && !descExpanded ? 'max-h-28' : 'max-h-none'
                  }`}
                  style={isLongDesc && !descExpanded ? { maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' } : undefined}
                />
                {isLongDesc && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded(v => !v)}
                    className="mt-2 text-sm text-[var(--ocean)] hover:text-[var(--accent)] transition-colors font-medium"
                  >
                    {descExpanded ? 'Свернуть' : 'Читать полностью'}
                  </button>
                )}
              </section>
            )}

            {/* Предупреждение */}
            {(route.dangerLevel === 'high' || route.dangerLevel === 'extreme') && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/25">
                <AlertTriangle className="w-4 h-4 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[var(--warning)]">
                  Маршрут повышенной сложности. Требует физической подготовки и опытного гида.
                </p>
              </div>
            )}

            {/* Фильтры и сортировка туров */}
            {allOffers.length > 1 && (
              <section className="space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {/* Сортировка */}
                  <label className="flex-shrink-0 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide pt-2">
                    Сортировка:
                  </label>
                  {(['price', 'rating', 'date', 'slots'] as const).map(option => (
                    <button
                      key={option}
                      onClick={() => setSortBy(option)}
                      className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        sortBy === option
                          ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                          : 'bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--border)]'
                      }`}
                    >
                      {option === 'price' && <><TrendingUp className="w-3 h-3 inline mr-1" />Цена</>}
                      {option === 'rating' && <><Star className="w-3 h-3 inline mr-1" />Рейтинг</>}
                      {option === 'date' && <><Calendar className="w-3 h-3 inline mr-1" />Дата</>}
                      {option === 'slots' && <><Users className="w-3 h-3 inline mr-1" />Места</>}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {/* Сложность */}
                  {['easy', 'medium', 'hard'].some(d => allOffers.some(o => o.difficulty === d)) && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                        Сложность
                      </p>
                      <div className="flex gap-1.5">
                        {(['easy', 'medium', 'hard'] as const).map(diff => {
                          const hasOption = allOffers.some(o => o.difficulty === diff);
                          if (!hasOption) return null;
                          return (
                            <button
                              key={diff}
                              onClick={() => setFilterDifficulty(filterDifficulty === diff ? null : diff)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                                filterDifficulty === diff
                                  ? `text-[var(--bg-primary)]`
                                  : 'bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--border)]'
                              }`}
                              style={{
                                background:
                                  filterDifficulty === diff
                                    ? DIFFICULTY_COLOR[diff as keyof typeof DIFFICULTY_COLOR]
                                    : undefined,
                              }}
                            >
                              {DIFFICULTY_RU[diff as keyof typeof DIFFICULTY_RU]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Тип тура */}
                  {['day', 'multi_day'].some(dt => allOffers.some(o => o.durationType === dt)) && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                        Тип
                      </p>
                      <div className="flex gap-1.5">
                        {(['day', 'multi_day'] as const).map(dt => {
                          const hasOption = allOffers.some(o => o.durationType === dt);
                          if (!hasOption) return null;
                          return (
                            <button
                              key={dt}
                              onClick={() => setFilterDurationType(filterDurationType === dt ? null : dt)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                                filterDurationType === dt
                                  ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                                  : 'bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--border)]'
                              }`}
                            >
                              {dt === 'day' ? 'Один день' : 'Многодневный'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Слайдер цены */}
                <div>
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                    Цена: {priceRange[0].toLocaleString('ru-RU')} — {priceRange[1].toLocaleString('ru-RU')} ₽
                  </p>
                  <input
                    type="range"
                    min={minPrice}
                    max={maxPrice}
                    value={priceRange[1]}
                    onChange={e => setPriceRange([priceRange[0], Math.max(priceRange[0], Number(e.target.value))])}
                    className="w-full"
                  />
                </div>

                {filteredOffers.length === 0 && allOffers.length > 0 && (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4">
                    Туры по вашим фильтрам не найдены
                  </p>
                )}
              </section>
            )}

            {/* Офферы — mobile */}
            {offers.length > 0 && (
              <section className="lg:hidden">
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">
                  {offers.length === 1 ? 'Доступный тур' : `${offers.length} туров на маршрут`}
                </h2>
                <div className="space-y-3">
                  {(showAllOffers ? offers : offers.slice(0, 3)).map(offer => (
                    <OfferCard key={offer.tourId} offer={offer} activityType={route.activityType} onBook={() => setBookingOffer(offer)} />
                  ))}
                </div>
                {offers.length > 3 && !showAllOffers && (
                  <button type="button" onClick={() => setShowAllOffers(true)}
                    className="mt-3 w-full py-2.5 text-sm text-[var(--ocean)] border border-[var(--border)] rounded-lg hover:border-[var(--ocean)] transition-colors">
                    Ещё {offers.length - 3} {offers.length - 3 < 5 ? 'тура' : 'туров'}
                  </button>
                )}
              </section>
            )}

            {/* Кузьмич */}
            {route.kuzmichReview && (
              <section className="ds-card p-5 border-l-[3px] border-[var(--accent)]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent)]/12 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide mb-2">
                      Кузьмич о маршруте
                    </p>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">
                      &ldquo;{route.kuzmichReview}&rdquo;
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Что входит */}
            {offers.length > 0 && (() => {
              const allIncluded = [...new Set(offers.flatMap(o => o.included))].filter(Boolean).slice(0, 10);
              if (!allIncluded.length) return null;
              return (
                <section>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3">Что входит в туры</h2>
                  <div className="flex flex-wrap gap-2">
                    {allIncluded.map((item, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-[var(--success)]/8 text-[var(--success)] border border-[var(--success)]/20 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3 flex-shrink-0" />
                        {item}
                      </span>
                    ))}
                  </div>
                </section>
              );
            })()}

            {/* Лучшие месяцы */}
            {route.bestMonths && route.bestMonths.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" /> Лучшие месяцы
                </h2>
                <div className="flex gap-1.5 flex-wrap">
                  {MONTHS.map((m, i) => (
                    <span key={i} className={`text-xs px-2.5 py-2 rounded-lg font-medium min-w-[3rem] text-center ${
                      route.bestMonths!.includes(i + 1)
                        ? 'bg-[var(--accent)] text-[var(--bg-primary)] font-semibold'
                        : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                    }`}>
                      {m}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Снаряжение */}
            {route.equipment && route.equipment.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3">Снаряжение</h2>
                <div className="flex flex-wrap gap-1.5">
                  {route.equipment.map((eq, i) => (
                    <span key={i} className="text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] px-2.5 py-1.5 rounded-lg">
                      {eq}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Экспорт — скачать GPX / открыть в навигаторе */}
            {hasGeo && (
              <section>
                <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-[var(--accent)]" /> Навигация
                </h2>
                <div className="flex gap-2">
                  <a
                    href={`/api/routes/${route.id}/export?format=gpx`}
                    download
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-sm font-semibold hover:bg-[var(--accent)]/20 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Скачать GPX
                  </a>
                  <a
                    href={`omaps://map?ll=${route.lng},${route.lat}&z=12`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 text-sm font-semibold hover:bg-green-500/20 transition-colors"
                  >
                    <Navigation className="w-4 h-4" /> Organic Maps
                  </a>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-2">
                  Скачайте GPX файл и откройте его в Organic Maps / Maps.me / навигаторе
                </p>
              </section>
            )}

            {/* Карта — mobile */}
            {hasGeo && (
              <section className="lg:hidden">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" /> На карте
                </h2>
                <LeafletMap
                  center={[Number(route.lat), Number(route.lng)]}
                  zoom={10}
                  markers={[{ coords: [Number(route.lat), Number(route.lng)], title: route.title, description: locLabel, color: 'red', type: MarkerType.TOUR, category: route.locationType ?? 'other' }]}
                  height="240px"
                  className="w-full rounded-lg"
                />
              </section>
            )}

          </div>

          {/* ── Правый сайдбар — desktop ─────────────────────────────────────── */}
          <div className="hidden lg:block">
            <div className="sticky top-32 space-y-4">

              {offers.length > 0 ? (
                <>
                  <AvailabilityCalendar
                    offers={offers.map(o => ({
                      tourId: o.tourId,
                      tourName: o.tourName,
                      nextDeparture: o.nextDeparture,
                      nextSlots: o.nextSlots,
                    }))}
                    onDateSelect={(date, tourId) => {
                      setCalendarDate(date);
                      const offer = offers.find(o => o.tourId === tourId) ?? offers[0];
                      if (offer) setBookingOffer(offer);
                    }}
                  />

                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                      {offers.length === 1 ? 'Тур' : `${offers.length} туров`}
                      {uniqueOperators > 1 ? ` · ${uniqueOperators} оператора` : ''}
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {(showAllOffers ? offers : offers.slice(0, 3)).map(offer => (
                      <OfferCard key={offer.tourId} offer={offer} activityType={route.activityType} onBook={() => setBookingOffer(offer)} />
                    ))}
                  </div>

                  {offers.length > 3 && !showAllOffers && (
                    <button type="button" onClick={() => setShowAllOffers(true)}
                      className="w-full py-2.5 text-sm text-[var(--ocean)] border border-[var(--border)] rounded-lg hover:border-[var(--ocean)] transition-colors">
                      Ещё {offers.length - 3} туров
                    </button>
                  )}

                  <button type="button" onClick={() => setShowLead(true)}
                    className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors py-1">
                    Не нашли нужный вариант? Оставьте заявку →
                  </button>
                </>
              ) : (
                <div className="ds-card p-6 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto">
                    <Phone className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">Хотите на этот маршрут?</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                      Подберём оператора и дату под ваш запрос
                    </p>
                  </div>
                  <button type="button" onClick={() => setShowLead(true)}
                    className="ds-btn ds-btn-primary w-full flex items-center justify-center gap-1.5 text-sm">
                    <Send className="w-3.5 h-3.5" /> Оставить заявку
                  </button>
                </div>
              )}

              {/* Мессенджеры — спросить Кузьмича */}
              <div className="space-y-2">
                <p className="text-xs text-[var(--text-muted)] text-center">Или напишите AI-консьержу</p>
                <div className="flex gap-2">
                  <a
                    href={`https://t.me/KuzmichKam_bot?start=route_${route.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: '#2AABEE' }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Telegram
                  </a>
                  <a
                    href="https://max.ru/id4101147649_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: '#7C3AED' }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> MAX
                  </a>
                </div>
              </div>

              {/* Экспорт — скачать GPX / открыть в навигаторе */}
              {hasGeo && (
                <div>
                  <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Download className="w-3 h-3" /> Навигация
                  </h2>
                  <div className="flex gap-2">
                    <a
                      href={`/api/routes/${route.id}/export?format=gpx`}
                      download
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-semibold hover:bg-[var(--accent)]/20 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Скачать GPX
                    </a>
                    <a
                      href={`omaps://map?ll=${route.lng},${route.lat}&z=12`}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-500 text-xs font-semibold hover:bg-green-500/20 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Organic Maps
                    </a>
                  </div>
                </div>
              )}

              {/* Карта */}
              {hasGeo && (
                <div>
                  <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> На карте
                  </h2>
                  <LeafletMap
                    center={[Number(route.lat), Number(route.lng)]}
                    zoom={10}
                    markers={[{ coords: [Number(route.lat), Number(route.lng)], title: route.title, description: locLabel, color: 'red', type: MarkerType.TOUR, category: route.locationType ?? 'other' }]}
                    height="220px"
                    className="w-full rounded-lg"
                  />
                </div>
              )}

              {offers.length > 0 && offers[0].operator.slug && (
                <Link href={`/operators/${offers[0].operator.slug}`}
                  className="flex items-center justify-between text-xs text-[var(--ocean)] hover:underline py-1">
                  <span>Профиль оператора</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Регистрация МЧС ───────────────────────────────────────────────── */}
        {route.mchsRequired && (
          <div className="mt-10 pt-8 border-t border-[var(--border)]">
            <div className="rounded-xl border-2 overflow-hidden"
              style={{ borderColor: 'var(--danger)', background: 'var(--bg-card)' }}>
              <div className="flex items-center gap-3 px-5 py-4 border-b"
                style={{ borderColor: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 6%, transparent)' }}>
                <ShieldAlert className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--danger)' }} />
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Обязательная регистрация в МЧС</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Этот маршрут требует регистрации группы до выхода
                  </p>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                {route.parkName && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">Природный парк:</span> {route.parkName}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  {route.mchsPhone && (
                    <a href={`tel:${route.mchsPhone.replace(/\D/g, '')}`}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:shadow-sm"
                      style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
                      <Phone className="w-4 h-4" />
                      МЧС: {route.mchsPhone}
                    </a>
                  )}
                  <a href="https://forms.mchs.gov.ru/registration_tourist_groups/form"
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:shadow-sm text-white"
                    style={{ background: 'var(--danger)' }}>
                    <ShieldAlert className="w-4 h-4" />
                    Зарегистрировать группу онлайн
                  </a>
                  {route.parkApprovalUrl && (
                    <a href={route.parkApprovalUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:shadow-sm"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                      Согласование с парком
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Безопасность маршрута ─────────────────────────────────────────── */}
        <SafetyWarnings routeId={route.id} />

        {/* ── Офлайн-инструкции выживания ───────────────────────────────────── */}
        <div className="mt-10 pt-8 border-t border-[var(--border)]">
          <Link
            href="/safety/offline"
            className="flex items-center justify-between gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)' }}>
                <AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Инструкции выживания на Камчатке</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Медведь, вулкан, гипотермия, потерялся, сигнализация. Работает офлайн.
                </p>
              </div>
            </div>
            <span className="text-sm text-[var(--ocean)] flex-shrink-0">→</span>
          </Link>
        </div>

        {/* ── Похожие ───────────────────────────────────────────────────────── */}
        {relatedRoutes.length > 0 && (
          <div className="mt-16 pt-8 border-t border-[var(--border)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Похожие маршруты</h2>
              <Link href={`/routes?activity_type=${route.activityType ?? ''}`}
                className="text-sm text-[var(--ocean)] hover:underline">
                Все →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedRoutes.map(r => <RouteCard key={r.id} route={r} />)}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile sticky bar ────────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-card)] border-t border-[var(--border)] px-4 py-3 flex items-center gap-3 safe-area-pb">
        <div className="flex-1 min-w-0">
          {minPrice > 0 ? (
            <p className="text-lg font-bold text-[var(--accent)] leading-none">
              {minPrice.toLocaleString('ru-RU')} ₽
              <span className="text-xs font-normal text-[var(--text-muted)] ml-1">/чел</span>
            </p>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">По запросу</p>
          )}
          {offers.length > 1 && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{offers.length} тура</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => offers.length > 0 ? setBookingOffer(offers[0]) : setShowLead(true)}
          className="ds-btn ds-btn-primary px-6 py-2.5 text-sm font-semibold flex-shrink-0"
        >
          {offers.length > 0 ? 'Забронировать' : 'Оставить заявку'}
        </button>
      </div>

      <LeadModal open={showLead} onClose={() => setShowLead(false)} routeId={route.id} routeTitle={route.title} />
      {bookingOffer && (
        <TourPaymentModal
          open={bookingOffer !== null}
          onClose={() => { setBookingOffer(null); setCalendarDate(null); }}
          tourId={bookingOffer.tourId}
          tourName={bookingOffer.tourName}
          operatorName={bookingOffer.operator.name}
          priceBase={bookingOffer.priceBase}
          minGroupSize={bookingOffer.minGroupSize}
          maxGroupSize={bookingOffer.maxGroupSize}
          nextDeparture={calendarDate ?? bookingOffer.nextDeparture}
        />
      )}
      <AssistantButton pageContext={{ type: 'route', title: route.title, category: locLabel }} />
    </>
  );
}
