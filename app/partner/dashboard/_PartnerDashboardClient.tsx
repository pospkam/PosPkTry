'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, MapPin, CalendarDays, TrendingUp, Clock,
  CheckCircle, AlertCircle, Plus, RefreshCw, ShieldCheck,
  LogOut, Star, Users,
} from 'lucide-react';

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

const STATUS_LABELS: Record<string, { label: string; varName: string }> = {
  pending:   { label: 'Ожидает',      varName: 'warning' },
  confirmed: { label: 'Подтверждена', varName: 'accent' },
  completed: { label: 'Завершена',    varName: 'success' },
  cancelled: { label: 'Отменена',     varName: 'danger' },
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
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
          accent ? 'bg-[var(--accent)]/15' : 'bg-[var(--bg-primary)]'
        }`}>
          <Icon className={`w-4 h-4 ${accent ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
        </div>
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${accent ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>{value}</div>
      {sub && <div className="text-xs text-[var(--text-muted)] mt-1">{sub}</div>}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function PartnerDashboardClient() {
  return <DashboardContent />;
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
      const res = await fetch(`/api/partner/dashboard?period=${period}`);
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
      <div className="p-5 lg:p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-muted)]">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="p-5 lg:p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--danger)' }} />
          <p className="font-semibold text-[var(--text-primary)] mb-1">Ошибка загрузки</p>
          <p className="text-sm text-[var(--text-muted)] mb-6">{error}</p>
          <button
            onClick={load}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 text-sm rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors"
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
    <div className="p-5 lg:p-6 space-y-5">
      {/* Top bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-sm text-[var(--text-primary)] truncate">{partner.name}</span>
            <span className="hidden sm:inline ml-2 text-xs text-[var(--text-muted)]">Личный кабинет</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {partner.isVerified ? (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium"
              style={{ color: 'var(--success)', borderColor: 'color-mix(in srgb, var(--success) 30%, transparent)', background: 'color-mix(in srgb, var(--success) 10%, transparent)' }}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Верифицирован</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium"
              style={{ color: 'var(--warning)', borderColor: 'color-mix(in srgb, var(--warning) 30%, transparent)', background: 'color-mix(in srgb, var(--warning) 10%, transparent)' }}>
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">На верификации</span>
            </span>
          )}
          <button
            onClick={handleLogout}
            title="Выйти"
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-primary)] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Verification banner */}
      {!partner.isVerified && (
        <div className="flex items-start gap-3 p-4 rounded-lg border"
          style={{ borderColor: 'color-mix(in srgb, var(--warning) 30%, transparent)', background: 'color-mix(in srgb, var(--warning) 10%, transparent)' }}>
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--warning)' }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--warning)' }}>Аккаунт на верификации</p>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              Администратор рассматривает заявку. После одобрения будет доступна публикация контента.
            </p>
          </div>
        </div>
      )}

      {/* Section title + period */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-sm font-semibold text-[var(--text-primary)]">Обзор</h1>
        <div className="flex items-center gap-1">
          {[7, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                period === d
                  ? 'bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {d === 365 ? '1 год' : `${d}д`}
            </button>
          ))}
          <button onClick={load} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors ml-1">
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
      <div className="grid md:grid-cols-2 gap-4">
        {partner.reviewCount > 0 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4" style={{ color: 'var(--warning)' }} />
              <span className="text-xs text-[var(--text-muted)]">Рейтинг партнёра</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>{partner.rating.toFixed(1)}</span>
              <span className="text-[var(--text-muted)] text-sm">/ 5.0</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">{partner.reviewCount} отзывов</p>
          </div>
        )}

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <p className="text-xs text-[var(--text-muted)] mb-3">Быстрые действия</p>
          <div className="space-y-2">
            <Link
              href="/partner/tours/add"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors"
            >
              <Plus className="w-4 h-4" /> Добавить тур
            </Link>
            <Link
              href="/hub/operator"
              className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> Кабинет оператора
            </Link>
          </div>
        </div>
      </div>

      {/* Top Tours */}
      {topTours.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Топ туры</h2>
            <Link href="/hub/operator/tours" className="text-xs text-[var(--accent)] hover:opacity-80 transition-opacity">
              Управление →
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {topTours.map((t) => (
              <div key={t.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{t.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--text-muted)] flex-wrap">
                    <span>{t.bookingsCount} броней</span>
                    {t.avgRating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" style={{ color: 'var(--warning)' }} />
                        {t.avgRating.toFixed(1)}
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs border ${
                      t.isActive
                        ? 'text-[var(--success)] border-[var(--success)]/30 bg-[var(--success)]/10'
                        : 'border-[var(--border)] text-[var(--text-muted)]'
                    }`}>
                      {t.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)] shrink-0">{formatMoney(t.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Bookings */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Последние бронирования</h2>
          <Link href="/hub/operator/bookings" className="text-xs text-[var(--accent)] hover:opacity-80 transition-opacity">
            Все →
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-8 h-8 mx-auto mb-3 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">Бронирований пока нет</p>
            <p className="text-xs mt-1 text-[var(--text-muted)]">Они появятся после первой брони на ваши туры</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {recentBookings.map((b) => {
              const s = STATUS_LABELS[b.status] ?? { label: b.status, varName: 'text-muted' };
              return (
                <div key={b.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{b.tourName}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--text-muted)]">
                      <span>{b.touristName}</span>
                      <span>·</span>
                      <span>{b.guestsCount} чел.</span>
                      <span>·</span>
                      <span>{formatDate(b.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full border"
                      style={{
                        color: `var(--${s.varName})`,
                        borderColor: `color-mix(in srgb, var(--${s.varName}) 30%, transparent)`,
                        background: `color-mix(in srgb, var(--${s.varName}) 10%, transparent)`,
                      }}
                    >
                      {s.label}
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{formatMoney(b.totalPrice)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Success banner for verified */}
      {partner.isVerified && (
        <div className="flex items-center gap-3 p-4 rounded-lg border"
          style={{ borderColor: 'color-mix(in srgb, var(--success) 20%, transparent)', background: 'color-mix(in srgb, var(--success) 10%, transparent)' }}>
          <CheckCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--success)' }} />
          <p className="text-sm text-[var(--text-secondary)]">
            Аккаунт верифицирован — все функции платформы доступны.
          </p>
        </div>
      )}
    </div>
  );
}
