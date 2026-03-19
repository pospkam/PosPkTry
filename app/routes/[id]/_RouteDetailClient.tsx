'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, MapPin, Clock, Calendar, Mountain,
  ExternalLink, AlertTriangle, Users, Send,
  Star, CheckCircle, Phone, ChevronLeft, ChevronRight,
  TrendingUp, Layers, Thermometer,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import LeadModal from '@/components/routes/LeadModal';
import BookingModal from '@/components/routes/BookingModal';
import RouteCard, { type RouteItem } from '@/components/routes/RouteCard';
import { useSourceTracker } from '@/hooks/useSourceTracker';
import { AssistantButton } from '@/components/shared/AssistantButton';
import { MarkerType } from '@/components/shared/LeafletMap';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

const LOCATION_TYPE_LABELS: Record<string, string> = {
  volcano: 'Вулкан', geyser: 'Гейзерное поле', hot_spring: 'Термальный источник',
  lake: 'Озеро', mountain: 'Горный массив', river: 'Река', bay: 'Бухта',
  cape: 'Мыс', island: 'Остров', glacier: 'Ледник', forest: 'Лес',
  beach: 'Пляж', waterfall: 'Водопад', rock: 'Скала',
  viewpoint: 'Смотровая площадка', settlement: 'Населённый пункт', other: 'Маршрут',
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  trekking: 'Треккинг', fishing: 'Рыбалка', bear_watching: 'Медведи',
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
  other:      '/images/hero/hero-dark.jpg',
};

// Цвет акцента карточки по типу активности
const ACTIVITY_COLORS: Record<string, string> = {
  fishing:      'var(--ocean)',
  trekking:     'var(--success)',
  thermal:      'var(--warning)',
  helicopter:   'var(--accent)',
  bear_watching:'var(--danger)',
  boat_trip:    'var(--ocean)',
  snowmobile:   '#6366f1',
  jeep:         'var(--accent)',
  other:        'var(--text-muted)',
};

const DIFFICULTY_RU: Record<string, string> = {
  easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный',
  легкий: 'Лёгкий', средний: 'Средний', сложный: 'Сложный',
};

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

interface Offer {
  tourId: string;
  tourName: string;
  shortDesc: string | null;
  priceBase: number | null;
  effectivePrice: number | null;
  durationDays: number | null;
  difficulty: string | null;
  maxGroupSize: number | null;
  minGroupSize: number | null;
  rating: number | null;
  reviewCount: number | null;
  included: string[];
  season: string[];
  operator: {
    id: string;
    name: string;
    slug: string | null;
    rating: number | null;
    reviewCount: number | null;
    verified: boolean;
  };
  tourImage: string | null;
  operatorHeroImage: string | null;
  nextDeparture: string | null;
  nextSlots: number | null;
}

interface RouteDetail {
  id: string;
  category: string;
  locationType: string | null;
  activityType: string | null;
  title: string;
  description: string;
  lat: number | null;
  lng: number | null;
  sourceUrl: string | null;
  sourceName: string | null;
  priceFrom: number | null;
  season: string | null;
  difficulty: string | null;
  durationDays: number | null;
  bestMonths: number[] | null;
  altitude: number | null;
  groupSizeMax: number | null;
  dangerLevel: string | null;
  equipment: string[] | null;
  kuzmichReview: string | null;
  photos: string[] | null;
  offers: Offer[];
}

// ── Карточка оффера (sidebar) ─────────────────────────────────────────────────

// Градиентные фолбэки по типу активности
const ACTIVITY_GRADIENTS: Record<string, string> = {
  fishing:      'linear-gradient(135deg, #1a4a6b 0%, #0d2b40 100%)',
  trekking:     'linear-gradient(135deg, #1a4a2b 0%, #0d2b1a 100%)',
  thermal:      'linear-gradient(135deg, #6b2d1a 0%, #40180d 100%)',
  helicopter:   'linear-gradient(135deg, #6b1a1a 0%, #401010 100%)',
  bear_watching:'linear-gradient(135deg, #4a2d1a 0%, #2b180d 100%)',
  boat_trip:    'linear-gradient(135deg, #1a3a6b 0%, #0d1f40 100%)',
  snowmobile:   'linear-gradient(135deg, #2d1a6b 0%, #180d40 100%)',
  other:        'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
};

function OfferCard({ offer, activityType, onBook }: {
  offer: Offer;
  activityType: string | null;
  onBook: () => void;
}) {
  const price = offer.effectivePrice ?? offer.priceBase;
  const nextDate = offer.nextDeparture
    ? new Date(offer.nextDeparture).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    : null;
  const accentColor = ACTIVITY_COLORS[activityType ?? 'other'] ?? 'var(--accent)';
  const duration = offer.durationDays
    ? offer.durationDays < 1
      ? `${Math.round(offer.durationDays * 24)} ч`
      : `${offer.durationDays} ${offer.durationDays === 1 ? 'день' : offer.durationDays < 5 ? 'дня' : 'дней'}`
    : null;
  const initials = offer.operator.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const isLowSlots = offer.nextSlots != null && offer.nextSlots > 0 && offer.nextSlots <= 3;
  const cardImage = offer.tourImage || offer.operatorHeroImage;
  const fallbackGradient = ACTIVITY_GRADIENTS[activityType ?? 'other'] ?? ACTIVITY_GRADIENTS.other;

  return (
    <div
      className="ds-card overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
      onClick={onBook}
    >
      {/* Фото или градиентный фолбэк */}
      <div className="relative h-36 w-full overflow-hidden">
        {cardImage ? (
          <Image
            src={cardImage}
            alt={offer.tourName}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: fallbackGradient }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Имя оператора поверх фото */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: accentColor }}
          >
            {initials}
          </div>
          <span className="text-white text-xs font-medium drop-shadow">
            {offer.operator.name}
          </span>
          {offer.operator.verified && (
            <CheckCircle className="w-3.5 h-3.5 text-[var(--success)] flex-shrink-0" />
          )}
        </div>

        {/* Рейтинг */}
        {offer.operator.rating != null && offer.operator.rating > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full">
            <Star className="w-3 h-3 fill-[var(--warning)] text-[var(--warning)]" />
            <span className="text-white text-xs font-semibold">{offer.operator.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Цена снизу */}
        {price != null && price > 0 && (
          <div className="absolute bottom-2 left-3">
            <span className="text-white font-bold text-lg leading-none drop-shadow">
              {price.toLocaleString('ru-RU')} ₽
            </span>
            <span className="text-white/70 text-xs"> /чел</span>
          </div>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Название тура */}
        <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-snug">
          {offer.tourName}
        </p>

        {/* Характеристики */}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {duration && (
            <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <Clock className="w-3 h-3 flex-shrink-0" style={{ color: accentColor }} />
              <span>{duration}</span>
            </div>
          )}
          {offer.maxGroupSize && (
            <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <Users className="w-3 h-3 flex-shrink-0" style={{ color: accentColor }} />
              <span>до {offer.maxGroupSize} чел.</span>
            </div>
          )}
        </div>

        {/* Ближайший заезд */}
        {nextDate && (
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${
            isLowSlots
              ? 'bg-[var(--warning)]/10 text-[var(--warning)]'
              : 'bg-[var(--success)]/10 text-[var(--success)]'
          }`}>
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span className="font-medium">
              {isLowSlots ? `Осталось ${offer.nextSlots} — ` : ''}
              {nextDate}
            </span>
          </div>
        )}

        <button
          type="button"
          className="ds-btn ds-btn-primary w-full text-sm py-2 group-hover:opacity-95 transition-opacity"
          onClick={e => { e.stopPropagation(); onBook(); }}
        >
          Забронировать
        </button>
      </div>
    </div>
  );
}

// ── Компонент страницы ────────────────────────────────────────────────────────

export default function RouteDetailClient({ id }: { id: string }) {
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showLead, setShowLead] = useState(false);
  const [bookingOffer, setBookingOffer] = useState<Offer | null>(null);
  const [relatedRoutes, setRelatedRoutes] = useState<RouteItem[]>([]);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [showAllOffers, setShowAllOffers] = useState(false);
  useSourceTracker();

  useEffect(() => {
    fetch(`/api/routes/${id}`)
      .then(r => r.json())
      .then(j => {
        if (j.success) setRoute(j.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!route) return;
    fetch(`/api/routes?activity_type=${route.activityType ?? ''}&limit=5&sort=recommended`)
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          const others = (j.data as RouteItem[]).filter(r => r.id !== id).slice(0, 4);
          setRelatedRoutes(others);
        }
      })
      .catch(() => {});
  }, [route, id]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="ds-page pt-20 pb-10">
          <div className="ds-skeleton rounded-lg h-8 w-64 mb-4" />
          <div className="ds-skeleton rounded-lg h-64 mb-4" />
          <div className="ds-skeleton rounded-lg h-48" />
        </div>
      </>
    );
  }

  if (notFound || !route) {
    return (
      <>
        <Header />
        <div className="ds-page pt-20 py-20 text-center">
          <p className="text-[var(--text-secondary)] mb-4">Маршрут не найден</p>
          <Link href="/routes" className="ds-btn ds-btn-secondary">Назад к каталогу</Link>
        </div>
      </>
    );
  }

  const hasGeo = route.lat != null && route.lng != null;
  const locLabel = LOCATION_TYPE_LABELS[route.locationType ?? 'other'] ?? 'Маршрут';
  const actLabel = ACTIVITY_TYPE_LABELS[route.activityType ?? 'other'] ?? 'Активный отдых';
  const offers = route.offers ?? [];
  const photos = [...new Set(route.photos ?? [])]; // дедупликация
  const fallbackHero = LOCATION_TYPE_IMAGES[route.locationType ?? 'other'] ?? '/images/hero/hero-dark.jpg';
  const heroImage = photos[galleryIdx] ?? photos[0] ?? fallbackHero;
  const minPrice = offers.length > 0
    ? Math.min(...offers.map(o => o.effectivePrice ?? o.priceBase ?? 0).filter(p => p > 0))
    : (route.priceFrom ?? 0);

  return (
    <>
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative h-72 md:h-[480px] w-full overflow-hidden pt-16">
        <Image
          src={heroImage}
          alt={route.title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        <Link
          href="/routes"
          className="absolute top-4 left-4 md:left-8 inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors bg-black/30 px-3 py-1.5 rounded-full"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Все маршруты
        </Link>

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <span className="text-[var(--accent)] text-xs font-semibold uppercase tracking-widest mb-2 block">
            {locLabel} · {actLabel}
          </span>
          <h1
            className="text-2xl md:text-4xl font-bold text-white leading-tight mb-3"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            {route.title}
          </h1>
          {/* Быстрые факты прямо на hero */}
          <div className="flex flex-wrap gap-2">
            {minPrice > 0 && (
              <span className="bg-[var(--accent)] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                от {minPrice.toLocaleString('ru-RU')} ₽
              </span>
            )}
            {route.durationDays != null && (
              <span className="bg-black/40 text-white/90 text-xs px-2.5 py-1 rounded-full">
                {route.durationDays} дн.
              </span>
            )}
            {route.difficulty && (
              <span className="bg-black/40 text-white/90 text-xs px-2.5 py-1 rounded-full">
                {DIFFICULTY_RU[route.difficulty] ?? route.difficulty}
              </span>
            )}
            {offers.length > 0 && (() => {
              const uniqueOps = new Set(offers.map(o => o.operator.id)).size;
              return (
                <span className="bg-[var(--success)] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {offers.length} {offers.length === 1 ? 'тур' : offers.length < 5 ? 'тура' : 'туров'}
                  {uniqueOps > 1 ? ` · ${uniqueOps} оператора` : ''}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── Галерея фото ────────────────────────────────────────────────────── */}
      {photos.length > 1 && (
        <div className="ds-page pt-4 pb-0">
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGalleryIdx(i)}
                  className={`relative flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200 ${
                    i === galleryIdx ? 'ring-2 ring-[var(--accent)]' : 'opacity-75 hover:opacity-100'
                  }`}
                  style={{ width: 160, height: 100 }}
                >
                  <Image src={src} alt={`Фото ${i + 1}`} fill className="object-cover" sizes="120px" />
                </button>
              ))}
            </div>
            {galleryIdx > 0 && (
              <button type="button" onClick={() => setGalleryIdx(i => i - 1)}
                className="absolute left-0 top-1/2 -translate-y-1/2 bg-[var(--bg-card)] border border-[var(--border)] rounded-full p-1 shadow">
                <ChevronLeft className="w-4 h-4 text-[var(--text-primary)]" />
              </button>
            )}
            {galleryIdx < photos.length - 1 && (
              <button type="button" onClick={() => setGalleryIdx(i => i + 1)}
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-[var(--bg-card)] border border-[var(--border)] rounded-full p-1 shadow">
                <ChevronRight className="w-4 h-4 text-[var(--text-primary)]" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="ds-page pb-20 lg:pb-10 pt-6">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">

          {/* ── Main content (2/3) ──────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-7">

            {/* Description */}
            {route.description && (
              <div className="prose prose-sm max-w-none text-[var(--text-secondary)] leading-relaxed">
                {route.description.split('\n').map((p, i) =>
                  p.trim() ? <p key={i}>{p}</p> : null
                )}
              </div>
            )}

            {/* Быстрые факты — всегда если хоть что-то есть */}
            {(route.durationDays || route.difficulty || route.altitude || route.groupSizeMax || route.season) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {route.durationDays != null && (
                  <div className="ds-card p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-[var(--accent)]" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Длительность</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {route.durationDays < 1
                          ? `${Math.round(route.durationDays * 24)} ч`
                          : `${route.durationDays} ${route.durationDays === 1 ? 'день' : route.durationDays < 5 ? 'дня' : 'дней'}`}
                      </p>
                    </div>
                  </div>
                )}
                {route.difficulty && (
                  <div className="ds-card p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--ocean)]/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-[var(--ocean)]" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Сложность</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {DIFFICULTY_RU[route.difficulty] ?? route.difficulty}
                      </p>
                    </div>
                  </div>
                )}
                {route.altitude != null && route.altitude > 0 && (
                  <div className="ds-card p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--success)]/10 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-4 h-4 text-[var(--success)]" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Высота</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{route.altitude.toLocaleString('ru-RU')} м</p>
                    </div>
                  </div>
                )}
                {route.groupSizeMax != null && (
                  <div className="ds-card p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--warning)]/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-[var(--warning)]" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Группа</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">до {route.groupSizeMax} чел.</p>
                    </div>
                  </div>
                )}
                {route.season && (
                  <div className="ds-card p-3 flex items-center gap-3 col-span-2 sm:col-span-1">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                      <Thermometer className="w-4 h-4 text-[var(--accent)]" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Сезон</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{route.season}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Что включено — собираем из офферов */}
            {offers.length > 0 && (() => {
              const allIncluded = [...new Set(offers.flatMap(o => o.included))].filter(Boolean).slice(0, 8);
              return allIncluded.length > 0 ? (
                <div>
                  <h3 className="ds-label mb-3 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-[var(--success)]" /> Что входит в туры
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {allIncluded.map((item, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-[var(--success)]/8 text-[var(--success)] border border-[var(--success)]/20 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3 flex-shrink-0" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Кузьмич */}
            {route.kuzmichReview && (
              <div className="ds-card p-5 border-l-4 border-[var(--accent)]">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mountain className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide mb-1.5">
                      Кузьмич о маршруте
                    </p>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">
                      &ldquo;{route.kuzmichReview}&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Лучшие месяцы */}
            {(route.bestMonths && route.bestMonths.length > 0) && (
              <div>
                <h3 className="ds-label flex items-center gap-1.5 mb-3">
                  <Calendar className="w-3.5 h-3.5" /> Лучшие месяцы
                </h3>
                <div className="flex gap-1.5 flex-wrap">
                  {MONTHS.map((m, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2.5 py-1.5 rounded font-medium ${
                        route.bestMonths!.includes(i + 1)
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                      }`}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Снаряжение */}
            {route.equipment && route.equipment.length > 0 && (
              <div>
                <h3 className="ds-label mb-2">Необходимое снаряжение</h3>
                <ul className="flex flex-wrap gap-2">
                  {route.equipment.map((eq, i) => (
                    <li key={i} className="text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] px-2.5 py-1 rounded">
                      {eq}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Опасность */}
            {(route.dangerLevel === 'high' || route.dangerLevel === 'extreme') && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/20">
                <AlertTriangle className="w-4 h-4 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[var(--warning)]">
                  Маршрут повышенной сложности. Требует физической подготовки и опытного гида.
                </p>
              </div>
            )}

            {/* Офферы — только на мобиле, на desktop показываем в сайдбаре */}
            {offers.length > 0 && (
              <div className="lg:hidden space-y-3">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                  {offers.length === 1 ? 'Доступный тур' : `${offers.length} туров на маршрут`}
                </h2>
                {(showAllOffers ? offers : offers.slice(0, 3)).map(offer => (
                  <OfferCard
                    key={offer.tourId}
                    offer={offer}
                    activityType={route.activityType}
                    onBook={() => setBookingOffer(offer)}
                  />
                ))}
                {offers.length > 3 && !showAllOffers && (
                  <button
                    type="button"
                    onClick={() => setShowAllOffers(true)}
                    className="w-full text-center text-sm font-medium text-[var(--ocean)] hover:text-[var(--accent)] transition-colors py-2 border border-[var(--border)] rounded-lg hover:border-[var(--accent)]"
                  >
                    Ещё {offers.length - 3} {offers.length - 3 < 5 ? 'тура' : 'туров'}
                  </button>
                )}
              </div>
            )}

            {/* Карта — на mobile показываем здесь, на desktop — в сайдбаре */}
            {hasGeo && (
              <div className="lg:hidden">
                <h3 className="ds-label mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Расположение
                </h3>
                <LeafletMap
                  center={[Number(route.lat), Number(route.lng)]}
                  zoom={10}
                  markers={[{
                    coords: [Number(route.lat), Number(route.lng)],
                    title: route.title,
                    description: locLabel,
                    color: 'red',
                    type: MarkerType.TOUR,
                    category: route.locationType ?? 'other',
                  }]}
                  height="240px"
                  className="w-full rounded-lg"
                />
              </div>
            )}

            {/* Источник */}
            {route.sourceUrl && (
              <a
                href={route.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--ocean)] hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Источник: {route.sourceName ?? new URL(route.sourceUrl).hostname}
              </a>
            )}
          </div>

          {/* ── Sidebar STICKY (1/3) ────────────────────────────────────────── */}
          <div className="hidden lg:block">
            <div className="sticky top-6 space-y-4">

              {/* Офферы */}
              {offers.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                    {offers.length === 1 ? 'Доступный тур' : `${offers.length} туров на маршрут`}
                  </h2>
                  {(showAllOffers ? offers : offers.slice(0, 3)).map(offer => (
                    <OfferCard
                      key={offer.tourId}
                      offer={offer}
                      activityType={route.activityType}
                      onBook={() => setBookingOffer(offer)}
                    />
                  ))}
                  {offers.length > 3 && !showAllOffers && (
                    <button
                      type="button"
                      onClick={() => setShowAllOffers(true)}
                      className="w-full text-center text-sm font-medium text-[var(--ocean)] hover:text-[var(--accent)] transition-colors py-2 border border-[var(--border)] rounded-lg hover:border-[var(--accent)]"
                    >
                      Ещё {offers.length - 3} туров
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowLead(true)}
                    className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors py-1"
                  >
                    Не нашли нужный вариант? Оставьте заявку →
                  </button>
                </div>
              ) : (
                /* CTA если операторов нет */
                <div className="ds-card p-5 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    Хотите на этот маршрут?
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Оставьте заявку — подберём оператора и дату под ваш запрос.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowLead(true)}
                    className="ds-btn ds-btn-primary w-full flex items-center justify-center gap-1.5 text-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Оставить заявку
                  </button>
                </div>
              )}

              {/* Карта */}
              {hasGeo && (
                <div>
                  <h3 className="ds-label mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Расположение
                  </h3>
                  <LeafletMap
                    center={[Number(route.lat), Number(route.lng)]}
                    zoom={10}
                    markers={[{
                      coords: [Number(route.lat), Number(route.lng)],
                      title: route.title,
                      description: locLabel,
                      color: 'red',
                      type: MarkerType.TOUR,
                      category: route.locationType ?? 'other',
                    }]}
                    height="220px"
                    className="w-full rounded-lg"
                  />
                </div>
              )}

              {/* Кнопка оператора если есть */}
              {offers.length > 0 && offers[0].operator.slug && (
                <Link
                  href={`/operators/${offers[0].operator.slug}`}
                  className="flex items-center justify-between text-sm text-[var(--ocean)] hover:underline py-1"
                >
                  <span>Профиль оператора</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Похожие маршруты ──────────────────────────────────────────────── */}
        {relatedRoutes.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="ds-h2">Похожее: {actLabel}</h2>
              <Link
                href={`/routes?activity_type=${route.activityType ?? ''}`}
                className="text-sm text-[var(--ocean)] hover:underline"
              >
                Все маршруты
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedRoutes.map(r => (
                <RouteCard key={r.id} route={r} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile sticky bottom bar ──────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-card)] border-t border-[var(--border)] px-4 py-3 flex items-center gap-3 safe-area-pb">
        <div className="flex-1 min-w-0">
          {minPrice > 0 ? (
            <>
              <p className="text-xs text-[var(--text-muted)]">от</p>
              <p className="text-lg font-bold text-[var(--accent)] leading-none">
                {minPrice.toLocaleString('ru-RU')} ₽
                <span className="text-xs font-normal text-[var(--text-muted)] ml-1">/чел</span>
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-[var(--text-secondary)]">По запросу</p>
          )}
        </div>
        {offers.length > 0 ? (
          <button
            type="button"
            onClick={() => setBookingOffer(offers[0])}
            className="ds-btn ds-btn-primary px-6 py-2.5 text-sm font-semibold flex-shrink-0"
          >
            Забронировать
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowLead(true)}
            className="ds-btn ds-btn-primary px-6 py-2.5 text-sm font-semibold flex-shrink-0"
          >
            Оставить заявку
          </button>
        )}
      </div>

      {/* ── Модалки ───────────────────────────────────────────────────────────── */}
      <LeadModal
        open={showLead}
        onClose={() => setShowLead(false)}
        routeId={route.id}
        routeTitle={route.title}
      />
      {bookingOffer && (
        <BookingModal
          open={bookingOffer !== null}
          onClose={() => setBookingOffer(null)}
          tourId={bookingOffer.tourId}
          tourName={bookingOffer.tourName}
          operatorName={bookingOffer.operator.name}
          priceBase={bookingOffer.priceBase}
          minGroupSize={bookingOffer.minGroupSize}
          maxGroupSize={bookingOffer.maxGroupSize}
        />
      )}
      <AssistantButton pageContext={{ type: 'route', title: route.title, category: locLabel }} />
    </>
  );
}
