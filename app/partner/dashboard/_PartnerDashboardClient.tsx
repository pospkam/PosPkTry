'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, MapPin, CalendarDays, TrendingUp, Clock,
  CheckCircle, AlertCircle, Plus, RefreshCw, ShieldCheck,
  LogOut, Star, Users,
} from 'lucide-react';
import { Protected } from '@/components/auth/Protected';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PartnerInfo {
  id: string; name: string; isVerified: boolean;
  rating: number; reviewCount: number; email: string; category: string;
}

interface Metrics {
  totalTours: number; activeTours: number;
  totalBookings: number; periodBookings: number;
  totalRevenue: number; periodRevenue: number;
  pendingBookings: number;
}

interface Booking {
  id: string; tourName: string; touristName: string; touristEmail: string;
  status: string; totalPrice: number; guestsCount: number;
  startDate: string; createdAt: string;
}

interface Tour {
  id: string; name: string; price: number; isActive: boolean;
  bookingsCount: number; revenue: number; avgRating: number; reviewsCount: number;
}

interface DashboardData {
  partner: PartnerInfo; metrics: Metrics;
  recentBookings: Booking[]; topTours: Tour[]; period: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Ожидает',      cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  confirmed: { label: 'Подтверждена', cls: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  completed: { label: 'Завершена',    cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  cancelled: { label: 'Отменена',     cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

function formatMoney(v: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, sub, accent = false }: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 border backdrop-blur-xl ${
      accent ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-white/10'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          accent ? 'bg-cyan-500/20' : 'bg-white/10'
        }`}>
          <Icon className={`w-5 h-5 ${accent ? 'text-cyan-400' : 'text-white/70'}`} />
        </div>
        <span className="text-sm text-white/60">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${accent ? 'text-cyan-400' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
    </div>
  );
}

// ─── Main export (wraps with Protected) ───────────────────────────────────────

export default function PartnerDashboardClient() {
  return (
    <Protected roles={['operator', 'admin']}>
      <DashboardContent />
    </Protected>
  );
}

// ─── Dashboard content ────────────────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token =
        localStorage.getItem('token') ??
        localStorage.getItem('admin_token') ?? '';
      const res = await fetch(`/api/partner/dashboard?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: { success: boolean; data?: DashboardData; error?: string } = await res.json();
      if (!json.success || !json.data) throw new Error(json.error ?? 'Ошибка загрузки');
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = () => {
    ['token', 'admin_token', 'admin_email', 'user_roles'].forEach((k) =>
      localStorage.removeItem(k)
    );
    router.push('/');
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="text-white font-semibold mb-1">Ошибка загрузки</p>
          <p className="text-white/50 text-sm mb-6">{error}</p>
          <button
            onClick={load}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-400 hover:bg-cyan-500/30 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Повторить
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { partner, metrics, recentBookings, topTours } = data;

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-gray-950/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-white truncate">{partner.name}</span>
              <span className="hidden sm:inline ml-2 text-xs text-white/35">Личный кабинет</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {partner.isVerified ? (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-500/15 border border-green-500/30 rounded-full text-green-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Верифицирован</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-yellow-500/15 border border-yellow-500/30 rounded-full text-yellow-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">На верификации</span>
              </span>
            )}
            <button
              onClick={handleLogout}
              title="Выйти"
              className="p-2 text-white/35 hover:text-white/70 rounded-lg hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Verification banner */}
        {!partner.isVerified && (
          <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-yellow-400 text-sm">Аккаунт на верификации</p>
              <p className="text-sm text-white/55 mt-0.5">
                Администратор рассматривает заявку. После одобрения будет доступна публикация контента.
              </p>
            </div>
          </div>
        )}

        {/* Section title + period */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold">Обзор</h1>
          <div className="flex items-center gap-1.5">
            {[7, 30, 90, 365].map((d) => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === d
                    ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400'
                    : 'bg-white/5 border border-white/10 text-white/45 hover:text-white/75'
                }`}
              >
                {d === 365 ? '1 год' : `${d}д`}
              </button>
            ))}
            <button onClick={load} className="p-1.5 text-white/35 hover:text-white/70 transition-colors ml-1">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard icon={MapPin}       label="Туры"             value={String(metrics.totalTours)}
            sub={`${metrics.activeTours} активных`} />
          <MetricCard icon={CalendarDays} label={`Брони за ${period}д`} value={String(metrics.periodBookings)}
            sub={`${metrics.totalBookings} всего`} accent />
          <MetricCard icon={TrendingUp}   label={`Выручка за ${period}д`} value={formatMoney(metrics.periodRevenue)}
            sub={`${formatMoney(metrics.totalRevenue)} всего`} />
          <MetricCard icon={Clock}        label="Ожидают ответа"  value={String(metrics.pendingBookings)}
            sub={metrics.pendingBookings > 0 ? 'Требуют действий' : 'Всё обработано'} />
        </div>

        {/* Rating + Quick actions */}
        <div className="grid md:grid-cols-2 gap-5">
          {partner.reviewCount > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-white/55">Рейтинг партнёра</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber-400">{partner.rating.toFixed(1)}</span>
                <span className="text-white/35 text-sm">/ 5.0</span>
              </div>
              <p className="text-xs text-white/35 mt-1">{partner.reviewCount} отзывов</p>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-sm text-white/55 mb-3">Быстрые действия</p>
            <div className="space-y-2">
              <Link
                href="/partner/tours/add"
                className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/15 border border-cyan-500/30 rounded-xl text-cyan-400 hover:bg-cyan-500/25 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Добавить тур
              </Link>
              <Link
                href="/hub/operator"
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:bg-white/10 transition-colors text-sm"
              >
                <LayoutDashboard className="w-4 h-4" /> Кабинет оператора
              </Link>
            </div>
          </div>
        </div>

        {/* Top Tours */}
        {topTours.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-semibold text-white text-sm">Топ туры</h2>
              <Link href="/hub/operator/tours" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                Управление →
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {topTours.map((t) => (
                <div key={t.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40 flex-wrap">
                      <span>{t.bookingsCount} броней</span>
                      {t.avgRating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400" />
                          {t.avgRating.toFixed(1)}
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                        t.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/35'
                      }`}>
                        {t.isActive ? 'Активен' : 'Неактивен'}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white shrink-0">{formatMoney(t.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Bookings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-white text-sm">Последние бронирования</h2>
            <Link href="/hub/operator/bookings" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              Все →
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className="py-12 text-center text-white/35">
              <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Бронирований пока нет</p>
              <p className="text-xs mt-1 text-white/25">Они появятся после первой брони на ваши туры</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentBookings.map((b) => {
                const s = STATUS_LABELS[b.status] ?? {
                  label: b.status,
                  cls: 'bg-white/10 text-white/50 border-white/10',
                };
                return (
                  <div key={b.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{b.tourName}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-white/40">
                        <span>{b.touristName}</span>
                        <span>·</span>
                        <span>{b.guestsCount} чел.</span>
                        <span>·</span>
                        <span>{formatDate(b.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full border ${s.cls}`}>{s.label}</span>
                      <span className="text-sm font-semibold text-white">{formatMoney(b.totalPrice)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Success banner for verified */}
        {partner.isVerified && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            <p className="text-sm text-white/65">
              Аккаунт верифицирован — все функции платформы доступны.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
