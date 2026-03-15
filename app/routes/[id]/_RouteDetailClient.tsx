'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, MapPin, Tag, Clock, Calendar, Mountain,
  ExternalLink, AlertTriangle, Users, Gauge, Send,
  Star, CheckCircle, ChevronRight,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import LeadModal from '@/components/routes/LeadModal';
import BookingModal from '@/components/routes/BookingModal';
import RouteCard, { type RouteItem } from '@/components/routes/RouteCard';
import { useSourceTracker } from '@/hooks/useSourceTracker';
import { AssistantButton } from '@/components/shared/AssistantButton';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

const CATEGORY_LABELS: Record<string, string> = {
  vulkani:              'Вулканы',
  termalnye_istochniki: 'Термальные источники',
  morskie_progulki:     'Морские прогулки',
  eco:                  'Экомаршруты',
  rybalka:              'Рыбалка',
  snegohod:             'Снегоходы',
  vertoletnye_tury:     'Вертолётные туры',
  trekking:             'Трекинг',
  geyzery:              'Гейзеры',
  rivers:               'Реки',
  lakes:                'Озёра',
  medvedi:              'Медведи',
  mountains:            'Горы',
  dzhip:                'Джип-туры',
};

// Фото с сайтов партнёров (Камчатинтур) — скачаны и хранятся локально
const CATEGORY_IMAGES: Record<string, string> = {
  vulkani:              '/images/partners/kamchatintour/avacha-winter.jpg',
  geyzery:              '/images/partners/kamchatintour/seo4.jpg',
  termalnye_istochniki: '/images/partners/kamchatintour/laguna-winter.jpg',
  morskie_progulki:     '/images/partners/kamchatintour/seo5.jpg',
  snegohod:             '/images/partners/kamchatintour/snowmobile.jpg',
  vertoletnye_tury:     '/images/partners/kamchatintour/helicopter.jpg',
  trekking:             '/images/partners/kamchatintour/winter-adventures.jpg',
  mountains:            '/images/partners/kamchatintour/seo4.jpg',
  eco:                  '/images/partners/kamchatintour/seo1.jpg',
  medvedi:              '/images/partners/kamchatintour/dog-sled.jpg',
  dzhip:                '/images/partners/kamchatintour/seo3.jpg',
  rybalka:              '/images/activities/fishing.jpg',
  rivers:               '/images/bento/khalaktyr.jpg',
  lakes:                '/images/gallery/bay-sunset.jpg',
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
  offers: Offer[];
}

function OfferCard({ offer, onBook }: { offer: Offer; onBook: () => void }) {
  const price = offer.effectivePrice ?? offer.priceBase;
  const nextDate = offer.nextDeparture
    ? new Date(offer.nextDeparture).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="ds-card p-4 flex items-center justify-between gap-4 hover:border-[var(--accent)] transition-colors">
      {/* Operator + Tour info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-[var(--text-primary)] truncate">
            {offer.operator.name}
          </span>
          {offer.operator.verified && (
            <CheckCircle className="w-3.5 h-3.5 text-[var(--success)] flex-shrink-0" />
          )}
        </div>
        <p className="text-sm text-[var(--text-secondary)] line-clamp-1 mb-2">
          {offer.tourName}
        </p>
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          {offer.operator.rating != null && offer.operator.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-[var(--warning)] text-[var(--warning)]" />
              <span>{offer.operator.rating.toFixed(1)}</span>
              {offer.operator.reviewCount != null && offer.operator.reviewCount > 0 && (
                <span>({offer.operator.reviewCount})</span>
              )}
            </div>
          )}
          {nextDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{nextDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Price + Button */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {price != null && price > 0 && (
          <div className="text-right">
            <div className="text-lg font-bold text-[var(--accent)]">
              {price.toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-xs text-[var(--text-muted)]">за чел.</div>
          </div>
        )}
        <button
          type="button"
          onClick={onBook}
          className="ds-btn ds-btn-primary px-6 py-2 text-sm whitespace-nowrap"
        >
          Забронировать
        </button>
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

  // Похожие маршруты — загружаем когда известна категория
  useEffect(() => {
    if (!route) return;
    fetch(`/api/routes?category=${route.category}&limit=5&sort=recommended`)
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          const others = (j.data as RouteItem[]).filter(r => r.id !== id).slice(0, 4);
          setRelatedRoutes(others);
        }
      })
      .catch(() => { /* silent */ });
  }, [route, id]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="ds-page pt-20 pb-10">
          <div className="ds-skeleton rounded-lg h-8 w-64 mb-4" />
          <div className="ds-skeleton rounded-lg h-48 mb-4" />
          <div className="ds-skeleton rounded-lg h-64" />
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
  const catLabel = CATEGORY_LABELS[route.category] ?? route.category;
  const offers = route.offers ?? [];
  const heroImage = CATEGORY_IMAGES[route.category] ?? '/images/hero/hero-dark.jpg';

  return (
    <>
      <Header />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="relative h-56 md:h-80 w-full overflow-hidden pt-16">
        <Image
          src={heroImage}
          alt={route.title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/20" />

        {/* Breadcrumb */}
        <Link
          href="/routes"
          className="absolute top-4 left-4 md:left-8 inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors bg-black/30 px-3 py-1.5 rounded-full"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Все маршруты
        </Link>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <span className="text-[var(--accent)] text-xs font-semibold uppercase tracking-widest mb-1 block">
            {catLabel}
          </span>
          <h1
            className="text-2xl md:text-4xl font-bold text-white leading-tight"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            {route.title}
          </h1>
        </div>
      </div>

      <div className="ds-page pb-10 pt-6">

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Main content ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Key badges */}
          <div className="flex flex-wrap gap-2">
            {route.priceFrom != null && route.priceFrom > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--success)]/10 text-[var(--success)] text-sm font-semibold">
                <Tag className="w-3.5 h-3.5" />
                от {route.priceFrom.toLocaleString('ru-RU')} ₽
              </span>
            )}
            {route.durationDays != null && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] text-sm">
                <Clock className="w-3.5 h-3.5" />
                {route.durationDays} дн.
              </span>
            )}
            {route.difficulty && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] text-sm">
                <Gauge className="w-3.5 h-3.5" />
                {DIFFICULTY_RU[route.difficulty] ?? route.difficulty}
              </span>
            )}
            {route.altitude != null && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] text-sm">
                <Mountain className="w-3.5 h-3.5" />
                {route.altitude.toLocaleString('ru-RU')} м
              </span>
            )}
            {route.groupSizeMax != null && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] text-sm">
                <Users className="w-3.5 h-3.5" />
                до {route.groupSizeMax} чел.
              </span>
            )}
            {hasGeo && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ocean)]/10 text-[var(--ocean)] text-sm">
                <MapPin className="w-3.5 h-3.5" />
                {Number(route.lat).toFixed(4)}, {Number(route.lng).toFixed(4)}
              </span>
            )}
          </div>

          {/* Description */}
          {route.description && (
            <div className="prose prose-sm max-w-none text-[var(--text-secondary)] leading-relaxed">
              {route.description.split('\n').map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
            </div>
          )}

          {/* ── Offers from operators ─────────────────────────── */}
          {offers.length > 0 && (
            <div>
              <h2 className="ds-h2 mb-4">
                Свободные туры
              </h2>
              <div className="space-y-3">
                {offers.map(offer => (
                  <OfferCard
                    key={offer.tourId}
                    offer={offer}
                    onBook={() => setBookingOffer(offer)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Best months */}
          {route.bestMonths && route.bestMonths.length > 0 && (
            <div>
              <h3 className="ds-label flex items-center gap-1.5 mb-2">
                <Calendar className="w-3.5 h-3.5" /> Лучшие месяцы
              </h3>
              <div className="flex gap-1.5 flex-wrap">
                {MONTHS.map((m, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2 py-1 rounded font-medium ${
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

          {/* Equipment */}
          {route.equipment && route.equipment.length > 0 && (
            <div>
              <h3 className="ds-label mb-2">Необходимое снаряжение</h3>
              <ul className="flex flex-wrap gap-2">
                {route.equipment.map((eq, i) => (
                  <li key={i} className="text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] px-2 py-1 rounded">
                    {eq}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Danger warning */}
          {route.dangerLevel === 'high' || route.dangerLevel === 'extreme' ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/20">
              <AlertTriangle className="w-4 h-4 text-[var(--warning)] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--warning)]">
                Маршрут повышенной сложности. Требует физической подготовки и опытного гида.
              </p>
            </div>
          ) : null}

          {/* Source link */}
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

        {/* ── Sidebar ───────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Map */}
          {hasGeo ? (
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
                  description: catLabel,
                  color: 'red',
                }]}
                height="280px"
                className="w-full rounded-lg"
              />
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 text-center">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">Координаты уточняются</p>
            </div>
          )}

          {/* CTA */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {offers.length > 0 ? 'Нужна помощь с выбором?' : 'Хотите на этот маршрут?'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Оставьте заявку — подберём оператора и дату под ваш запрос.
            </p>
            <button
              type="button"
              onClick={() => setShowLead(true)}
              className="ds-btn ds-btn-primary w-full text-center text-sm flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Оставить заявку
            </button>
          </div>
        </div>
      </div>

      {/* ── Related routes ───────────────────────────────────── */}
      {relatedRoutes.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="ds-h2">
              Ещё в категории &laquo;{catLabel}&raquo;
            </h2>
            <Link
              href={`/routes?category=${route.category}`}
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
    <AssistantButton pageContext={{ type: 'route', title: route.title, category: catLabel }} />
    </>
  );
}
