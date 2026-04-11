'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin, Clock, CheckCircle2, XCircle, Sparkles,
  ChevronRight, Users, Backpack, Shield, X,
  Calendar, Mountain, Star, Share2, Heart,
} from 'lucide-react';
import BookingFormClient from '@/components/marketplace/BookingFormClient';
import SafetyWarnings from '@/components/safety/SafetyWarnings';
import DescriptionWithFishLinks from '@/components/shared/DescriptionWithFishLinks';

/* ─── Labels ─── */

const ACTIVITY_LABELS: Record<string, string> = {
  trekking: 'Треккинг', fishing: 'Рыбалка', thermal: 'Термальные источники',
  helicopter: 'Вертолётные туры', boat_trip: 'Морские туры',
  bears: 'Наблюдение за медведями', rafting: 'Сплав', snowmobile: 'Снегоходные туры',
};

const LOCATION_LABELS: Record<string, string> = {
  mountain: 'Горы', volcano: 'Вулканы', hot_spring: 'Горячие источники',
  lake: 'Озёра', sea: 'Море', river: 'Реки', forest: 'Тайга', coast: 'Побережье',
};

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  easy:   { label: 'Легкий', color: 'var(--success)' },
  medium: { label: 'Средний', color: 'var(--warning)' },
  hard:   { label: 'Сложный', color: 'var(--danger)' },
};

const PRICE_UNIT_LABELS: Record<string, string> = {
  per_person: 'за человека',
  per_tour: 'за группу',
  per_day_per_person: 'за чел./день',
};

/* ─── Types ─── */

interface TourFull {
  id: number;
  title: string;
  description: string | null;
  short_description: string | null;
  base_price: string;
  price_old: string | null;
  price_unit: string | null;
  activity_type: string;
  location_type: string;
  location_name: string | null;
  latitude: string | null;
  longitude: string | null;
  tour_image: string | null;
  photos: string[] | null;
  max_participants: number;
  min_participants: number | null;
  duration_hours: string | null;
  duration_type: string | null;
  multi_day_count: number | null;
  difficulty: string | null;
  included: string[] | null;
  not_included: string[] | null;
  what_to_bring: string[] | null;
  season_start: string | null;
  season_end: string | null;
  seasonal_only: boolean | null;
  weather_dependent: boolean | null;
  rating: string | null;
  review_count: number | null;
  operator_name: string;
  operator_id: string;
}

/* ─── Helpers ─── */

function formatDuration(tour: TourFull): string | null {
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

function formatSeason(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
  return `${months[new Date(start).getMonth()]} — ${months[new Date(end).getMonth()]}`;
}

function formatPrice(p: number): string {
  return new Intl.NumberFormat('ru-RU').format(p) + ' ₽';
}

/* ─── Photo Gallery (Tripster-style grid) ─── */

function PhotoGallery({ images, alt }: { images: string[]; alt: string }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      {/* Grid: 1 large + up to 4 small */}
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 rounded-lg overflow-hidden h-[280px] sm:h-[360px] md:h-[420px]">
        {/* Main image */}
        <button
          onClick={() => setLightbox(0)}
          className="relative md:col-span-2 md:row-span-2 overflow-hidden group cursor-pointer bg-[var(--bg-hover)]"
        >
          <Image
            src={images[0]}
            alt={`${alt} — фото 1`}
            fill
            priority
            className="object-contain group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </button>

        {/* Thumbnails */}
        {images.slice(1, 5).map((src, i) => (
          <button
            key={i}
            onClick={() => setLightbox(i + 1)}
            className="relative hidden md:block overflow-hidden group cursor-pointer"
          >
            <Image
              src={src}
              alt={`${alt} — фото ${i + 2}`}
              fill
              className="object-contain bg-[var(--bg-hover)] group-hover:scale-105 transition-transform duration-500"
              sizes="25vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            {i === 3 && images.length > 5 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">+{images.length - 5}</span>
              </div>
            )}
          </button>
        ))}

        {/* Mobile: photo count badge */}
        {images.length > 1 && (
          <button
            onClick={() => setLightbox(0)}
            className="md:hidden absolute bottom-3 right-3 bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full"
          >
            1 / {images.length}
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <Lightbox
          images={images}
          alt={alt}
          startIdx={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

/* ─── Fullscreen Lightbox ─── */

function Lightbox({ images, alt, startIdx, onClose }: {
  images: string[];
  alt: string;
  startIdx: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIdx);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-[var(--text-primary)] hover:bg-black/50 transition-colors z-10"
        aria-label="Закрыть"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-12" onClick={e => e.stopPropagation()}>
        <Image
          src={images[idx]}
          alt={`${alt} — фото ${idx + 1}`}
          fill
          className="object-contain"
          sizes="100vw"
        />
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/30 flex items-center justify-center text-[var(--text-primary)] hover:bg-black/50 transition-colors"
            aria-label="Назад"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % images.length); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/30 flex items-center justify-center text-[var(--text-primary)] hover:bg-black/50 transition-colors"
            aria-label="Далее"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setIdx(i); }}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-white w-5' : 'bg-white/40'}`}
                aria-label={`Фото ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Review types ─── */

interface TourReview {
  id: number;
  author_name: string;
  author_city: string | null;
  rating: number;
  comment: string;
  trip_date: string | null;
}

/* ─── Star display ─── */

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= rating ? 'text-[var(--warning)] fill-[var(--warning)]' : 'text-[var(--text-muted)]'}`}
        />
      ))}
    </span>
  );
}

/* ─── Main Component ─── */

export default function TourDetailClient({ tour, reviews = [] }: { tour: TourFull; reviews?: TourReview[] }) {
  const router = useRouter();
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const handleWishlist = useCallback(async () => {
    if (wishlistLoading) return;
    setWishlistLoading(true);
    try {
      const res = await fetch('/api/tourist/wishlist', {
        method: wishlisted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: 'tour', itemId: tour.id }),
      });
      if (res.status === 401) {
        router.push(`/auth/login?from=/marketplace/tours/${tour.id}`);
        return;
      }
      if (res.ok) setWishlisted(w => !w);
    } catch {
      // silent
    } finally {
      setWishlistLoading(false);
    }
  }, [tour.id, wishlisted, wishlistLoading, router]);

  const price = parseFloat(tour.base_price);
  const priceOld = tour.price_old ? parseFloat(tour.price_old) : null;
  const activityLabel = ACTIVITY_LABELS[tour.activity_type] ?? tour.activity_type;
  const locationLabel = LOCATION_LABELS[tour.location_type] ?? tour.location_type;
  const durationLabel = formatDuration(tour);
  const diffBadge = tour.difficulty ? DIFFICULTY_MAP[tour.difficulty] : null;
  const priceLabel = PRICE_UNIT_LABELS[tour.price_unit ?? ''] ?? 'за человека';
  const seasonLabel = formatSeason(tour.season_start, tour.season_end);
  const rating = tour.rating ? Number(tour.rating) : 0;

  const allPhotos = [
    ...(tour.photos?.length ? tour.photos : tour.tour_image ? [tour.tour_image] : []),
  ];

  const included = Array.isArray(tour.included) ? tour.included : [];
  const notIncluded = Array.isArray(tour.not_included) ? tour.not_included : [];
  const whatToBring = Array.isArray(tour.what_to_bring) ? tour.what_to_bring : [];

  return (
    <div className="ds-page pb-20">
      {/* ─── Breadcrumb ─── */}
      <nav className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] mb-5 overflow-x-auto">
        <Link href="/" className="hover:text-[var(--ocean)] transition-colors whitespace-nowrap">Главная</Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <Link href="/marketplace" className="hover:text-[var(--ocean)] transition-colors whitespace-nowrap">Туры</Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <Link
          href={`/marketplace?activity_type=${tour.activity_type}`}
          className="hover:text-[var(--ocean)] transition-colors whitespace-nowrap"
        >
          {activityLabel}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[var(--text-secondary)] truncate">{tour.title}</span>
      </nav>

      {/* ─── Photo Gallery ─── */}
      <div className="mb-8 relative">
        {allPhotos.length > 0 ? (
          <PhotoGallery images={allPhotos} alt={tour.title} />
        ) : (
          <div className="w-full h-[280px] sm:h-[360px] md:h-[420px] rounded-lg bg-[var(--bg-hover)] flex items-center justify-center">
            <MapPin className="w-16 h-16 text-[var(--text-muted)]" />
          </div>
        )}
      </div>

      {/* ─── Two-column layout: Content + Sidebar ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

        {/* ═══ Left Column: Content (8/12) ═══ */}
        <div className="lg:col-span-8 space-y-8">

          {/* Title block */}
          <div>
            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] leading-tight mb-3"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              {tour.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
              {rating > 0 && (
                <span className="flex items-center gap-1 font-medium">
                  <Star className="w-4 h-4 text-[var(--warning)] fill-[var(--warning)]" />
                  {rating.toFixed(1)}
                  {tour.review_count ? (
                    <span className="text-[var(--text-muted)]">({tour.review_count} отзывов)</span>
                  ) : null}
                </span>
              )}
              {durationLabel && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {durationLabel}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                до {tour.max_participants} чел.
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {tour.location_name ?? locationLabel}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-xs font-semibold uppercase tracking-wider bg-[var(--accent)]/15 text-[var(--accent)] px-3 py-1 rounded-full">
                {activityLabel}
              </span>
              {diffBadge && (
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: `color-mix(in srgb, ${diffBadge.color} 15%, transparent)`, color: diffBadge.color }}
                >
                  {diffBadge.label}
                </span>
              )}
              {seasonLabel && (
                <span className="text-xs font-medium px-3 py-1 rounded-full border border-[var(--border)] text-[var(--text-secondary)]">
                  <Calendar className="w-3 h-3 inline mr-1 -mt-0.5" />
                  {seasonLabel}
                </span>
              )}
              {tour.weather_dependent && (
                <span className="text-xs font-medium px-3 py-1 rounded-full border border-[var(--warning)]/40 text-[var(--warning)]">
                  Зависит от погоды
                </span>
              )}
            </div>
          </div>

          {/* Separator */}
          <hr className="border-[var(--border)]" />

          {/* Operator line */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/15 flex items-center justify-center">
              <span className="text-sm font-bold text-[var(--accent)]">
                {tour.operator_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {tour.operator_name}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Реальный оператор, который проводит этот тур</p>
            </div>
          </div>

          {/* Separator */}
          <hr className="border-[var(--border)]" />

          {/* Short description (hook) */}
          {tour.short_description && (
            <p className="text-lg text-[var(--text-primary)] leading-relaxed font-medium">
              {tour.short_description}
            </p>
          )}

          {/* Full description */}
          {tour.description && (
            <div>
              <h2 className="ds-h2 mb-3">О туре</h2>
              <DescriptionWithFishLinks
                paragraphs={tour.description.split('\n').filter(p => p.trim())}
                className="text-[var(--text-secondary)] leading-relaxed space-y-2"
              />
            </div>
          )}

          {/* Separator */}
          <hr className="border-[var(--border)]" />

          {/* Included / Not Included — Tripster-style checklist */}
          {(included.length > 0 || notIncluded.length > 0) && (
            <div>
              <h2 className="ds-h2 mb-5">Что включено</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {included.map(item => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0 mt-0.5" />
                    <span className="text-sm text-[var(--text-primary)]">{item}</span>
                  </div>
                ))}
                {notIncluded.map(item => (
                  <div key={item} className="flex items-start gap-2.5">
                    <XCircle className="w-5 h-5 text-[var(--text-muted)] shrink-0 mt-0.5" />
                    <span className="text-sm text-[var(--text-muted)]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What to Bring */}
          {whatToBring.length > 0 && (
            <>
              <hr className="border-[var(--border)]" />
              <div>
                <h2 className="ds-h2 mb-4 flex items-center gap-2">
                  <Backpack className="w-5 h-5 text-[var(--ocean)]" />
                  Что взять с собой
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {whatToBring.map(item => (
                    <div key={item} className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--ocean)] shrink-0" />
                      <span className="text-sm text-[var(--text-secondary)]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Important Info */}
          <hr className="border-[var(--border)]" />
          <div>
            <h2 className="ds-h2 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--success)]" />
              Важная информация
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { text: 'Условия и детали подтверждаются оператором до оплаты', icon: true },
                { text: 'Статус заявки обычно подтверждается оператором в течение 2 часов', icon: true },
                { text: 'Маршрут проходит через контур безопасности платформы', icon: true },
                { text: `Группа: ${tour.min_participants ?? 1}–${tour.max_participants} чел.`, icon: true },
              ].map(item => (
                <div key={item.text} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0 mt-0.5" />
                  <span className="text-sm text-[var(--text-secondary)]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Предупреждения по безопасности маршрута ─── */}
          <hr className="border-[var(--border)]" />
          <SafetyWarnings tourId={tour.id} />

          {/* Reviews */}
          {reviews.length > 0 && (
            <>
              <hr className="border-[var(--border)]" />
              <div>
                <h2 className="ds-h2 mb-6 flex items-center gap-2">
                  <Star className="w-5 h-5 text-[var(--warning)] fill-[var(--warning)]" />
                  Отзывы гостей
                  <span className="text-sm font-normal text-[var(--text-muted)]">({reviews.length})</span>
                </h2>
                <div className="space-y-5">
                  {reviews.map(r => (
                    <div key={r.id} className="pb-5 border-b border-[var(--border)] last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-[var(--accent)]">
                              {r.author_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{r.author_name}</p>
                            {r.author_city && (
                              <p className="text-xs text-[var(--text-muted)]">{r.author_city}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <Stars rating={r.rating} />
                          {r.trip_date && (
                            <p className="text-xs text-[var(--text-muted)] mt-1">{r.trip_date}</p>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* AI Kuzmich CTA */}
          <Link
            href={`/planner?hint=${encodeURIComponent(tour.activity_type)}`}
            className="flex items-center gap-4 p-5 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--text-primary)] text-sm">Собрать свой тур</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Если этот вариант не подходит, Кузьмич поможет честно подобрать другой
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--accent)] shrink-0" />
          </Link>
        </div>

        {/* ═══ Right Column: Sticky Booking Sidebar (4/12) ═══ */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 space-y-4">

            {/* Price card */}
            <div className="ds-card p-6">
              <div className="flex items-baseline gap-2 mb-1">
                {priceOld && priceOld > price && (
                  <span className="text-base text-[var(--text-muted)] line-through">
                    {formatPrice(priceOld)}
                  </span>
                )}
                <span className="text-3xl font-bold text-[var(--text-primary)]">
                  {formatPrice(price)}
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-5">{priceLabel}</p>

              <div className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-3">
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  Это реальное предложение оператора. Перед оплатой можно уточнить состав программы, даты, погоду и все условия участия.
                </p>
              </div>

              <a
                href="#booking-form"
                className="ds-btn ds-btn-primary w-full text-center py-3 text-base font-semibold"
              >
                Оставить заявку
              </a>

              {/* Quick trust signals */}
              <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2">
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Shield className="w-3.5 h-3.5 text-[var(--success)]" />
                  Без скрытых условий и серых комиссий
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />
                  Сначала уточнение деталей, потом подтверждение
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="ds-card p-4 space-y-3">
              {durationLabel && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)] flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Длительность
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">{durationLabel}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)] flex items-center gap-2">
                  <Users className="w-4 h-4" /> Группа
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {tour.min_participants && tour.min_participants !== tour.max_participants
                    ? `${tour.min_participants}–${tour.max_participants}`
                    : `до ${tour.max_participants}`
                  } чел.
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)] flex items-center gap-2">
                  <Mountain className="w-4 h-4" /> Локация
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {tour.location_name ?? locationLabel}
                </span>
              </div>
              {seasonLabel && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)] flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Сезон
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">{seasonLabel}</span>
                </div>
              )}
            </div>

            {/* Share / Favorite mini-bar */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.share) {
                    navigator.share({ title: tour.title, url: window.location.href });
                  }
                }}
                className="flex-1 ds-card flex items-center justify-center gap-2 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" /> Поделиться
              </button>
              <button
                onClick={handleWishlist}
                disabled={wishlistLoading}
                className="flex-1 ds-card flex items-center justify-center gap-2 py-2.5 text-sm transition-colors cursor-pointer disabled:opacity-50"
                style={wishlisted ? { color: 'var(--danger)' } : { color: 'var(--text-secondary)' }}
              >
                <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
                {wishlisted ? 'В избранном' : 'В избранное'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Booking Form (full width, below content) ─── */}
      <div id="booking-form" className="mt-12 max-w-xl mx-auto lg:mx-0">
        <BookingFormClient
          tourId={tour.id}
          basePrice={price}
          maxParticipants={tour.max_participants}
          tourTitle={tour.title}
        />
      </div>
    </div>
  );
}
