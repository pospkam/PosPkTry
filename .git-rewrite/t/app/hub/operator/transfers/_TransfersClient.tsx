'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRightLeft, Send, Check, X, Loader2, Plus,
  ArrowUpRight, ArrowDownLeft,
} from 'lucide-react';

// -- Типы --

type TransferStatus = 'pending' | 'accepted' | 'rejected' | 'completed';

interface TransferItem {
  id: string;
  bookingId: string;
  fromOperatorName: string | null;
  toOperatorName: string | null;
  commissionPercent: number;
  status: TransferStatus;
  message: string | null;
  createdAt: string;
}

interface FormState {
  bookingId: string;
  toOperatorPartnerId: string;
  commissionPercent: string;
  message: string;
}

// -- Type guard --
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

// -- Стили статусов --
function statusStyle(s: TransferStatus): { color: string; borderColor: string } {
  const map: Record<TransferStatus, { color: string; borderColor: string }> = {
    pending:   { color: 'var(--warning)', borderColor: 'var(--warning)' },
    accepted:  { color: 'var(--success)', borderColor: 'var(--success)' },
    rejected:  { color: 'var(--danger)',  borderColor: 'var(--danger)'  },
    completed: { color: 'var(--text-muted)', borderColor: 'var(--border)' },
  };
  return map[s] ?? { color: 'var(--text-muted)', borderColor: 'var(--border)' };
}

function statusLabel(s: TransferStatus): string {
  const map: Record<TransferStatus, string> = {
    pending:   'Ожидает',
    accepted:  'Принят',
    rejected:  'Отклонён',
    completed: 'Завершён',
  };
  return map[s] ?? s;
}

const INPUT = 'w-full px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';
const LABEL = 'block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5';

export default function TransfersClient() {
  const [outgoing, setOutgoing] = useState<TransferItem[]>([]);
  const [incoming, setIncoming] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    bookingId: '', toOperatorPartnerId: '', commissionPercent: '10', message: '',
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadTransfers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [outRes, inRes] = await Promise.all([
        fetch('/api/operator/transfer-booking?direction=outgoing'),
        fetch('/api/operator/transfer-booking?direction=incoming'),
      ]);

      const [outData, inData] = await Promise.all([outRes.json(), inRes.json()]) as [unknown, unknown];

      const mapItems = (data: unknown): TransferItem[] => {
        if (!isRecord(data) || !Array.isArray((data as Record<string, unknown>).data)) return [];
        return ((data as Record<string, unknown>).data as unknown[]).filter(isRecord).map(r => ({
          id: String(r.id ?? ''),
          bookingId: String(r.bookingId ?? ''),
          fromOperatorName: typeof r.fromOperatorName === 'string' ? r.fromOperatorName : null,
          toOperatorName: typeof r.toOperatorName === 'string' ? r.toOperatorName : null,
          commissionPercent: typeof r.commissionPercent === 'number' ? r.commissionPercent : 0,
          status: (typeof r.status === 'string' ? r.status : 'pending') as TransferStatus,
          message: typeof r.note === 'string' ? r.note : (typeof r.message === 'string' ? r.message : null),
          createdAt: String(r.createdAt ?? ''),
        }));
      };

      setOutgoing(mapItems(outData));
      setIncoming(mapItems(inData));
    } catch {
      setError('Не удалось загрузить перебросы');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadTransfers(); }, [loadTransfers]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitMsg(null);
    try {
      setSubmitting(true);
      const res = await fetch('/api/operator/transfer-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: form.bookingId.trim(),
          toOperatorPartnerId: form.toOperatorPartnerId.trim(),
          commissionPercent: parseFloat(form.commissionPercent) || 10,
          note: form.message || undefined,
        }),
      });
      const data: unknown = await res.json();
      if (!isRecord(data) || !data.success) {
        throw new Error(isRecord(data) && typeof data.error === 'string' ? data.error : 'Ошибка');
      }
      setSubmitMsg('Переброс предложен');
      setForm({ bookingId: '', toOperatorPartnerId: '', commissionPercent: '10', message: '' });
      setShowForm(false);
      await loadTransfers();
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  }

  // Принять/отклонить входящий переброс
  async function handleAction(id: string, action: 'accept' | 'reject') {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/operator/transfer-booking/${id}/${action}`, { method: 'PATCH' });
      const data: unknown = await res.json();
      if (!isRecord(data) || !data.success) {
        throw new Error(isRecord(data) && typeof data.error === 'string' ? data.error : 'Ошибка');
      }
      await loadTransfers();
    } catch {
      setError('Не удалось выполнить действие');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Переброс бронирований</h1>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="min-h-[44px] px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--bg-card)] text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Предложить переброс
        </button>
      </div>

      {submitMsg && (
        <div
          className="px-3.5 py-2.5 rounded-md text-sm border"
          style={{ color: 'var(--success)', borderColor: 'var(--success)', backgroundColor: 'color-mix(in srgb, var(--success) 10%, transparent)' }}
        >
          {submitMsg}
        </div>
      )}

      {/* Форма создания переброса */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Новый переброс</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className={LABEL}>ID бронирования</span>
              <input
                value={form.bookingId}
                onChange={e => setForm(p => ({ ...p, bookingId: e.target.value }))}
                className={INPUT}
                required
                placeholder="UUID"
              />
            </label>
            <label className="block">
              <span className={LABEL}>ID оператора-получателя</span>
              <input
                value={form.toOperatorPartnerId}
                onChange={e => setForm(p => ({ ...p, toOperatorPartnerId: e.target.value }))}
                className={INPUT}
                required
                placeholder="UUID партнёра"
              />
            </label>
            <label className="block">
              <span className={LABEL}>Комиссия (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.commissionPercent}
                onChange={e => setForm(p => ({ ...p, commissionPercent: e.target.value }))}
                className={INPUT}
                required
              />
            </label>
            <label className="block">
              <span className={LABEL}>Сообщение</span>
              <input
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                className={INPUT}
                placeholder="Опционально"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--bg-card)] text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Отправить
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : error ? (
        <div
          className="px-3.5 py-2.5 rounded-md text-sm border"
          style={{ color: 'var(--danger)', borderColor: 'var(--danger)', backgroundColor: 'color-mix(in srgb, var(--danger) 10%, transparent)' }}
        >
          {error}
        </div>
      ) : (
        <>
          {/* Исходящие */}
          <section>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              Исходящие ({outgoing.length})
            </h2>
            {outgoing.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Нет исходящих перебросов</p>
            ) : (
              <div className="space-y-2">
                {outgoing.map(t => (
                  <div
                    key={t.id}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        Бронирование {t.bookingId.slice(0, 8)}... &rarr; {t.toOperatorName ?? 'Оператор'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Комиссия: {t.commissionPercent}% | {new Date(t.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                      {t.message && (
                        <p className="text-xs text-[var(--text-muted)] mt-1">{t.message}</p>
                      )}
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-full whitespace-nowrap border"
                      style={statusStyle(t.status)}
                    >
                      {statusLabel(t.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Входящие */}
          <section>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4" style={{ color: 'var(--success)' }} />
              Входящие ({incoming.length})
            </h2>
            {incoming.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Нет входящих перебросов</p>
            ) : (
              <div className="space-y-2">
                {incoming.map(t => (
                  <div
                    key={t.id}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {t.fromOperatorName ?? 'Оператор'} &rarr; вам | Бронирование {t.bookingId.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Комиссия: {t.commissionPercent}% | {new Date(t.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                      {t.message && (
                        <p className="text-xs text-[var(--text-muted)] mt-1">{t.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {t.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleAction(t.id, 'accept')}
                            disabled={actionLoading === t.id}
                            className="min-h-[36px] px-3 py-1.5 rounded-md text-sm font-medium inline-flex items-center gap-1 disabled:opacity-50 transition-opacity hover:opacity-80"
                            style={{ backgroundColor: 'var(--success)', color: 'var(--bg-card)' }}
                          >
                            {actionLoading === t.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Принять
                          </button>
                          <button
                            onClick={() => handleAction(t.id, 'reject')}
                            disabled={actionLoading === t.id}
                            className="min-h-[36px] px-3 py-1.5 rounded-md text-sm font-medium inline-flex items-center gap-1 disabled:opacity-50 transition-opacity hover:opacity-80"
                            style={{ backgroundColor: 'var(--danger)', color: 'var(--bg-card)' }}
                          >
                            <X className="w-4 h-4" />
                            Отклонить
                          </button>
                        </>
                      ) : (
                        <span
                          className="text-xs px-2 py-1 rounded-full whitespace-nowrap border"
                          style={statusStyle(t.status)}
                        >
                          {statusLabel(t.status)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
