'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass, Calendar, TrendingUp, Award, MapPin,
  Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets,
  ChevronRight, RefreshCw, Target, Star,
} from 'lucide-react';
import Link from 'next/link';
import { Weather } from '@/types';
import RecommendationCard, { RecommendationCardSkeleton } from '@/components/tourist/RecommendationCard';
import type { RecommendedTour } from '@/lib/recommendations/engine';

interface TouristStats {
  overview: Record<string, unknown>;
  profile_summary: {
    loyalty_tier: string;
    loyalty_points: number;
    total_trips: number;
    total_spent: number;
    average_rating: number;
    member_since: string;
  };
  trips_timeline: Array<{ month: string; trips_count: number; total_spent: number }>;
  category_stats: Array<{ trip_type: string; count: number; avg_spent: number }>;
  recent_reviews: Array<{ id: string; tour_name: string; rating: number; comment: string; created_at: string }>;
  upcoming_trips: Array<{ id: string; title: string; status: string; start_date: string }>;
}

interface MyBooking {
  id: string;
  date: string;
  participants: number;
  totalPrice: number;
  status: string;
  tour: { id: string; name: string; difficulty: string; duration: number; images: string[] };
}

function fmtRub(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ₽`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K ₽`;
  return `${new Intl.NumberFormat('ru-RU').format(v)} ₽`;
}

const TIER_LABELS: Record<string, string> = {
  bronze: 'Бронза', silver: 'Серебро', gold: 'Золото', platinum: 'Платина',
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Ожидает', cls: 'bg-[var(--warning)]/10 text-[var(--warning)]' },
  confirmed: { label: 'Подтверждён', cls: 'bg-[var(--success)]/10 text-[var(--success)]' },
  completed: { label: 'Завершён', cls: 'bg-[var(--text-muted)]/10 text-[var(--text-muted)]' },
  cancelled: { label: 'Отменён', cls: 'bg-[var(--danger)]/10 text-[var(--danger)]' },
};

function WeatherIcon({ condition, className }: { condition: string; className?: string }) {
  const c = className ?? 'w-5 h-5';
  const map: Record<string, React.ReactNode> = {
    clear: <Sun className={c} />, mostly_clear: <Sun className={c} />,
    partly_cloudy: <Cloud className={c} />, overcast: <Cloud className={c} />,
    rain: <CloudRain className={c} />, snow: <CloudSnow className={c} />,
  };
  return <>{map[condition] ?? <Cloud className={c} />}</>;
}

export default function TouristDashboardClient() {
  const [stats, setStats] = useState<TouristStats | null>(null);
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [recsLoading, setRecsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [statsRes, bookingsRes, weatherRes] = await Promise.allSettled([
      fetch('/api/tourist/stats'),
      fetch('/api/bookings/my'),
      fetch('/api/weather?lat=53.0375&lng=158.6556&location=Петропавловск-Камчатский'),
    ]);

    if (statsRes.status === 'fulfilled') {
      const d = await statsRes.value.json();
      if (d.success) setStats(d.data);
    }
    if (bookingsRes.status === 'fulfilled') {
      const d = await bookingsRes.value.json();
      if (d.success) setBookings(d.data?.bookings?.slice(0, 5) ?? []);
    }
    if (weatherRes.status === 'fulfilled') {
      const d = await weatherRes.value.json();
      if (d.success) setWeather(d.data);
    }
    setLoading(false);
  }, []);

  const fetchRecs = useCallback(async () => {
    setRecsLoading(true);
    try {
      const res = await fetch('/api/tourist/recommendations?limit=6');
      const d = await res.json();
      if (d.success) setRecommendations(d.data);
    } catch { /* ignore */ }
    setRecsLoading(false);
  }, []);

  useEffect(() => { fetchAll(); fetchRecs(); }, [fetchAll, fetchRecs]);

  const ps = stats?.profile_summary;

  const kpis = ps ? [
    { label: 'Поездок', value: String(ps.total_trips), icon: MapPin },
    { label: 'Потрачено', value: fmtRub(ps.total_spent), icon: TrendingUp },
    { label: 'Баллы', value: new Intl.NumberFormat('ru-RU').format(ps.loyalty_points), icon: Award },
    { label: 'Уровень', value: TIER_LABELS[ps.loyalty_tier] ?? ps.loyalty_tier, icon: Compass },
  ] : [];

  if (loading) {
    return (
      <div className="max-w-5xl lg:max-w-6xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="inline-block w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl lg:max-w-6xl mx-auto px-4 py-6 lg:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Обзор
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Ваш личный кабинет туриста</p>
        </div>
        <div className="flex items-center gap-3">
          {weather && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
              <WeatherIcon condition={weather.condition} className="w-5 h-5 text-[var(--accent)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">{weather.temperature}°C</span>
              <span className="ds-label hidden sm:inline">{weather.location}</span>
            </div>
          )}
          <button
            onClick={fetchAll}
            className="ds-btn flex items-center gap-1.5 px-3 py-2 text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Обновить
          </button>
        </div>
      </div>

      {/* KPIs */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-[var(--bg-card)] border border-[var(--border)] border-l-4 border-l-[var(--accent)] rounded-lg px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-[var(--accent)]" />
                  <p className="ds-label">{kpi.label}</p>
                </div>
                <span className="text-2xl font-bold text-[var(--text-primary)] font-playfair leading-none">{kpi.value}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Weather details */}
      {weather && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Погода на Камчатке</h2>
            <span className={`ds-label px-2.5 py-1 rounded-lg ${
              weather.safetyLevel === 'excellent' || weather.safetyLevel === 'good'
                ? 'bg-[var(--success)]/10 text-[var(--success)]'
                : weather.safetyLevel === 'difficult'
                  ? 'bg-[var(--warning)]/10 text-[var(--warning)]'
                  : 'bg-[var(--danger)]/10 text-[var(--danger)]'
            }`}>
              {weather.safetyLevel === 'excellent' ? 'Отлично' : weather.safetyLevel === 'good' ? 'Хорошо' : weather.safetyLevel === 'difficult' ? 'Сложно' : 'Опасно'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <WeatherIcon condition={weather.condition} className="w-8 h-8 text-[var(--accent)] mx-auto mb-2" />
              <p className="text-3xl font-bold text-[var(--text-primary)] font-playfair">{weather.temperature}°C</p>
              <p className="ds-label mt-1">Температура</p>
            </div>
            <div>
              <Wind className="w-6 h-6 text-[var(--text-secondary)] mx-auto mb-2" />
              <p className="text-xl font-semibold text-[var(--text-primary)]">{weather.windSpeed}</p>
              <p className="ds-label mt-1">Ветер, км/ч</p>
            </div>
            <div>
              <Droplets className="w-6 h-6 text-[var(--text-secondary)] mx-auto mb-2" />
              <p className="text-xl font-semibold text-[var(--text-primary)]">{weather.humidity}%</p>
              <p className="ds-label mt-1">Влажность</p>
            </div>
            <div>
              <Sun className="w-6 h-6 text-[var(--text-secondary)] mx-auto mb-2" />
              <p className="text-xl font-semibold text-[var(--text-primary)]">{weather.visibility}</p>
              <p className="ds-label mt-1">Видимость, км</p>
            </div>
          </div>
          {weather.recommendations && weather.recommendations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              {weather.recommendations.slice(0, 2).map((rec) => (
                <p key={rec} className="text-sm text-[var(--text-secondary)] leading-relaxed">{rec}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My bookings */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Мои бронирования</h2>
          <Link href="/hub/tourist/bookings" className="flex items-center gap-1 text-sm text-[var(--accent)] hover:underline font-medium">
            Все <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {bookings.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Calendar className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)] mb-2">Бронирований пока нет</p>
            <Link href="/marketplace" className="text-sm text-[var(--accent)] hover:underline font-medium">
              Найти тур
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {bookings.map(b => {
              const st = STATUS_LABELS[b.status] ?? STATUS_LABELS.pending;
              return (
                <Link key={b.id} href="/hub/tourist/bookings" className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--bg-hover)] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{b.tour.name}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {new Date(b.date).toLocaleDateString('ru-RU')} · {b.participants} чел.
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-lg ${st.cls}`}>{st.label}</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{fmtRub(b.totalPrice)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming trips */}
      {stats?.upcoming_trips && stats.upcoming_trips.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Ближайшие поездки</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {stats.upcoming_trips.map(trip => (
              <div key={trip.id} className="flex items-center gap-3 px-5 py-3.5">
                <MapPin className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span className="text-sm text-[var(--text-primary)] flex-1 truncate">{trip.title}</span>
                <span className="ds-label">
                  {new Date(trip.start_date).toLocaleDateString('ru-RU')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Рекомендуем вам</h2>
          </div>
          <Link href="/marketplace" className="text-sm text-[var(--accent)] hover:underline font-medium">
            Все туры →
          </Link>
        </div>
        {recsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <RecommendationCardSkeleton key={i} />
            ))}
          </div>
        ) : recommendations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.slice(0, 3).map(tour => (
              <RecommendationCard key={tour.id} tour={tour} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)] py-8 text-center">Рекомендации появятся после первого бронирования</p>
        )}
      </div>

      {/* Recent reviews */}
      {stats?.recent_reviews && stats.recent_reviews.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Мои отзывы</h2>
            <Link href="/hub/tourist/reviews" className="flex items-center gap-1 text-sm text-[var(--accent)] hover:underline font-medium">
              Все <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {stats.recent_reviews.slice(0, 3).map(review => (
              <div key={review.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{review.tour_name}</span>
                  <span className="flex gap-0.5 text-[var(--warning)]">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} size={12} fill="currentColor" strokeWidth={0} />
                    ))}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-xs text-[var(--text-muted)] truncate">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
