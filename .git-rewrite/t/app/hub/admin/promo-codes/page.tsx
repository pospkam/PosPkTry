'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag, RefreshCw, Plus, X, Trash2, CheckCircle, AlertCircle,
} from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: string;
  max_uses: number;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  creator_email: string | null;
}

export default function AdminPromoCodes() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('100');
  const [expiresAt, setExpiresAt] = useState('');

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/promo-codes');
      const json = await res.json();
      if (json.success) setCodes(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleCreate = async () => {
    if (!code || !discountValue || !maxUses) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code, discountType,
          discountValue: parseFloat(discountValue),
          maxUses: parseInt(maxUses, 10),
          expiresAt: expiresAt || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowForm(false);
        setCode(''); setDiscountValue(''); setMaxUses('100'); setExpiresAt('');
        fetchCodes();
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDeactivate = async (id: string) => {
    await fetch(`/api/admin/promo-codes?id=${id}`, { method: 'DELETE' });
    fetchCodes();
  };

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Tag className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Промокоды</h1>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">{codes.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--bg-card)] bg-[var(--accent)] rounded-md hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3 h-3" /> Создать
          </button>
          <button
            onClick={fetchCodes}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Новый промокод</span>
            <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] text-[var(--text-muted)] block mb-1">Код</label>
              <input
                type="text" value={code} onChange={e => setCode(e.target.value)}
                placeholder="SUMMER2026"
                className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)] block mb-1">Тип скидки</label>
              <select
                value={discountType} onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="percentage">Процент (%)</option>
                <option value="fixed">Фиксированная (₽)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)] block mb-1">
                Значение {discountType === 'percentage' ? '(%)' : '(₽)'}
              </label>
              <input
                type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? '10' : '1000'}
                className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)] block mb-1">Макс. использований</label>
              <input
                type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)] block mb-1">Истекает</label>
              <input
                type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || !code || !discountValue}
            className="px-3 py-1.5 text-xs text-[var(--bg-card)] bg-[var(--accent)] rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Создание...' : 'Создать промокод'}
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : codes.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-12 text-center">
          <Tag className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-xs text-[var(--text-muted)]">Промокодов пока нет</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="px-4 py-2.5 text-left font-medium">Код</th>
                <th className="py-2.5 text-left font-medium">Скидка</th>
                <th className="py-2.5 text-left font-medium">Использований</th>
                <th className="py-2.5 text-left font-medium hidden md:table-cell">Истекает</th>
                <th className="py-2.5 text-left font-medium">Статус</th>
                <th className="py-2.5 text-right font-medium pr-4">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {codes.map(pc => {
                const expired = pc.expires_at ? new Date(pc.expires_at) < new Date() : false;
                const active = pc.is_active && !expired && pc.current_uses < pc.max_uses;
                return (
                  <tr key={pc.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-[var(--text-primary)]">{pc.code}</td>
                    <td className="py-3 text-[var(--text-secondary)]">
                      {pc.discount_type === 'percentage'
                        ? `${parseFloat(pc.discount_value)}%`
                        : `${parseFloat(pc.discount_value)} ₽`}
                    </td>
                    <td className="py-3 text-[var(--text-secondary)] font-mono">
                      {pc.current_uses} / {pc.max_uses}
                    </td>
                    <td className="py-3 text-[var(--text-muted)] font-mono hidden md:table-cell">
                      {pc.expires_at
                        ? new Date(pc.expires_at).toLocaleDateString('ru-RU')
                        : '—'}
                    </td>
                    <td className="py-3">
                      {active ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--success)]/10 text-[var(--success)]">
                          <CheckCircle className="w-2.5 h-2.5" /> Активен
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--text-muted)]/10 text-[var(--text-muted)]">
                          <AlertCircle className="w-2.5 h-2.5" /> {expired ? 'Истёк' : pc.current_uses >= pc.max_uses ? 'Исчерпан' : 'Неактивен'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right pr-4">
                      {pc.is_active && (
                        <button
                          onClick={() => handleDeactivate(pc.id)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                          title="Деактивировать"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
