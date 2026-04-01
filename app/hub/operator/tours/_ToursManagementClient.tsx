'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus, Upload, Mountain, Star, Users, Clock,
  Eye, EyeOff, Trash2, Edit2, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tour {
  id: string;
  title: string;
  activity_type: string | null;
  location_name: string | null;
  base_price: string | null;
  max_participants: number | null;
  duration_hours: number | null;
  difficulty: string | null;
  is_active: boolean;
  is_published: boolean;
  tour_image: string | null;
  photos: string[] | null;
  rating: string | null;
  review_count: number;
  total_bookings: string;
  total_revenue: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RUB = (v: string | number | null) =>
  v == null ? '—' : Number(v).toLocaleString('ru-RU') + ' ₽';

const DIFFICULTY: Record<string, string> = {
  easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный',
  extreme: 'Экстрим', beginner: 'Новичок',
};

const LIMIT = 20;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ToursManagementClient() {
  const [tours, setTours]     = useState<Tour[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String((page - 1) * LIMIT),
      });
      const res = await fetch(`/api/hub/operator/tours?${params}`);
      const data = await res.json() as { success: boolean; data: Tour[]; pagination: { total: number } };
      if (data.success) {
        setTours(data.data);
        setTotal(data.pagination.total);
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  async function handleToggleActive(id: string, current: boolean) {
    setToggling(id);
    try {
      await fetch(`/api/hub/operator/tours/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current }),
      });
      await load();
    } finally { setToggling(null); }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Удалить тур «${title}»? Это действие нельзя отменить.`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/hub/operator/tours/${id}`, { method: 'DELETE' });
      await load();
    } finally { setDeleting(null); }
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Мои туры</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Всего: {total}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="ds-btn flex items-center gap-1.5 text-sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/hub/operator/tours/import"
            className="ds-btn flex items-center gap-1.5 text-sm"
          >
            <Upload className="w-4 h-4" />
            Импорт CSV
          </Link>
          <Link
            href="/hub/operator/tours/new"
            className="ds-btn ds-btn-primary flex items-center gap-1.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            Создать тур
          </Link>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--border)] border-t-[var(--accent)]" />
        </div>
      ) : tours.length === 0 ? (
        <div className="ds-card p-12 text-center">
          <Mountain className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Туров пока нет</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Создайте первый тур или импортируйте из CSV
          </p>
          <Link href="/hub/operator/tours/new" className="ds-btn ds-btn-primary text-sm inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Создать тур
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tours.map(tour => {
            const img = tour.tour_image ?? tour.photos?.[0] ?? null;
            const isToggling = toggling === tour.id;
            const isDeleting = deleting === tour.id;
            return (
              <div
                key={tour.id}
                className="ds-card p-4 flex gap-4 items-start"
                style={!tour.is_active ? { opacity: 0.65 } : {}}
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-[var(--bg-hover)] flex items-center justify-center">
                  {img ? (
                    <Image src={img} alt={tour.title} width={64} height={64} className="w-full h-full object-cover" />
                  ) : (
                    <Mountain className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <Link
                        href={`/hub/operator/tours/${tour.id}`}
                        className="font-semibold text-sm hover:underline"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {tour.title}
                      </Link>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {tour.activity_type && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                            {tour.activity_type}
                          </span>
                        )}
                        {tour.difficulty && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {DIFFICULTY[tour.difficulty] ?? tour.difficulty}
                          </span>
                        )}
                        {tour.location_name && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {tour.location_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                      style={tour.is_active ? {
                        background: 'var(--success)/12', color: 'var(--success)',
                      } : {
                        background: 'var(--text-muted)/12', color: 'var(--text-muted)',
                      }}
                    >
                      {tour.is_active ? 'Активен' : 'Скрыт'}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-4 mt-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {RUB(tour.base_price)}
                    </span>
                    {tour.duration_hours && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {tour.duration_hours}ч
                      </span>
                    )}
                    {tour.max_participants && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        до {tour.max_participants}
                      </span>
                    )}
                    {Number(tour.rating) > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" style={{ color: 'var(--warning)', fill: 'var(--warning)' }} />
                        {Number(tour.rating).toFixed(1)}
                        <span style={{ color: 'var(--text-muted)' }}>({tour.review_count})</span>
                      </span>
                    )}
                    <span style={{ color: 'var(--text-muted)' }}>
                      {tour.total_bookings} броней · {RUB(tour.total_revenue)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href={`/hub/operator/tours/${tour.id}`}
                    className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                    title="Редактировать"
                  >
                    <Edit2 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  </Link>
                  <button
                    onClick={() => handleToggleActive(tour.id, tour.is_active)}
                    disabled={isToggling}
                    className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                    title={tour.is_active ? 'Скрыть' : 'Показать'}
                  >
                    {isToggling ? (
                      <div className="w-4 h-4 border border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
                    ) : tour.is_active ? (
                      <EyeOff className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    ) : (
                      <Eye className="w-4 h-4" style={{ color: 'var(--success)' }} />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(tour.id, tour.title)}
                    disabled={isDeleting}
                    className="p-2 rounded-lg hover:bg-[var(--danger)]/10 transition-colors"
                    title="Удалить"
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 border border-[var(--danger)]/30 border-t-[var(--danger)] rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--danger)' }} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Страница {page} из {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
              style={{ borderColor: 'var(--border)' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
              style={{ borderColor: 'var(--border)' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
