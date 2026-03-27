'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Clock, CheckCircle2, Tag, Sparkles, ChevronRight } from 'lucide-react';
import BookingFormClient from '@/components/marketplace/BookingFormClient';

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

function formatDuration(hours: number | null): string | null {
  if (!hours) return null;
  if (hours < 24) return `${hours} ч`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
}

interface TourDetail {
  id: number;
  title: string;
  description: string | null;
  base_price: string;
  activity_type: string;
  location_type: string;
  location: string | null;
  tour_image: string | null;
  operator_name: string;
  max_participants: number;
  duration_hours: number | null;
}

interface Props {
  initialTour: TourDetail | null;
}

const INFO_ITEMS = [
  'Оператор свяжется с вами в течение часа после бронирования',
  'Все туры включены в страховку безопасности',
  'Возврат средств возможен за 48 часов до даты тура',
  'Минимальное количество участников: 1 человек',
];

export default function TourDetailClient({ initialTour }: Props) {
  if (!initialTour) {
    return (
      <div className="ds-page text-center py-24">
        <p className="text-[var(--text-muted)] mb-4">Тур не найден</p>
        <Link href="/marketplace" className="text-[var(--ocean)] hover:underline">
          ← Вернуться в каталог
        </Link>
      </div>
    );
  }

  const tour = initialTour;
  const price = parseFloat(tour.base_price);
  const activityLabel = ACTIVITY_LABELS[tour.activity_type] ?? tour.activity_type;
  const locationLabel = LOCATION_LABELS[tour.location_type] ?? tour.location_type;
  const durationLabel = formatDuration(tour.duration_hours);

  return (
    <div className="ds-page pb-20">
      {/* Breadcrumb */}
      <Link href="/marketplace" className="text-[var(--ocean)] hover:underline text-sm mb-6 inline-block">
        ← Назад в каталог
      </Link>

      {/* Hero Image */}
      <div className="relative w-full h-64 sm:h-[420px] rounded-xl overflow-hidden mb-8 shadow-lg">
        {tour.tour_image ? (
          <Image
            src={tour.tour_image}
            alt={tour.title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1200px"
          />
        ) : (
          <div className="w-full h-full bg-[var(--bg-hover)] flex items-center justify-center">
            <MapPin className="w-16 h-16 text-[var(--text-muted)]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[#fff] px-3 py-1 rounded-full mb-2">
              {activityLabel}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#fff] leading-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
              {tour.title}
            </h1>
          </div>
          {durationLabel && (
            <div className="bg-[var(--bg-card)]/90 rounded-lg px-3 py-2 text-right shrink-0 ml-4">
              <p className="text-xs text-[var(--text-muted)]">Длительность</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">{durationLabel}</p>
            </div>
          )}
        </div>
      </div>

      {/* Оператор + цена */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <p className="text-[var(--text-secondary)] text-sm">
          Оператор:{' '}
          <span className="font-semibold text-[var(--text-primary)]">{tour.operator_name}</span>
        </p>
        <div className="text-right shrink-0">
          <p className="text-xs text-[var(--text-muted)]">от</p>
          <p className="text-2xl font-bold text-[var(--accent)]">
            {price.toLocaleString('ru-RU')} ₽
          </p>
          <p className="text-xs text-[var(--text-muted)]">за человека</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="ds-card p-6">
            <h2 className="ds-h2 mb-4">Описание</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              {tour.description || 'Описание уточняется у оператора.'}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="ds-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-[var(--ocean)] flex-shrink-0" />
                <span className="text-xs text-[var(--text-muted)]">Тип локации</span>
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{locationLabel}</p>
            </div>

            <div className="ds-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-[var(--ocean)] flex-shrink-0" />
                <span className="text-xs text-[var(--text-muted)]">Активность</span>
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{activityLabel}</p>
            </div>

            {durationLabel && (
              <div className="ds-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[var(--ocean)] flex-shrink-0" />
                  <span className="text-xs text-[var(--text-muted)]">Длительность</span>
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{durationLabel}</p>
              </div>
            )}

            <div className="ds-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-[var(--ocean)] flex-shrink-0" />
                <span className="text-xs text-[var(--text-muted)]">Место</span>
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{tour.location || 'Камчатка'}</p>
            </div>
          </div>
        </div>

        {/* Booking Sidebar */}
        <div id="booking" className="sticky top-4">
          <BookingFormClient
            tourId={tour.id}
            basePrice={price}
            maxParticipants={tour.max_participants}
            tourTitle={tour.title}
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-[var(--bg-hover)] rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-[var(--text-primary)] mb-3 text-sm">Важная информация</h3>
        <ul className="space-y-2">
          {INFO_ITEMS.map(item => (
            <li key={item} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <CheckCircle2 className="w-4 h-4 text-[var(--success)] flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* AI Кузьмич — похожие туры */}
      <Link
        href={`/planner?hint=${encodeURIComponent(tour.activity_type)}`}
        className="flex items-center gap-4 p-5 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 transition-colors"
      >
        <div className="w-11 h-11 rounded-full bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--text-primary)] text-sm">Кузьмич поможет собрать идеальный тур</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Хотите комбо из нескольких активностей? Расскажите Кузьмичу о поездке — он предложит программу под вас
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--accent)] shrink-0" />
      </Link>
    </div>
  );
}
