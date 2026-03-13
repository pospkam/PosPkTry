'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Partner } from '@/types';
import {
  DataTable,
  Pagination,
  SearchBar,
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  Column,
} from '@/components/admin/shared';
import {
  Star, Briefcase, Pencil, Trash2, X, Save, Shield, ShieldOff,
  AlertCircle, CheckCircle,
} from 'lucide-react';

interface EditFormData {
  name: string;
  category: string;
  description: string;
  contact: { phone?: string; email?: string; website?: string; address?: string };
  isVerified: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  accommodation: 'Размещение',
  tour_operator: 'Туроператор',
  operator: 'Туроператор',
  transfer: 'Трансфер',
  guide: 'Гид',
  souvenir: 'Сувениры',
  gear: 'Снаряжение',
  restaurant: 'Ресторан',
  stay: 'Проживание',
  cars: 'Авто',
  agent: 'Агент',
};

const EDITABLE_CATEGORIES = [
  { value: 'operator', label: 'Туроператор' },
  { value: 'guide', label: 'Гид' },
  { value: 'transfer', label: 'Трансфер' },
  { value: 'stay', label: 'Проживание' },
  { value: 'gear', label: 'Снаряжение' },
  { value: 'agent', label: 'Агент' },
  { value: 'souvenir', label: 'Сувениры' },
  { value: 'cars', label: 'Авто' },
  { value: 'restaurant', label: 'Ресторан' },
];

export default function PartnersManagement() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('all');

  /* Edit state */
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage.toString(), limit: '20' });
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);
      if (verifiedFilter !== 'all') params.append('verified', verifiedFilter);

      const response = await fetch(`/api/admin/content/partners?${params}`);
      const result = await response.json();
      if (result.success) {
        setPartners(result.data.data);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, categoryFilter, verifiedFilter]);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  /* ── Open edit panel ── */
  const openEdit = async (partnerId: string) => {
    setEditId(partnerId);
    setEditLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/content/partners/${partnerId}`);
      const json = await res.json();
      if (json.success) {
        const d = json.data;
        setEditForm({
          name: d.name ?? '',
          category: d.category ?? '',
          description: d.description ?? '',
          contact: {
            phone: d.contact?.phone ?? '',
            email: d.contact?.email ?? '',
            website: d.contact?.website ?? '',
            address: d.contact?.address ?? '',
          },
          isVerified: d.isVerified ?? false,
        });
      } else {
        setMessage({ text: json.error ?? 'Ошибка загрузки', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Ошибка сети', type: 'error' });
    } finally {
      setEditLoading(false);
    }
  };

  const closeEdit = () => {
    setEditId(null);
    setEditForm(null);
    setMessage(null);
  };

  /* ── Save partner ── */
  const handleSave = async () => {
    if (!editId || !editForm) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/content/partners/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: 'Партнёр обновлён', type: 'success' });
        fetchPartners();
        setTimeout(() => closeEdit(), 1200);
      } else {
        setMessage({ text: json.error ?? 'Ошибка сохранения', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Ошибка сети', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete partner ── */
  const handleDelete = async (partnerId: string) => {
    if (!window.confirm('Удалить партнёра? Это действие необратимо.')) return;
    try {
      const res = await fetch(`/api/admin/content/partners/${partnerId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: 'Партнёр удалён', type: 'success' });
        closeEdit();
        fetchPartners();
      } else {
        setMessage({ text: json.error ?? 'Ошибка удаления', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Ошибка сети', type: 'error' });
    }
  };

  /* ── Verify (quick action) ── */
  const handleVerify = async (partnerId: string) => {
    try {
      const response = await fetch(`/api/admin/content/partners/${partnerId}/verify`, { method: 'POST' });
      if (response.ok) fetchPartners();
    } catch {
      // ignore
    }
  };

  const getCategoryLabel = (category: string) => CATEGORY_LABELS[category] || category;

  const columns: Column<Partner>[] = [
    {
      key: 'name',
      header: 'Название',
      sortable: true,
      render: (partner) => (
        <div className="flex items-center">
          {partner.logo && (
            <div className="w-8 h-8 rounded mr-2.5 relative overflow-hidden bg-[var(--bg-hover)]">
              <Image src={partner.logo.url} alt={partner.name} fill className="object-cover" sizes="32px" />
            </div>
          )}
          <div>
            <p className="font-medium text-[var(--text-primary)] text-xs">{partner.name}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{getCategoryLabel(partner.category)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Контакт',
      render: (partner) => (
        <span className="text-[var(--text-secondary)] text-xs">{partner.contact?.phone || '—'}</span>
      ),
    },
    {
      key: 'rating',
      header: 'Рейтинг',
      render: (partner) => (
        <div className="flex items-center gap-1 text-xs">
          <Star className="w-3 h-3 text-[var(--warning)] fill-[var(--warning)]" />
          <span className="text-[var(--text-primary)] font-mono">{partner.rating.toFixed(1)}</span>
          <span className="text-[var(--text-muted)]">({partner.reviewCount})</span>
        </div>
      ),
    },
    {
      key: 'isVerified',
      header: 'Статус',
      render: (partner) => <StatusBadge status={partner.isVerified ? 'success' : 'pending'} />,
    },
    {
      key: 'actions',
      header: '',
      render: (partner) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(partner.id); }}
            className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            title="Редактировать"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {!partner.isVerified && (
            <button
              onClick={(e) => { e.stopPropagation(); handleVerify(partner.id); }}
              className="p-1.5 rounded-md hover:bg-[var(--success)]/10 text-[var(--text-muted)] hover:text-[var(--success)] transition-colors"
              title="Верифицировать"
            >
              <Shield className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5 relative">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Briefcase className="w-4 h-4 text-[var(--text-muted)]" />
        <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Управление партнёрами</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <SearchBar placeholder="Поиск по названию..." onSearch={(q) => { setSearch(q); setCurrentPage(1); }} />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">Все категории</option>
          {EDITABLE_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={verifiedFilter}
          onChange={(e) => { setVerifiedFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="all">Все статусы</option>
          <option value="true">Верифицированные</option>
          <option value="false">Не верифицированные</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="Загрузка партнёров..." />
        </div>
      ) : partners.length === 0 ? (
        <EmptyState title="Партнёры не найдены" description="Попробуйте изменить фильтры" />
      ) : (
        <div className="space-y-4">
          <DataTable columns={columns} data={partners} />
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* ── Edit slide panel ── */}
      {editId && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/30 z-40" onClick={closeEdit} />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[var(--bg-card)] border-l border-[var(--border)] z-50 shadow-lg overflow-y-auto">
            {/* Panel header */}
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between z-10">
              <h2 className="text-xs font-semibold text-[var(--text-primary)]">Редактирование партнёра</h2>
              <button onClick={closeEdit} className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {editLoading ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner message="Загрузка..." />
              </div>
            ) : editForm ? (
              <div className="p-4 space-y-4">
                {/* Message */}
                {message && (
                  <div className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border ${
                    message.type === 'success'
                      ? 'bg-[var(--success)]/8 border-[var(--success)]/15 text-[var(--success)]'
                      : 'bg-[var(--danger)]/8 border-[var(--danger)]/15 text-[var(--danger)]'
                  }`}>
                    {message.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {message.text}
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="text-[10px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)] mb-1.5 block">Название</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-[10px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)] mb-1.5 block">Категория</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                  >
                    {EDITABLE_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)] mb-1.5 block">Описание</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                  />
                </div>

                {/* Contact section */}
                <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-[var(--bg-hover)] border-b border-[var(--border)]">
                    <span className="text-[10px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)]">Контактные данные</span>
                  </div>
                  <div className="p-3 space-y-3">
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)] mb-1 block">Телефон</label>
                      <input
                        type="tel"
                        value={editForm.contact.phone ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, contact: { ...editForm.contact, phone: e.target.value } })}
                        placeholder="+7 ..."
                        className="w-full px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)] mb-1 block">Email</label>
                      <input
                        type="email"
                        value={editForm.contact.email ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, contact: { ...editForm.contact, email: e.target.value } })}
                        className="w-full px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)] mb-1 block">Сайт</label>
                      <input
                        type="url"
                        value={editForm.contact.website ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, contact: { ...editForm.contact, website: e.target.value } })}
                        placeholder="https://..."
                        className="w-full px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)] mb-1 block">Адрес</label>
                      <input
                        type="text"
                        value={editForm.contact.address ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, contact: { ...editForm.contact, address: e.target.value } })}
                        className="w-full px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                      />
                    </div>
                  </div>
                </div>

                {/* Verified toggle */}
                <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
                  <div className="flex items-center gap-2">
                    {editForm.isVerified
                      ? <Shield className="w-4 h-4 text-[var(--success)]" />
                      : <ShieldOff className="w-4 h-4 text-[var(--text-muted)]" />
                    }
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      {editForm.isVerified ? 'Верифицирован' : 'Не верифицирован'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, isVerified: !editForm.isVerified })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      editForm.isVerified ? 'bg-[var(--success)]' : 'bg-[var(--bg-hover)]'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[var(--bg-card)] shadow transition-transform ${
                      editForm.isVerified ? 'translate-x-5' : ''
                    }`} />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || !editForm.name.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[var(--accent)] text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button
                    onClick={() => handleDelete(editId)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[var(--danger)]/10 text-[var(--danger)] text-xs font-medium rounded-lg hover:bg-[var(--danger)]/15 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Удалить
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
