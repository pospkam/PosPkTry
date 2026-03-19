'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, MapPin, Clock, Calendar, Mountain,
  ExternalLink, AlertTriangle, Users, Send,
  Star, CheckCircle, Phone, ChevronLeft, ChevronRight,
  TrendingUp, Layers, Thermometer, MessageSquare,
  Fish, Plane, PawPrint, Anchor, Snowflake, Car,
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
  other:      '/images/hero/hero-dark.jpg',
};

const ACTIVITY_COLORS: Record<string, string> = {
  fishing: 'var(--ocean)', trekking: 'var(--success)', thermal: 'var(--warning)',
  helicopter: 'var(--accent)', bear_watching: 'var(--danger)', boat_trip: 'var(--ocean)',
  snowmobile: '#6366f1', jeep: 'var(--accent)', other: 'var(--text-muted)',
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

function formatDuration(days: number): string {
  if (days < 1) return `${Math.round(days * 24)} ч`;
  if (days === 1) return '1 день';
  if (days < 5) return `${days} дня`;
  return `${days} дней`;
}

interface Offer {
  tourId: string; tourName: string; shortDesc: string | null;
  priceBase: number | null; effectivePrice: number | null;
  durationDays: number | null; difficulty: string | null;
  maxGroupSize: number | null; minGroupSize: number | null;
  rating: number | null; reviewCount: number | null;
  included: string[]; season: string[];
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
  const duration = offer.durationDays ? formatDuration(offer.durationDays) : null;
  const isLowSlots = offer.nextSlots != null && offer.nextSlots > 0 && offer.nextSlots <= 3;
  const cardImage = offer.tourImage || offer.operatorHeroImage;
  const ActivityIcon = ACTIVITY_ICONS[activityType ?? 'other'] ?? MapPin;

  return (
    <div
      className="ds-card overflow-hidden hover:shadow-md hover:border-[var(--accent)]/30 transition-all duration-200 cursor-pointer group"
      onClick={onBook}
    >
      <div className="flex gap-0">
        {/* Фото / иконка-заглушка */}
        <div className="relative w-24 flex-shrink-0 overflow-hidden" style={{ minHeight: 96 }}>
          {cardImage ? (
            <Image
              src={cardImage}
              alt={offer.tourName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="96px"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `color-mix(in srgb, ${accentColor} 12%, var(--bg-hover))` }}
            >
              <ActivityIcon className="w-7 h-7 opacity-40" style={{ color: accentColor }} />
            </div>
          )}
        </div>

        {/* Контент */}
        <div className="flex-1 p-3.5 min-w-0 flex flex-col justify-between gap-2">
          {/* Оператор + рейтинг */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--text-muted)] truncate">{offer.operator.name}</span>
            {offer.operator.verified && <CheckCircle className="w-3 h-3 text-[var(--success)] flex-shrink-0" />}
            {offer.operator.rating != null && offer.operator.rating > 0 && (
              <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
                <Star className="w-3 h-3 fill-[var(--warning)] text-[var(--warning)]" />
                <span className="text-[11px] font-semibold text-[var(--text-primary)]">{offer.operator.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Название */}
          <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-snug">
            {offer.tourName}
          </p>

          {/* Мета-строка */}
          <div className="flex items-center gap-3">
            {duration && (
              <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                <Clock className="w-3 h-3" style={{ color: accentColor }} />
                {duration}
              </span>
            )}
            {offer.maxGroupSize && (
              <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                <Users className="w-3 h-3" style={{ color: accentColor }} />
                до {offer.maxGroupSize}
              </span>
            )}
          </div>

          {/* Цена + кнопка */}
          <div className="flex items-center justify-between">
            <div>
              {price != null && price > 0 ? (
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {price.toLocaleString('ru-RU')} ₽
                  <span className="text-[11px] font-normal text-[var(--text-muted)] ml-1">/чел</span>
                </span>
              ) : (
                <span className="text-sm text-[var(--text-muted)]">По запросу</span>
              )}
              {nextDate && (
                <p className={`text-[11px] mt-0.5 font-medium ${isLowSlots ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
                  {isLowSlots ? `${offer.nextSlots} места · ` : ''}{nextDate}
                </p>
              )}
            </div>
            <button
              type="button"
              className="ds-btn ds-btn-primary px-3 py-1.5 text-xs font-semibold flex-shrink-0"
              onClick={e => { e.stopPropagation(); onBook(); }}
            >
              Забронировать
            </button>
          </div>
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
  useSourceTracker();

  useEffect(() => {
    fetch(`/api/routes/${id}`)
      .then(r => r.json())
      .then(j => { if (j.success) setRoute(j.data); else setNotFound(true); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
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
  const offers = route.offers ?? [];
  const photos = [...new Set(route.photos ?? [])];
  const fallbackHero = LOCATION_TYPE_IMAGES[route.locationType ?? 'other'] ?? '/images/hero/hero-dark.jpg';
  const heroImage = photos[galleryIdx] ?? photos[0] ?? fallbackHero;
  const minPrice = offers.length > 0
    ? Math.min(...offers.map(o => o.effectivePrice ?? o.priceBase ?? 0).filter(p => p > 0))
    : (route.priceFrom ?? 0);
  const uniqueOperators = new Set(offers.map(o => o.operator.id)).size;
  const descParagraphs = route.description?.split('\n').filter(p => p.trim()) ?? [];
  const isLongDesc = descParagraphs.length > 3;

  return (
    <>
      <Header />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ height: '52vh', minHeight: 320, maxHeight: 520 }}>
        <div className="absolute inset-0 pt-16">
          <Image src={heroImage} alt={route.title} fill className="object-cover" priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
        </div>

        {/* Навигация */}
        <div className="absolute top-20 left-0 right-0 px-4 md:px-8 flex items-center justify-between">
          <Link
            href="/routes"
            className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white bg-black/30 hover:bg-black/50 px-3 py-1.5 rounded-full transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Маршруты
          </Link>

          {/* Счётчик фото */}
          {photos.length > 1 && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setGalleryIdx(i => Math.max(0, i - 1))}
                className="w-7 h-7 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-white/70 text-xs">{galleryIdx + 1}/{photos.length}</span>
              <button type="button" onClick={() => setGalleryIdx(i => Math.min(photos.length - 1, i + 1))}
                className="w-7 h-7 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Заголовок */}
        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest">
              {locLabel}
            </span>
            <span className="text-white/30 text-xs">·</span>
            <span className="text-xs text-white/60">{actLabel}</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight max-w-3xl"
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
                <p className="text-sm font-semibold text-[var(--text-primary)]">{formatDuration(route.durationDays)}</p>
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
                <div className={`text-[var(--text-secondary)] leading-relaxed space-y-3 text-sm md:text-base overflow-hidden transition-all duration-300 ${
                  isLongDesc && !descExpanded ? 'max-h-28' : 'max-h-none'
                }`}
                  style={isLongDesc && !descExpanded ? { maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' } : undefined}
                >
                  {descParagraphs.map((p, i) => <p key={i}>{p}</p>)}
                </div>
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
                        ? 'bg-[var(--accent)] text-white font-semibold'
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

            {/* Источник */}
            {route.sourceUrl && (
              <a href={route.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--ocean)] transition-colors">
                <ExternalLink className="w-3 h-3" />
                Источник: {route.sourceName ?? (() => { try { return new URL(route.sourceUrl!).hostname; } catch { return route.sourceUrl; } })()}
              </a>
            )}
          </div>

          {/* ── Правый сайдбар — desktop ─────────────────────────────────────── */}
          <div className="hidden lg:block">
            <div className="sticky top-32 space-y-4">

              {offers.length > 0 ? (
                <>
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
