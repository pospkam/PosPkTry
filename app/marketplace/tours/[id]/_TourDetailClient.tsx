'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin, Clock, CheckCircle2, XCircle, Tag, Sparkles,
  ChevronRight, ChevronLeft, Users, Backpack, Shield,
  Calendar, Mountain, Star,
} from 'lucide-react';
import BookingFormClient from '@/components/marketplace/BookingFormClient';

/* ─── Labels ─── */

const ACTIVITY_LABELS: Record<string, string> = {
  trekking:   'Треккинг',
  fishing:    'Рыбалка',
  thermal:    'Термальные источники',
  helicopter: 'Вертолётные туры',
  boat_trip:  'Морские туры',
  bears:      'Наблюдение за медведями',
  rafting:    'Сплав',
  snowmobile: 'Снегоходные туры',
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

const DIFFICULTY_MAP: Record<string, { label: string; cls: string }> = {
  easy:   { label: 'Лёгкий', cls: 'bg-[var(--success)]/20 text-[var(--success)]' },
  medium: { label: 'Средний', cls: 'bg-[var(--warning)]/20 text-[var(--warning)]' },
  hard:   { label: 'Сложный', cls: 'bg-[var(--danger)]/20 text-[var(--danger)]' },
};

const PRICE_UNIT_LABELS: Record<string, string> = {
  per_person: 'за человека',
  per_tour: 'за группу',
  per_day_per_person: 'за человека / день',
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
  const s = new Date(start).getMonth();
  const e = new Date(end).getMonth();
  return `${months[s]} — ${months[e]}`;
}

/* ─── Photo Gallery ─── */

function PhotoGallery({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) return null;

  return (
    <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] rounded-lg overflow-hidden bg-[var(--bg-hover)]">
      <Image
        src={images[idx]}
        alt={`${alt} — фото ${idx + 1}`}
        fill
        priority={idx === 0}
        className="object-cover transition-opacity duration-300"
        sizes="(max-width: 768px) 100vw, 900px"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      {images.length > 1 && (
        <>
          <button
            onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors"
            aria-label="Предыдущее фото"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIdx(i => (i + 1) % images.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors"
            aria-label="Следующее фото"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === idx ? 'bg-white w-4' : 'bg-white/50'
                }`}
                aria-label={`Фото ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Feature List ─── */

function FeatureList({
  items,
  icon,
  iconCls,
}: {
  items: string[];
  icon: 'check' | 'x';
  iconCls: string;
}) {
  const Icon = icon === 'check' ? CheckCircle2 : XCircle;
  return (
    <ul className="space-y-2">
      {items.map(item => (
        <li key={item} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
          <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconCls}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ─── Main Component ─── */

export default function TourDetailClient({ tour }: { tour: TourFull | null }) {
  if (!tour) {
    return (
      <div className="ds-page text-center py-24">
        <p className="text-[var(--text-muted)] mb-4">Тур не найден</p>
        <Link href="/marketplace" className="text-[var(--ocean)] hover:underline">
          Вернуться в каталог
        </Link>
      </div>
    );
  }

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
    ...(tour.tour_image ? [tour.tour_image] : []),
    ...(tour.photos ?? []),
  ];

  const included = Array.isArray(tour.included) ? tour.included : [];
  const notIncluded = Array.isArray(tour.not_included) ? tour.not_included : [];
  const whatToBring = Array.isArray(tour.what_to_bring) ? tour.what_to_bring : [];

  return (
    <div className="ds-page pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
        <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">Главная</Link>
        <span>/</span>
        <Link href="/marketplace" className="hover:text-[var(--text-primary)] transition-colors">Туры</Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)] truncate max-w-[200px]">{tour.title}</span>
      </nav>

      {/* ─── Hero: Gallery + Title ─── */}
      <div className="mb-8">
        {allPhotos.length > 0 ? (
          <PhotoGallery images={allPhotos} alt={tour.title} />
        ) : (
          <div className="w-full aspect-[16/9] sm:aspect-[2/1] rounded-lg bg-[var(--bg-hover)] flex items-center justify-center">
            <MapPin className="w-16 h-16 text-[var(--text-muted)]" />
          </div>
        )}
      </div>

      {/* ─── Title + Badges ─── */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[#0D1117] px-3 py-1 rounded-full">
            {activityLabel}
          </span>
          {diffBadge && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${diffBadge.cls}`}>
              {diffBadge.label}
            </span>
          )}
          {seasonLabel && (
            <span className="text-xs font-medium px-3 py-1 rounded-full border border-[var(--border)] text-[var(--text-secondary)]">
              <Calendar className="w-3 h-3 inline mr-1" />
              {seasonLabel}
            </span>
          )}
          {tour.weather_dependent && (
            <span className="text-xs font-medium px-3 py-1 rounded-full border border-[var(--warning)]/30 text-[var(--warning)]">
              Зависит от погоды
            </span>
          )}
        </div>

        <h1
          className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] leading-tight mb-2"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          {tour.title}
        </h1>

        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
          <span>{tour.operator_name}</span>
          {rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-[var(--warning)] fill-[var(--warning)]" />
              {rating.toFixed(1)}
              {tour.review_count ? ` (${tour.review_count})` : ''}
            </span>
          )}
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {tour.location_name ?? locationLabel}
          </span>
        </div>
      </div>

      {/* ─── Price Block ─── */}
      <div className="flex items-baseline gap-3 mb-8 pb-6 border-b border-[var(--border)]">
        <span className="text-xs text-[var(--text-muted)]">от</span>
        {priceOld && priceOld > price && (
          <span className="text-lg text-[var(--text-muted)] line-through">
            {priceOld.toLocaleString('ru-RU')} ₽
          </span>
        )}
        <span className="text-3xl font-bold text-[var(--accent)]">
          {price.toLocaleString('ru-RU')} ₽
        </span>
        <span className="text-sm text-[var(--text-muted)]">{priceLabel}</span>
      </div>

      {/* ─── Main Grid: Content + Booking Sidebar ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Content */}
        <div className="lg:col-span-2 space-y-8">

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {durationLabel && (
              <div className="ds-card p-4 text-center">
                <Clock className="w-5 h-5 text-[var(--ocean)] mx-auto mb-2" />
                <p className="text-xs text-[var(--text-muted)] mb-1">Длительность</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{durationLabel}</p>
              </div>
            )}
            <div className="ds-card p-4 text-center">
              <Users className="w-5 h-5 text-[var(--ocean)] mx-auto mb-2" />
              <p className="text-xs text-[var(--text-muted)] mb-1">Группа</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {tour.min_participants && tour.min_participants !== tour.max_participants
                  ? `${tour.min_participants}–${tour.max_participants}`
                  : `до ${tour.max_participants}`
                } чел.
              </p>
            </div>
            <div className="ds-card p-4 text-center">
              <Mountain className="w-5 h-5 text-[var(--ocean)] mx-auto mb-2" />
              <p className="text-xs text-[var(--text-muted)] mb-1">Локация</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">{locationLabel}</p>
            </div>
            <div className="ds-card p-4 text-center">
              <Tag className="w-5 h-5 text-[var(--ocean)] mx-auto mb-2" />
              <p className="text-xs text-[var(--text-muted)] mb-1">Тип</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">{activityLabel}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="ds-h2 mb-4">Описание</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              {tour.description || 'Описание уточняется у оператора.'}
            </p>
          </div>

          {/* Included / Not Included */}
          {(included.length > 0 || notIncluded.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {included.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                    Включено в стоимость
                  </h3>
                  <FeatureList items={included} icon="check" iconCls="text-[var(--success)]" />
                </div>
              )}
              {notIncluded.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-[var(--text-muted)]" />
                    Не включено
                  </h3>
                  <FeatureList items={notIncluded} icon="x" iconCls="text-[var(--text-muted)]" />
                </div>
              )}
            </div>
          )}

          {/* What to Bring */}
          {whatToBring.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Backpack className="w-4 h-4 text-[var(--ocean)]" />
                Что взять с собой
              </h3>
              <div className="flex flex-wrap gap-2">
                {whatToBring.map(item => (
                  <span
                    key={item}
                    className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] bg-[var(--bg-hover)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Important Info */}
          <div className="bg-[var(--bg-hover)] rounded-lg p-6">
            <h3 className="font-semibold text-[var(--text-primary)] mb-3 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--success)]" />
              Важная информация
            </h3>
            <ul className="space-y-2">
              {[
                'Оператор свяжется с вами в течение часа после бронирования',
                'Все туры включены в страховку безопасности',
                'Возврат средств возможен за 48 часов до даты тура',
                `Участники: ${tour.min_participants ?? 1}–${tour.max_participants} человек`,
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <CheckCircle2 className="w-4 h-4 text-[var(--success)] flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Booking Sidebar */}
        <div className="space-y-4">
          <div id="booking" className="sticky top-20">
            <BookingFormClient
              tourId={tour.id}
              basePrice={price}
              maxParticipants={tour.max_participants}
              tourTitle={tour.title}
            />
          </div>
        </div>
      </div>

      {/* AI Kuzmich CTA */}
      <div className="mt-10">
        <Link
          href={`/planner?hint=${encodeURIComponent(tour.activity_type)}`}
          className="flex items-center gap-4 p-5 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 transition-colors"
        >
          <div className="w-11 h-11 rounded-full bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--text-primary)] text-sm">Собрать свой тур с Кузьмичом</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Хотите комбо из нескольких активностей? Расскажите о поездке — подберём программу под вас
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--accent)] shrink-0" />
        </Link>
      </div>
    </div>
  );
}
