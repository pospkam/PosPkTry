'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, MapPin, Tag, Clock, Calendar, Mountain,
  ExternalLink, AlertTriangle, Users, Gauge, Send,
  Star, CheckCircle, Phone,
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
  river:      '/images/bento/khalaktyr.jpg',
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
  offers: Offer[];
}

// ── Карточка оффера (sidebar) ─────────────────────────────────────────────────

function OfferCard({ offer, activityType, onBook }: {
  offer: Offer;
  activityType: string | null;
  onBook: () => void;
}) {
  const price = offer.effectivePrice ?? offer.priceBase;
  const nextDate = offer.nextDeparture
    ? new Date(offer.nextDeparture).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    : null;
  const accentColor = ACTIVITY_COLORS[activityType ?? 'other'] ?? 'var(--accent)';
  const duration = offer.durationDays
    ? offer.durationDays < 1
      ? `${Math.round(offer.durationDays * 24)} ч`
      : `${offer.durationDays} ${offer.durationDays === 1 ? 'день' : offer.durationDays < 5 ? 'дня' : 'дней'}`
    : null;

  return (
    <div
      className="ds-card overflow-hidden hover:border-[var(--accent)]/50 transition-all duration-200 cursor-pointer group"
      onClick={onBook}
    >
      {/* Цветная полоса сверху */}
      <div className="h-1 w-full" style={{ background: accentColor }} />

      <div className="p-4 space-y-3">
        {/* Оператор */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                {offer.operator.name}
              </span>
              {offer.operator.verified && (
                <CheckCircle className="w-3.5 h-3.5 text-[var(--success)] flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] line-clamp-1">
              {offer.tourName}
            </p>
          </div>
          {offer.operator.rating != null && offer.operator.rating > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0 bg-[var(--warning)]/10 px-1.5 py-0.5 rounded">
              <Star className="w-3 h-3 fill-[var(--warning)] text-[var(--warning)]" />
              <span className="text-xs font-semibold text-[var(--warning)]">
                {offer.operator.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Мета-инфо */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
          {duration && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{duration}
            </span>
          )}
          {offer.maxGroupSize && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />до {offer.maxGroupSize} чел.
            </span>
          )}
          {nextDate && (
            <span className="flex items-center gap-1 text-[var(--success)]">
              <Calendar className="w-3 h-3" />Ближайший {nextDate}
            </span>
          )}
          {offer.nextSlots != null && offer.nextSlots > 0 && offer.nextSlots <= 3 && (
            <span className="text-[var(--warning)] font-medium">
              {offer.nextSlots} место
            </span>
          )}
        </div>

        {/* Включено */}
        {offer.included.length > 0 && (
          <p className="text-xs text-[var(--text-muted)] line-clamp-1">
            Включено: {offer.included.slice(0, 3).join(', ')}
            {offer.included.length > 3 && ` +${offer.included.length - 3}`}
          </p>
        )}

        {/* Цена + кнопка */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--border)]">
          <div>
            {price != null && price > 0 ? (
              <>
                <span className="text-xs text-[var(--text-muted)]">от </span>
                <span className="text-lg font-bold" style={{ color: accentColor }}>
                  {price.toLocaleString('ru-RU')} ₽
                </span>
                <span className="text-xs text-[var(--text-muted)]"> /чел</span>
              </>
            ) : (
              <span className="text-sm font-semibold text-[var(--text-muted)]">По запросу</span>
            )}
          </div>
          <button
            type="button"
            className="ds-btn ds-btn-primary text-xs px-4 py-2 flex-shrink-0 group-hover:opacity-90"
            onClick={e => { e.stopPropagation(); onBook(); }}
          >
            Забронировать
          </button>
        </div>
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
  const heroImage = LOCATION_TYPE_IMAGES[route.locationType ?? 'other'] ?? '/images/hero/hero-dark.jpg';
  const minPrice = offers.length > 0
    ? Math.min(...offers.map(o => o.effectivePrice ?? o.priceBase ?? 0).filter(p => p > 0))
    : (route.priceFrom ?? 0);

  return (
    <>
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative h-64 md:h-96 w-full overflow-hidden pt-16">
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
            {offers.length > 0 && (
              <span className="bg-[var(--success)] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {offers.length} {offers.length === 1 ? 'оператор' : offers.length < 5 ? 'оператора' : 'операторов'}
              </span>
            )}
          </div>
        </div>
      </div>

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
            {route.bestMonths && route.bestMonths.length > 0 && (
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
                    {offers.length === 1 ? 'Доступный тур' : `${offers.length} тура на этот маршрут`}
                  </h2>
                  {offers.map(offer => (
                    <OfferCard
                      key={offer.tourId}
                      offer={offer}
                      activityType={route.activityType}
                      onBook={() => setBookingOffer(offer)}
                    />
                  ))}
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
