'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet, TrendingUp, Clock, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, Info, CreditCard, Save
} from 'lucide-react';

interface Summary {
  balanceHeld: number;
  totalReleased: number;
  totalCommission: number;
  heldCount: number;
  releasedCount: number;
}

interface Payment {
  id: string;
  retail_amount: string;
  net_amount: string;
  commission_amount: string;
  commission_rate: string;
  status: string;
  paid_at: string;
  release_after: string;
  released_at: string | null;
  tour_title: string;
  booking_date: string;
  participants: number;
  tourist_name: string;
}

interface Payout {
  id: string;
  total_net: string;
  booking_count: number;
  status: string;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  payment_reference: string | null;
}

function formatRub(val: string | number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', minimumFractionDigits: 0
  }).format(Number(val));
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  HELD:     { label: 'Удержано',  cls: 'bg-[var(--warning)]/15 text-[var(--warning)]' },
  RELEASED: { label: 'Выплачено', cls: 'bg-[var(--success)]/15 text-[var(--success)]' },
  REFUNDED: { label: 'Возврат',   cls: 'bg-[var(--danger)]/10  text-[var(--danger)]'  },
  PENDING:  { label: 'Ожидает',   cls: 'bg-[var(--ocean)]/10   text-[var(--ocean)]'   },
  PAID:     { label: 'Оплачено',  cls: 'bg-[var(--success)]/15 text-[var(--success)]' },
  FAILED:   { label: 'Ошибка',    cls: 'bg-[var(--danger)]/10  text-[var(--danger)]'  },
};

function Badge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, cls: 'bg-[var(--bg-hover)] text-[var(--text-muted)]' };
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.cls}`}>{s.label}</span>;
}

function PayoutDetailsForm({ initialMethod }: { initialMethod: string | null }) {
  const [method, setMethod] = useState(initialMethod || 'sbp');
  const [fields, setFields] = useState({ phone: '', inn: '', bik: '', account: '', name: '', kpp: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const inputCls = 'w-full px-3 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors font-mono';
  const labelCls = 'block text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1';

  async function handleSave() {
    setSaving(true); setMsg(null);
    try {
      const payload = method === 'sbp'
        ? { method, phone: fields.phone }
        : method === 'bank'
        ? { method, inn: fields.inn, bik: fields.bik, account: fields.account, name: fields.name, kpp: fields.kpp || undefined }
        : { method, token: fields.account };

      const r = await fetch('/api/hub/operator/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j: unknown = await r.json();
      const ok = typeof j === 'object' && j !== null && 'success' in j && (j as { success: boolean }).success;
      setMsg({ ok, text: ok ? 'Реквизиты сохранены' : String((j as { error?: unknown }).error ?? 'Ошибка') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <CreditCard className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <span className="text-xs font-medium text-[var(--text-primary)]">Реквизиты для выплат</span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className={labelCls}>Способ получения</label>
          <select
            className={inputCls}
            value={method}
            onChange={e => setMethod(e.target.value)}
          >
            <option value="sbp">СБП по номеру телефона</option>
            <option value="bank">Расчётный счёт (ИП/ООО)</option>
          </select>
        </div>

        {method === 'sbp' && (
          <div>
            <label className={labelCls}>Номер телефона</label>
            <input className={inputCls} placeholder="+79001234567"
              value={fields.phone} onChange={e => setFields(f => ({ ...f, phone: e.target.value }))} />
          </div>
        )}

        {method === 'bank' && (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Название (ИП/ООО)</label>
              <input className={inputCls} placeholder="ИП Иванов Иван Иванович"
                value={fields.name} onChange={e => setFields(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>ИНН</label>
                <input className={inputCls} placeholder="410012345678"
                  value={fields.inn} onChange={e => setFields(f => ({ ...f, inn: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>КПП (для ООО)</label>
                <input className={inputCls} placeholder="410101001"
                  value={fields.kpp} onChange={e => setFields(f => ({ ...f, kpp: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>БИК банка</label>
                <input className={inputCls} placeholder="044525974"
                  value={fields.bik} onChange={e => setFields(f => ({ ...f, bik: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Расчётный счёт (20 цифр)</label>
                <input className={inputCls} placeholder="40802810500000000001"
                  value={fields.account} onChange={e => setFields(f => ({ ...f, account: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

        {msg && (
          <p className={`text-[11px] ${msg.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{msg.text}</p>
        )}

        <button
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Сохранение...' : 'Сохранить реквизиты'}
        </button>
      </div>
    </div>
  );
}

export default function FinancePageClient() {
  const [data, setData] = useState<{
    summary: Summary;
    commissionCurrent: number;
    payoutMethod: string | null;
    payoutVerified: boolean;
    payments: Payment[];
    payouts: Payout[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayments, setShowPayments] = useState(true);

  useEffect(() => {
    fetch('/api/hub/operator/payouts')
      .then(r => r.json())
      .then((j: unknown) => {
        if (typeof j === 'object' && j !== null && 'success' in j && (j as { success: boolean }).success) {
          setData((j as unknown as { data: typeof data }).data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--text-muted)]">Не удалось загрузить данные</p>
      </div>
    );
  }

  const { summary, commissionCurrent, payoutMethod, payoutVerified, payments, payouts } = data;

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Заголовок */}
      <div>
        <h1 className="text-sm font-semibold text-[var(--text-primary)]">Финансы</h1>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
          Ваша комиссия платформы: {commissionCurrent}%
        </p>
      </div>

      {/* Реквизиты не верифицированы */}
      {!payoutVerified && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-[var(--warning)] mt-0.5 shrink-0" />
          <p className="text-xs text-[var(--text-secondary)]">
            Реквизиты для выплат не указаны или не верифицированы.
            {!payoutMethod && ' Добавьте банковские реквизиты в настройках профиля.'}
          </p>
        </div>
      )}

      {/* Карточки */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-[var(--warning)]" />
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">К выплате</span>
          </div>
          <p className="text-xl font-semibold text-[var(--text-primary)] font-mono">{formatRub(summary.balanceHeld)}</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">{summary.heldCount} бронирований · ожидают 36ч после тура</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-3.5 h-3.5 text-[var(--success)]" />
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Выплачено</span>
          </div>
          <p className="text-xl font-semibold text-[var(--text-primary)] font-mono">{formatRub(summary.totalReleased)}</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">{summary.releasedCount} бронирований</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--ocean)]" />
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Комиссия платформы</span>
          </div>
          <p className="text-xl font-semibold text-[var(--text-primary)] font-mono">{formatRub(summary.totalCommission)}</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">Ставка снижается по мере роста броней</p>
        </div>
      </div>

      {/* Как работают выплаты */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
        <Info className="w-3.5 h-3.5 text-[var(--ocean)] mt-0.5 shrink-0" />
        <p className="text-[11px] text-[var(--text-secondary)]">
          Деньги удерживаются 36 часов после окончания тура. Затем администратор платформы формирует выплату на ваши реквизиты.
        </p>
      </div>

      {/* Реквизиты */}
      <PayoutDetailsForm initialMethod={payoutMethod} />

      {/* История платежей */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <button
          onClick={() => setShowPayments(p => !p)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-xs font-medium text-[var(--text-primary)]">История платежей</span>
            <span className="text-[10px] text-[var(--text-muted)]">({payments.length})</span>
          </div>
          {showPayments ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
        </button>

        {showPayments && (
          payments.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">Платежей пока нет</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-t border-[var(--border)] bg-[var(--bg-hover)]">
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--text-muted)]">Тур / турист</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--text-muted)]">Дата тура</th>
                    <th className="px-3 py-2 text-right text-[10px] font-medium text-[var(--text-muted)]">Получите</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--text-muted)]">Статус</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--text-muted)]">Выплата после</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-[var(--text-primary)] truncate max-w-[180px]">{p.tour_title}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{p.tourist_name} · {p.participants} чел.</p>
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-secondary)]">{formatDate(p.booking_date)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <p className="font-mono font-medium text-[var(--text-primary)]">{formatRub(p.net_amount)}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">из {formatRub(p.retail_amount)}</p>
                      </td>
                      <td className="px-3 py-2.5"><Badge status={p.status} /></td>
                      <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                        {p.released_at ? formatDate(p.released_at) : formatDate(p.release_after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* История выплат */}
      {payouts.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
            <CheckCircle className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-xs font-medium text-[var(--text-primary)]">Выплаты</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {payouts.map(po => (
              <div key={po.id} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors">
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)] font-mono">{formatRub(po.total_net)}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {formatDate(po.period_start)} — {formatDate(po.period_end)} · {po.booking_count} броней
                  </p>
                </div>
                <div className="text-right">
                  <Badge status={po.status} />
                  {po.paid_at && <p className="text-[10px] text-[var(--text-muted)] mt-1">{formatDate(po.paid_at)}</p>}
                  {po.payment_reference && <p className="text-[10px] text-[var(--text-muted)]">{po.payment_reference}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
