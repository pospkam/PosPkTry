'use client';

import { useCallback, useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
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

// -- Цвета статусов --
function statusBadge(s: TransferStatus): string {
  const map: Record<TransferStatus, string> = {
    pending: 'bg-yellow-500/15 text-yellow-300 border border-yellow-400/30',
    accepted: 'bg-green-500/15 text-green-300 border border-green-400/30',
    rejected: 'bg-red-500/15 text-red-300 border border-red-400/30',
    completed: 'bg-sky-500/15 text-sky-300 border border-sky-400/30',
  };
  return map[s] ?? '';
}

function statusLabel(s: TransferStatus): string {
  const map: Record<TransferStatus, string> = {
    pending: 'Ожидает',
    accepted: 'Принят',
    rejected: 'Отклонён',
    completed: 'Завершён',
  };
  return map[s] ?? s;
}

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

  const inputCls = 'w-full min-h-[44px] px-3 py-2 bg-white/10 border border-white/15 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30';

  return (
    <Protected roles={['operator', 'admin']}>
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="w-6 h-6 text-sky-400" />
            <h1 className="text-2xl font-bold text-white">Переброс бронирований</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-sky-500 text-white font-medium inline-flex items-center gap-2 hover:bg-sky-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Предложить переброс
          </button>
        </div>

        {submitMsg && (
          <div className="px-3 py-2 rounded-xl bg-green-500/20 border border-green-400/30 text-green-200 text-sm">
            {submitMsg}
          </div>
        )}

        {/* Форма создания переброса */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-white">Новый переброс</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-white/70">ID бронирования</span>
                <input value={form.bookingId} onChange={e => setForm(p => ({ ...p, bookingId: e.target.value }))} className={inputCls} required placeholder="UUID" />
              </label>
              <label className="block">
                <span className="text-sm text-white/70">ID оператора-получателя</span>
                <input value={form.toOperatorPartnerId} onChange={e => setForm(p => ({ ...p, toOperatorPartnerId: e.target.value }))} className={inputCls} required placeholder="UUID партнёра" />
              </label>
              <label className="block">
                <span className="text-sm text-white/70">Комиссия (%)</span>
                <input type="number" min="0" max="100" step="0.01" value={form.commissionPercent} onChange={e => setForm(p => ({ ...p, commissionPercent: e.target.value }))} className={inputCls} required />
              </label>
              <label className="block">
                <span className="text-sm text-white/70">Сообщение</span>
                <input value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} className={inputCls} placeholder="Опционально" />
              </label>
            </div>
            <button type="submit" disabled={submitting} className="min-h-[44px] px-4 py-2 rounded-xl bg-sky-500 text-white font-medium inline-flex items-center gap-2 disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Отправить
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white/50" /></div>
        ) : error ? (
          <div className="px-3 py-2 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm">{error}</div>
        ) : (
          <>
            {/* Исходящие */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-sky-400" />
                Исходящие ({outgoing.length})
              </h2>
              {outgoing.length === 0 ? (
                <p className="text-white/50 text-sm">Нет исходящих перебросов</p>
              ) : (
                <div className="space-y-2">
                  {outgoing.map(t => (
                    <div key={t.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-white text-sm font-medium">
                          Бронирование {t.bookingId.slice(0, 8)}... &rarr; {t.toOperatorName ?? 'Оператор'}
                        </p>
                        <p className="text-white/50 text-xs">Комиссия: {t.commissionPercent}% | {new Date(t.createdAt).toLocaleDateString('ru-RU')}</p>
                        {t.message && <p className="text-white/40 text-xs mt-1">{t.message}</p>}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusBadge(t.status)}`}>
                        {statusLabel(t.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Входящие */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-green-400" />
                Входящие ({incoming.length})
              </h2>
              {incoming.length === 0 ? (
                <p className="text-white/50 text-sm">Нет входящих перебросов</p>
              ) : (
                <div className="space-y-2">
                  {incoming.map(t => (
                    <div key={t.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-white text-sm font-medium">
                          {t.fromOperatorName ?? 'Оператор'} &rarr; вам | Бронирование {t.bookingId.slice(0, 8)}...
                        </p>
                        <p className="text-white/50 text-xs">Комиссия: {t.commissionPercent}% | {new Date(t.createdAt).toLocaleDateString('ru-RU')}</p>
                        {t.message && <p className="text-white/40 text-xs mt-1">{t.message}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {t.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleAction(t.id, 'accept')}
                              disabled={actionLoading === t.id}
                              className="min-h-[44px] px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-medium inline-flex items-center gap-1 hover:bg-green-700 disabled:opacity-50"
                            >
                              {actionLoading === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              Принять
                            </button>
                            <button
                              onClick={() => handleAction(t.id, 'reject')}
                              disabled={actionLoading === t.id}
                              className="min-h-[44px] px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-medium inline-flex items-center gap-1 hover:bg-red-700 disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                              Отклонить
                            </button>
                          </>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusBadge(t.status)}`}>
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
    </Protected>
  );
}
