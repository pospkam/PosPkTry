'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, X, Check, AlertTriangle, Phone, Mail,
  RefreshCw, ChevronLeft, ChevronRight, Users, ExternalLink,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  operator_tour_id: string;
  tour_title: string;
  tourist_name: string | null;
  tourist_email: string | null;
  tourist_phone: string | null;
  booking_date: string;
  participants: number;
  final_price: string | null;
  currency: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  booking_status: 'new' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  weather_alert_triggered: boolean;
  created_at: string;
}

interface TourOption {
  id: string;
  title: string;
  base_price: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RUB = (v: number | string | null) =>
  v == null ? '—' : Number(v).toLocaleString('ru-RU') + ' ₽';

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая', confirmed: 'Подтверждена',
  cancelled: 'Отменена', completed: 'Завершена', no_show: 'Не явился',
};
const STATUS_STYLE: Record<string, string> = {
  new:       'bg-[var(--warning)]/10  text-[var(--warning)]',
  confirmed: 'bg-[var(--success)]/10 text-[var(--success)]',
  cancelled: 'bg-[var(--danger)]/10  text-[var(--danger)]',
  completed: 'bg-[var(--ocean)]/10   text-[var(--ocean)]',
  no_show:   'bg-[var(--text-muted)]/10 text-[var(--text-muted)]',
};
const PAY_LABELS: Record<string, string> = {
  pending: 'Ожидает', paid: 'Оплачено', failed: 'Ошибка', refunded: 'Возврат',
};
const PAY_STYLE: Record<string, string> = {
  pending:  'text-[var(--warning)]',
  paid:     'text-[var(--success)]',
  failed:   'text-[var(--danger)]',
  refunded: 'text-[var(--text-muted)]',
};

const INPUT = 'px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors w-full';
const SELECT = INPUT;
const LIMIT = 20;

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingsManagementClient() {
  // List state
  const [bookings, setBookings]       = useState<Booking[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [payFilter, setPayFilter]     = useState('');

  // Detail panel
  const [detail, setDetail]           = useState<Booking | null>(null);

  // Add booking form
  const [showAdd, setShowAdd]         = useState(false);
  const [tours, setTours]             = useState<TourOption[]>([]);
  const [form, setForm]               = useState({
    operator_tour_id: '',
    booking_date: '',
    participants: '1',
    tourist_name: '',
    tourist_phone: '',
    tourist_email: '',
    final_price: '',
    created_via: 'direct_contact' as 'direct_contact' | 'website' | 'api',
  });
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState('');

  // ── Fetch bookings ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: LIMIT.toString(),
      offset: ((page - 1) * LIMIT).toString(),
    });
    if (statusFilter) params.set('status', statusFilter);
    if (payFilter)    params.set('payment', payFilter);

    try {
      const r = await fetch(`/api/hub/operator/bookings?${params}`);
      const d = await r.json();
      if (d.success) {
        setBookings(d.data);
        setTotal(d.pagination.total);
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [page, statusFilter, payFilter]);

  useEffect(() => { load(); }, [load]);

  // ── Load tours for add form ─────────────────────────────────────────────────
  useEffect(() => {
    if (!showAdd || tours.length > 0) return;
    fetch('/api/hub/operator/tours?limit=100')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setTours(d.data);
          if (d.data.length > 0) setForm(f => ({ ...f, operator_tour_id: String(d.data[0].id) }));
        }
      })
      .catch(() => undefined);
  }, [showAdd, tours.length]);

  // ── Add booking ─────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.operator_tour_id || !form.booking_date) {
      setSaveError('Выберите тур и дату');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const body: Record<string, unknown> = {
        operator_tour_id: parseInt(form.operator_tour_id),
        booking_date: form.booking_date,
        participants: parseInt(form.participants) || 1,
        created_via: form.created_via,
      };
      if (form.tourist_name)  body.tourist_name  = form.tourist_name;
      if (form.tourist_phone) body.tourist_phone = form.tourist_phone;
      if (form.tourist_email) body.tourist_email = form.tourist_email;
      if (form.final_price)   body.final_price   = parseFloat(form.final_price);

      const r = await fetch('/api/hub/operator/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        setShowAdd(false);
        setForm(f => ({ ...f, booking_date: '', participants: '1', tourist_name: '', tourist_phone: '', tourist_email: '', final_price: '' }));
        await load();
      } else {
        const d = await r.json();
        setSaveError(d.error || 'Ошибка');
      }
    } catch {
      setSaveError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  // ── Status update ───────────────────────────────────────────────────────────
  const updateStatus = async (id: string, booking_status: string) => {
    try {
      await fetch(`/api/hub/operator/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_status }),
      });
      await load();
      if (detail?.id === id) setDetail(prev => prev ? { ...prev, booking_status: booking_status as Booking['booking_status'] } : null);
    } catch { /* non-fatal */ }
  };

  // ── Pagination ──────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // ── Stats from current page ─────────────────────────────────────────────────
  const counts = {
    new:       bookings.filter(b => b.booking_status === 'new').length,
    confirmed: bookings.filter(b => b.booking_status === 'confirmed').length,
    completed: bookings.filter(b => b.booking_status === 'completed').length,
    cancelled: bookings.filter(b => b.booking_status === 'cancelled').length,
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 lg:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Бронирования</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Всего: {total}
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setSaveError(''); }}
          className="ds-btn ds-btn-primary flex items-center gap-1.5 text-sm"
        >
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? 'Отмена' : 'Добавить бронь'}
        </button>
      </div>

      {/* Add Booking Form */}
      {showAdd && (
        <div className="bg-[var(--bg-card)] border border-[var(--accent)] rounded-lg p-4 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm">Ручной ввод бронирования</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Tour */}
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-muted)]">Тур *</label>
              <select value={form.operator_tour_id} onChange={e => setForm(f => ({ ...f, operator_tour_id: e.target.value }))} className={SELECT}>
                {tours.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-muted)]">Дата *</label>
              <input type="date" value={form.booking_date} onChange={e => setForm(f => ({ ...f, booking_date: e.target.value }))} className={INPUT} />
            </div>

            {/* Participants */}
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-muted)]">Участников</label>
              <input type="number" min="1" max="100" value={form.participants} onChange={e => setForm(f => ({ ...f, participants: e.target.value }))} className={INPUT} />
            </div>

            {/* Tourist name */}
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-muted)]">Имя туриста</label>
              <input placeholder="Иванов Иван" value={form.tourist_name} onChange={e => setForm(f => ({ ...f, tourist_name: e.target.value }))} className={INPUT} />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-muted)]">Телефон</label>
              <input placeholder="+7 900 000-00-00" value={form.tourist_phone} onChange={e => setForm(f => ({ ...f, tourist_phone: e.target.value }))} className={INPUT} />
            </div>

            {/* Price */}
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-muted)]">Цена (необязательно)</label>
              <input type="number" min="0" placeholder="Авто" value={form.final_price} onChange={e => setForm(f => ({ ...f, final_price: e.target.value }))} className={INPUT} />
            </div>
          </div>

          {/* Source */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-[var(--text-muted)]">Источник:</span>
            {(['direct_contact', 'website', 'api'] as const).map(v => (
              <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" name="via" value={v} checked={form.created_via === v} onChange={() => setForm(f => ({ ...f, created_via: v }))} className="accent-[var(--accent)]" />
                <span className="text-[var(--text-secondary)]">
                  {v === 'direct_contact' ? 'Звонок/мессенджер' : v === 'website' ? 'Сайт' : 'API'}
                </span>
              </label>
            ))}
          </div>

          {saveError && (
            <p className="text-sm text-[var(--danger)] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />{saveError}
            </p>
          )}

          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving} className="ds-btn ds-btn-primary flex items-center gap-1.5 text-sm">
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {saving ? 'Сохраняем...' : 'Создать'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className={SELECT + ' w-auto'}>
          <option value="">Все статусы</option>
          <option value="new">Новые</option>
          <option value="confirmed">Подтверждённые</option>
          <option value="completed">Завершённые</option>
          <option value="cancelled">Отменённые</option>
        </select>
        <select value={payFilter} onChange={e => { setPayFilter(e.target.value); setPage(1); }} className={SELECT + ' w-auto'}>
          <option value="">Все оплаты</option>
          <option value="pending">Ожидает оплаты</option>
          <option value="paid">Оплачено</option>
          <option value="failed">Ошибка оплаты</option>
        </select>
        <button onClick={load} className="ds-btn ds-btn-secondary flex items-center gap-1.5 text-sm">
          <RefreshCw className="w-3.5 h-3.5" />
          Обновить
        </button>
      </div>

      {/* Stats mini-cards */}
      {!loading && bookings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Новые',        value: counts.new,       color: 'var(--warning)' },
            { label: 'Подтверждены', value: counts.confirmed, color: 'var(--success)' },
            { label: 'Завершены',    value: counts.completed, color: 'var(--ocean)' },
            { label: 'Отменены',     value: counts.cancelled, color: 'var(--danger)' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-muted)]">{s.label}</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: `${s.color}` }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Booking list */}
      {loading ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 px-4 flex items-center gap-3">
              <div className="w-24 h-4 bg-[var(--bg-hover)] rounded" />
              <div className="flex-1 h-4 bg-[var(--bg-hover)] rounded" />
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Бронирований нет</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1fr_2fr_1.5fr_auto_auto_auto] gap-3 px-4 py-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)]">
            <span>Дата / Тур</span><span>Клиент</span><span>Статус</span><span className="text-right">Сумма</span><span className="text-right">Оплата</span><span></span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[var(--border)]">
            {bookings.map(b => (
              <div
                key={b.id}
                className={`flex flex-col md:grid md:grid-cols-[1fr_2fr_1.5fr_auto_auto_auto] gap-2 md:gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors ${b.weather_alert_triggered ? 'border-l-2 border-[var(--warning)]' : ''}`}
              >
                {/* Date + Tour */}
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {new Date(b.booking_date + 'T00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate max-w-[160px]">{b.tour_title}</p>
                  {b.weather_alert_triggered && (
                    <span className="text-[9px] text-[var(--warning)] flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" />Погодный алерт
                    </span>
                  )}
                </div>

                {/* Client */}
                <div>
                  <p className="text-sm text-[var(--text-primary)]">{b.tourist_name || <span className="text-[var(--text-muted)]">Аноним</span>}</p>
                  {b.tourist_phone && (
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />{b.tourist_phone}
                    </p>
                  )}
                  {b.tourist_email && (
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <Mail className="w-2.5 h-2.5" />{b.tourist_email}
                    </p>
                  )}
                  <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <Users className="w-2.5 h-2.5" />{b.participants} чел.
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[b.booking_status] ?? ''}`}>
                    {STATUS_LABELS[b.booking_status] ?? b.booking_status}
                  </span>
                </div>

                {/* Price */}
                <div className="text-right">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{RUB(b.final_price)}</p>
                </div>

                {/* Payment */}
                <div className="text-right">
                  <span className={`text-xs ${PAY_STYLE[b.payment_status] ?? ''}`}>
                    {PAY_LABELS[b.payment_status] ?? b.payment_status}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 flex-wrap">
                  {b.booking_status === 'new' && (
                    <button onClick={() => updateStatus(b.id, 'confirmed')} className="text-xs px-2 py-1 bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 rounded transition-colors">
                      Принять
                    </button>
                  )}
                  {(b.booking_status === 'new' || b.booking_status === 'confirmed') && (
                    <button onClick={() => updateStatus(b.id, 'cancelled')} className="text-xs px-2 py-1 bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 rounded transition-colors">
                      Отменить
                    </button>
                  )}
                  {b.booking_status === 'confirmed' && (
                    <button onClick={() => updateStatus(b.id, 'completed')} className="text-xs px-2 py-1 border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded transition-colors">
                      Завершить
                    </button>
                  )}
                  <button onClick={() => setDetail(b)} className="text-xs px-2 py-1 border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded transition-colors">
                    Детали
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">
            Стр. {page} из {totalPages} · Всего: {total}
          </span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 border border-[var(--border)] rounded hover:bg-[var(--bg-hover)] disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            </button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 border border-[var(--border)] rounded hover:bg-[var(--bg-hover)] disabled:opacity-40 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            </button>
          </div>
        </div>
      )}

      {/* Detail panel (slides in over content) */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-lg p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Бронь #{detail.id}</p>
                <h3 className="font-bold text-[var(--text-primary)]">{detail.tour_title}</h3>
              </div>
              <button onClick={() => setDetail(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-[var(--text-muted)] text-xs block">Дата тура</span>{new Date(detail.booking_date + 'T00:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <div><span className="text-[var(--text-muted)] text-xs block">Участников</span>{detail.participants} чел.</div>
              <div><span className="text-[var(--text-muted)] text-xs block">Турист</span>{detail.tourist_name || '—'}</div>
              <div><span className="text-[var(--text-muted)] text-xs block">Телефон</span>{detail.tourist_phone || '—'}</div>
              <div><span className="text-[var(--text-muted)] text-xs block">Email</span>{detail.tourist_email || '—'}</div>
              <div><span className="text-[var(--text-muted)] text-xs block">Сумма</span>{RUB(detail.final_price)}</div>
              <div><span className="text-[var(--text-muted)] text-xs block">Статус</span>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${STATUS_STYLE[detail.booking_status]}`}>{STATUS_LABELS[detail.booking_status]}</span>
              </div>
              <div><span className="text-[var(--text-muted)] text-xs block">Оплата</span>
                <span className={`text-xs ${PAY_STYLE[detail.payment_status]}`}>{PAY_LABELS[detail.payment_status]}</span>
              </div>
            </div>

            {detail.weather_alert_triggered && (
              <div className="flex items-center gap-2 text-sm text-[var(--warning)] bg-[var(--warning)]/5 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                По этому туру был погодный алерт. Требуется проверка.
              </div>
            )}

            {/* Link to full booking page */}
            <Link
              href={`/hub/operator/bookings/${detail.id}`}
              className="flex items-center gap-1.5 text-xs text-[var(--ocean)] hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Открыть полную страницу
            </Link>

            {/* Quick status actions in detail */}
            <div className="flex gap-2 flex-wrap pt-1 border-t border-[var(--border)]">
              {detail.booking_status === 'new' && (
                <button onClick={() => { updateStatus(detail.id, 'confirmed'); setDetail(null); }} className="ds-btn ds-btn-primary text-sm flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />Принять
                </button>
              )}
              {detail.booking_status === 'confirmed' && (
                <button onClick={() => { updateStatus(detail.id, 'completed'); setDetail(null); }} className="ds-btn ds-btn-secondary text-sm">
                  Завершить
                </button>
              )}
              {(detail.booking_status === 'new' || detail.booking_status === 'confirmed') && (
                <button onClick={() => { updateStatus(detail.id, 'cancelled'); setDetail(null); }} className="ds-btn ds-btn-danger text-sm">
                  Отменить
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
