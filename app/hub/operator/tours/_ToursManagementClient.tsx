'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Plus, Upload, Mountain, Star, Users, Clock,
  Eye, EyeOff, Trash2, Edit2, RefreshCw, ChevronLeft, ChevronRight,
  CalendarDays, Check, X, FileText, Loader2,
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
  available_slots: number | null;
  next_available_date: string | null;
}

interface PdfResult {
  title: string;
  description: string | null;
  short_description: string | null;
  activity_type: string;
  location_type: string;
  location_name: string;
  base_price: number | null;
  price_unit: string;
  max_participants: number | null;
  min_participants: number | null;
  duration_hours: number | null;
  difficulty: string | null;
  season_start: string | null;
  season_end: string | null;
  included: string[];
  not_included: string[];
  what_to_bring: string[];
  tags: string[];
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
  const [editingAvail, setEditingAvail] = useState<string | null>(null);
  const [availSlots, setAvailSlots]   = useState('');
  const [availDate, setAvailDate]     = useState('');
  const [savingAvail, setSavingAvail] = useState(false);

  // PDF import state
  const [pdfOpen, setPdfOpen]       = useState(false);
  const [pdfFile, setPdfFile]       = useState<File | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfResult, setPdfResult]   = useState<PdfResult | null>(null);
  const [pdfError, setPdfError]     = useState<string | null>(null);
  const [pdfCreating, setPdfCreating] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handlePdfUpload = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setPdfError('Поддерживается только PDF');
      return;
    }
    setPdfFile(file);
    setPdfError(null);
    setPdfResult(null);
    setPdfLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/hub/operator/tours/import-pdf', { method: 'POST', body: fd });
      const data = await res.json() as { success: boolean; data?: PdfResult; error?: string };
      if (data.success && data.data) {
        setPdfResult(data.data);
      } else {
        setPdfError(data.error ?? 'Ошибка извлечения данных');
      }
    } catch {
      setPdfError('Ошибка сети. Попробуйте снова.');
    } finally {
      setPdfLoading(false);
    }
  }, []);

  const handlePdfCreate = useCallback(async () => {
    if (!pdfResult) return;
    setPdfCreating(true);
    try {
      const res = await fetch('/api/hub/operator/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:             pdfResult.title || 'Тур из PDF',
          description:       pdfResult.description,
          short_description: pdfResult.short_description,
          activity_type:     pdfResult.activity_type || 'other',
          location_type:     pdfResult.location_type || 'other',
          location_name:     pdfResult.location_name || 'Камчатка',
          latitude:          53.0,
          longitude:         158.7,
          base_price:        pdfResult.base_price ?? 1000,
          price_unit:        pdfResult.price_unit || 'per_person',
          max_participants:  pdfResult.max_participants ?? 10,
          min_participants:  pdfResult.min_participants,
          duration_hours:    pdfResult.duration_hours,
          difficulty:        pdfResult.difficulty,
          season_start:      pdfResult.season_start,
          season_end:        pdfResult.season_end,
          included:          pdfResult.included,
          not_included:      pdfResult.not_included,
          what_to_bring:     pdfResult.what_to_bring,
          tags:              pdfResult.tags,
        }),
      });
      const data = await res.json() as { success: boolean; data?: { id: string }; error?: string };
      if (data.success && data.data?.id) {
        setPdfOpen(false);
        router.push(`/hub/operator/tours/${data.data.id}/edit`);
      } else {
        setPdfError(data.error ?? 'Ошибка создания тура');
      }
    } catch {
      setPdfError('Ошибка сети');
    } finally {
      setPdfCreating(false);
    }
  }, [pdfResult, router]);

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

  function openAvailEditor(tour: Tour) {
    setEditingAvail(tour.id);
    setAvailSlots(tour.available_slots != null ? String(tour.available_slots) : '');
    setAvailDate(tour.next_available_date ?? '');
  }

  async function saveAvailability(id: string) {
    setSavingAvail(true);
    try {
      const slots = availSlots === '' ? null : parseInt(availSlots, 10);
      const date  = availDate === '' ? null : availDate;
      await fetch(`/api/hub/operator/tours/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available_slots: slots, next_available_date: date }),
      });
      setEditingAvail(null);
      await load();
    } finally { setSavingAvail(false); }
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
          <button
            onClick={() => { setPdfOpen(true); setPdfResult(null); setPdfFile(null); setPdfError(null); }}
            className="ds-btn flex items-center gap-1.5 text-sm"
          >
            <FileText className="w-4 h-4" />
            Импорт PDF
          </button>
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

                  {/* Availability row */}
                  {editingAvail === tour.id ? (
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Мест:</label>
                        <input
                          type="number"
                          min="0"
                          value={availSlots}
                          onChange={e => setAvailSlots(e.target.value)}
                          placeholder="0"
                          className="ds-input text-xs w-16 py-1 px-2"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Дата:</label>
                        <input
                          type="date"
                          value={availDate}
                          onChange={e => setAvailDate(e.target.value)}
                          className="ds-input text-xs py-1 px-2"
                        />
                      </div>
                      <button
                        onClick={() => void saveAvailability(tour.id)}
                        disabled={savingAvail}
                        className="p-1 rounded-md transition-colors"
                        style={{ background: 'var(--success)', color: '#fff' }}
                        title="Сохранить"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingAvail(null)}
                        className="p-1 rounded-md transition-colors hover:bg-[var(--bg-hover)]"
                        title="Отмена"
                      >
                        <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-1.5 mt-2 cursor-pointer group w-fit"
                      onClick={() => openAvailEditor(tour)}
                      title="Нажмите чтобы обновить доступность"
                    >
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--ocean)' }} />
                      {tour.available_slots != null || tour.next_available_date ? (
                        <span className="text-xs" style={{ color: 'var(--ocean)' }}>
                          {tour.available_slots != null ? `${tour.available_slots} мест` : ''}
                          {tour.available_slots != null && tour.next_available_date ? ' · ' : ''}
                          {tour.next_available_date
                            ? new Date(tour.next_available_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                            : ''}
                          <span className="ml-1 opacity-0 group-hover:opacity-60 text-xs transition-opacity">изменить</span>
                        </span>
                      ) : (
                        <span className="text-xs opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                          Укажите доступность для Кузьмича
                        </span>
                      )}
                    </div>
                  )}
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

      {/* ─── PDF Import Modal ─────────────────────────────────────── */}
      {pdfOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg ds-card rounded-xl p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-playfair text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Импорт тура из PDF
              </h2>
              <button onClick={() => setPdfOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drop zone */}
            {!pdfResult && (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-[var(--accent)] hover:bg-[var(--bg-hover)]"
                style={{ borderColor: 'var(--border)' }}
                onClick={() => pdfInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) handlePdfUpload(f);
                }}
              >
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }}
                />
                {pdfLoading ? (
                  <div className="space-y-2">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin" style={{ color: 'var(--accent)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Gemini читает PDF и извлекает данные тура...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileText className="w-8 h-8 mx-auto" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {pdfFile ? pdfFile.name : 'Перетащите PDF или нажмите для выбора'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Брошюра, прайс-лист или описание тура — до 8 МБ
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {pdfError && (
              <p className="text-sm px-3 py-2 rounded-lg bg-[var(--danger)]/10" style={{ color: 'var(--danger)' }}>
                {pdfError}
              </p>
            )}

            {/* Extracted data preview */}
            {pdfResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--success)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--success)' }}>
                    Данные извлечены — проверьте перед созданием
                  </p>
                </div>

                <div className="rounded-lg p-4 space-y-2 text-sm" style={{ background: 'var(--bg-hover)' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Название: </span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{pdfResult.title || '—'}</span></div>
                  {pdfResult.location_name && <div><span style={{ color: 'var(--text-muted)' }}>Локация: </span><span style={{ color: 'var(--text-secondary)' }}>{pdfResult.location_name}</span></div>}
                  <div className="flex gap-4">
                    {pdfResult.base_price && <div><span style={{ color: 'var(--text-muted)' }}>Цена: </span><span className="font-semibold" style={{ color: 'var(--accent)' }}>{pdfResult.base_price.toLocaleString('ru-RU')} ₽</span></div>}
                    {pdfResult.duration_hours && <div><span style={{ color: 'var(--text-muted)' }}>Длит.: </span><span style={{ color: 'var(--text-secondary)' }}>{pdfResult.duration_hours} ч</span></div>}
                    {pdfResult.max_participants && <div><span style={{ color: 'var(--text-muted)' }}>Макс. гр.: </span><span style={{ color: 'var(--text-secondary)' }}>{pdfResult.max_participants}</span></div>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{pdfResult.activity_type}</span>
                    <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{pdfResult.location_type}</span>
                    {pdfResult.difficulty && <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{pdfResult.difficulty}</span>}
                  </div>
                  {pdfResult.included.length > 0 && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Включено: </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{pdfResult.included.slice(0, 3).join(', ')}{pdfResult.included.length > 3 ? ` +${pdfResult.included.length - 3}` : ''}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Тур будет создан как черновик с координатами по умолчанию. Уточните детали в редакторе.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setPdfResult(null); setPdfFile(null); }}
                    className="ds-btn ds-btn-secondary flex-1 text-sm"
                  >
                    Загрузить другой PDF
                  </button>
                  <button
                    onClick={handlePdfCreate}
                    disabled={pdfCreating}
                    className="ds-btn ds-btn-primary flex-1 text-sm flex items-center justify-center gap-1.5"
                  >
                    {pdfCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Создать тур
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
