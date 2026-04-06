'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Filter, Edit2, Trash2, Eye, EyeOff, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, X, Save, MapPin, Clock, Users, DollarSign,
  Mountain, Thermometer, Fish, Wind, Anchor, Footprints, Plus, Images,
  Upload, Loader2,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────
interface OperatorTour {
  id: string;
  operator_id: string;
  operator_name: string;
  title: string;
  description: string | null;
  short_description: string | null;
  location_type: string;
  activity_type: string;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  base_price: number;
  price_old: number | null;
  price_unit: string;
  max_participants: number;
  min_participants: number | null;
  duration_hours: number | null;
  duration_type: string | null;
  multi_day_count: number | null;
  season_start: string | null;
  season_end: string | null;
  seasonal_only: boolean;
  difficulty: string | null;
  weather_dependent: boolean;
  min_visibility_m: number;
  max_wind_kmh: number;
  max_precipitation_mm: number;
  is_active: boolean;
  is_published: boolean;
  included: string[] | null;
  not_included: string[] | null;
  what_to_bring: string[] | null;
  photos: string[] | null;
  tour_image: string | null;
  agent_route_id: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface MolmoAuditResult {
  verdict: 'good' | 'warn' | 'reject';
  quality: number;
  relevance: number;
  safety: number;
  reasons: string[];
  suggestions: string[];
}

// ─────────────────────────────────────────────
// Константы
// ─────────────────────────────────────────────
const LOCATION_TYPE_LABELS: Record<string, string> = {
  volcano: 'Вулкан', hot_spring: 'Термальный источник', bay: 'Бухта',
  lake: 'Озеро', mountain: 'Горы', river: 'Река', geyser: 'Гейзер', other: 'Другое',
};
const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  trekking: 'Трекинг', thermal: 'Термальный', boat_trip: 'Морская прогулка',
  rafting: 'Сплав', fishing: 'Рыбалка', bears: 'Медведи',
  helicopter: 'Вертолёт', jeep: 'Джип-тур', other: 'Другое',
};
const PRICE_UNIT_LABELS: Record<string, string> = {
  per_tour: 'за тур', per_person: 'за чел.', per_day_per_person: 'за день/чел.',
};
const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный', expert: 'Экстрим',
};

function ActivityIcon({ type, className }: { type: string; className?: string }) {
  const cls = className || 'w-3.5 h-3.5';
  switch (type) {
    case 'trekking': return <Footprints className={cls} />;
    case 'thermal': return <Thermometer className={cls} />;
    case 'fishing': return <Fish className={cls} />;
    case 'boat_trip': return <Anchor className={cls} />;
    case 'helicopter': return <Wind className={cls} />;
    case 'volcano': return <Mountain className={cls} />;
    default: return <MapPin className={cls} />;
  }
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(price);
}

// ─────────────────────────────────────────────
// Модал редактирования
// ─────────────────────────────────────────────
function EditModal({ tour, onClose, onSave }: {
  tour: OperatorTour;
  onClose: () => void;
  onSave: (id: string, data: Partial<OperatorTour>) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/tour-photo', { method: 'POST', body: fd });
      const data = await res.json() as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok || !data.url) throw new Error(data.error ?? 'Ошибка загрузки');
      setPhotos(prev => [...prev, data.url!]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Форм-стейт
  const [form, setForm] = useState({
    title: tour.title,
    description: tour.description || '',
    short_description: tour.short_description || '',
    location_name: tour.location_name,
    location_type: tour.location_type,
    activity_type: tour.activity_type,
    latitude: tour.latitude?.toString() || '',
    longitude: tour.longitude?.toString() || '',
    base_price: tour.base_price.toString(),
    price_old: tour.price_old?.toString() || '',
    price_unit: tour.price_unit,
    max_participants: tour.max_participants.toString(),
    min_participants: tour.min_participants?.toString() || '',
    duration_hours: tour.duration_hours?.toString() || '',
    duration_type: tour.duration_type || 'day',
    multi_day_count: tour.multi_day_count?.toString() || '',
    season_start: tour.season_start ? tour.season_start.substring(0, 10) : '',
    season_end: tour.season_end ? tour.season_end.substring(0, 10) : '',
    seasonal_only: tour.seasonal_only,
    difficulty: tour.difficulty || '',
    weather_dependent: tour.weather_dependent,
    min_visibility_m: (tour.min_visibility_m ?? 0).toString(),
    max_wind_kmh: (tour.max_wind_kmh ?? 0).toString(),
    max_precipitation_mm: (tour.max_precipitation_mm ?? 0).toString(),
    is_active: tour.is_active,
    is_published: tour.is_published,
    included: (tour.included || []).join('\n'),
    not_included: (tour.not_included || []).join('\n'),
    what_to_bring: (tour.what_to_bring || []).join('\n'),
    notes: tour.notes || '',
    tags: (tour.tags || []).join(', '),
  });
  const [photos, setPhotos] = useState<string[]>(tour.photos || []);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const parseLines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean);
      const parseTags = (s: string) => s.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || null,
        short_description: form.short_description || null,
        location_name: form.location_name,
        location_type: form.location_type,
        activity_type: form.activity_type,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        base_price: parseFloat(form.base_price),
        price_old: form.price_old ? parseFloat(form.price_old) : null,
        price_unit: form.price_unit,
        max_participants: parseInt(form.max_participants, 10),
        min_participants: form.min_participants ? parseInt(form.min_participants, 10) : null,
        duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : null,
        duration_type: form.duration_type || null,
        multi_day_count: form.multi_day_count ? parseInt(form.multi_day_count, 10) : null,
        season_start: form.season_start || null,
        season_end: form.season_end || null,
        seasonal_only: form.seasonal_only,
        difficulty: form.difficulty || null,
        weather_dependent: form.weather_dependent,
        min_visibility_m: parseFloat(form.min_visibility_m) || 0,
        max_wind_kmh: parseFloat(form.max_wind_kmh) || 0,
        max_precipitation_mm: parseFloat(form.max_precipitation_mm) || 0,
        is_active: form.is_active,
        is_published: form.is_published,
        included: parseLines(form.included),
        not_included: parseLines(form.not_included),
        what_to_bring: parseLines(form.what_to_bring),
        photos: photos,
        notes: form.notes || null,
        tags: parseTags(form.tags),
      };

      await onSave(tour.id, payload as Partial<OperatorTour>);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors';
  const labelCls = 'block text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1';
  const sectionCls = 'space-y-3';
  const headingCls = 'text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border)] pb-1 mb-3';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 py-6 px-4">
      <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <p className="text-[10px] text-[var(--text-muted)]">{tour.operator_name} · #{tour.id}</p>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{tour.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--bg-hover)] rounded transition-colors">
            <X className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Статус */}
          <div className={sectionCls}>
            <p className={headingCls}>Статус и публикация</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
                  className="w-3.5 h-3.5 accent-[var(--accent)]" />
                <span className="text-xs text-[var(--text-primary)]">Активен</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_published} onChange={e => set('is_published', e.target.checked)}
                  className="w-3.5 h-3.5 accent-[var(--accent)]" />
                <span className="text-xs text-[var(--text-primary)]">Опубликован</span>
              </label>
            </div>
          </div>

          {/* Основное */}
          <div className={sectionCls}>
            <p className={headingCls}>Основная информация</p>
            <div>
              <label className={labelCls}>Название</label>
              <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Короткое описание</label>
              <input className={inputCls} value={form.short_description} onChange={e => set('short_description', e.target.value)} placeholder="До 500 символов" />
            </div>
            <div>
              <label className={labelCls}>Полное описание</label>
              <textarea className={inputCls + ' min-h-[80px] resize-y'} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Заметки (только для администратора)</label>
              <textarea className={inputCls + ' min-h-[50px] resize-y'} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Внутренние комментарии" />
            </div>
          </div>

          {/* Категории */}
          <div className={sectionCls}>
            <p className={headingCls}>Категории и место</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Тип локации</label>
                <select className={inputCls} value={form.location_type} onChange={e => set('location_type', e.target.value)}>
                  {Object.entries(LOCATION_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Тип активности</label>
                <select className={inputCls} value={form.activity_type} onChange={e => set('activity_type', e.target.value)}>
                  {Object.entries(ACTIVITY_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Название места</label>
              <input className={inputCls} value={form.location_name} onChange={e => set('location_name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Широта</label>
                <input type="number" step="0.0001" className={inputCls} value={form.latitude} onChange={e => set('latitude', e.target.value)} placeholder="53.0" />
              </div>
              <div>
                <label className={labelCls}>Долгота</label>
                <input type="number" step="0.0001" className={inputCls} value={form.longitude} onChange={e => set('longitude', e.target.value)} placeholder="158.0" />
              </div>
            </div>
          </div>

          {/* Цена и участники */}
          <div className={sectionCls}>
            <p className={headingCls}>Цена и участники</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Цена (руб.)</label>
                <input type="number" min="0" className={inputCls} value={form.base_price} onChange={e => set('base_price', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Старая цена</label>
                <input type="number" min="0" className={inputCls} value={form.price_old} onChange={e => set('price_old', e.target.value)} placeholder="Зачёркнутая" />
              </div>
              <div>
                <label className={labelCls}>Единица цены</label>
                <select className={inputCls} value={form.price_unit} onChange={e => set('price_unit', e.target.value)}>
                  {Object.entries(PRICE_UNIT_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Макс. участников</label>
                <input type="number" min="1" className={inputCls} value={form.max_participants} onChange={e => set('max_participants', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Мин. участников</label>
                <input type="number" min="1" className={inputCls} value={form.min_participants} onChange={e => set('min_participants', e.target.value)} placeholder="Не указано" />
              </div>
            </div>
          </div>

          {/* Продолжительность и сезон */}
          <div className={sectionCls}>
            <p className={headingCls}>Продолжительность и сезон</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Длительность (ч.)</label>
                <input type="number" min="0" step="0.5" className={inputCls} value={form.duration_hours} onChange={e => set('duration_hours', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Тип</label>
                <select className={inputCls} value={form.duration_type} onChange={e => set('duration_type', e.target.value)}>
                  <option value="day">Однодневный</option>
                  <option value="multi_day">Многодневный</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Дней (если многодн.)</label>
                <input type="number" min="1" className={inputCls} value={form.multi_day_count} onChange={e => set('multi_day_count', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Начало сезона</label>
                <input type="date" className={inputCls} value={form.season_start} onChange={e => set('season_start', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Конец сезона</label>
                <input type="date" className={inputCls} value={form.season_end} onChange={e => set('season_end', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Сложность</label>
                <select className={inputCls} value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
                  <option value="">Не указано</option>
                  {Object.entries(DIFFICULTY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.seasonal_only} onChange={e => set('seasonal_only', e.target.checked)}
                    className="w-3.5 h-3.5 accent-[var(--accent)]" />
                  <span className="text-xs text-[var(--text-primary)]">Только в сезон</span>
                </label>
              </div>
            </div>
          </div>

          {/* Погодные условия */}
          <div className={sectionCls}>
            <p className={headingCls}>Погодные ограничения</p>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={form.weather_dependent} onChange={e => set('weather_dependent', e.target.checked)}
                className="w-3.5 h-3.5 accent-[var(--accent)]" />
              <span className="text-xs text-[var(--text-primary)]">Зависит от погоды</span>
            </label>
            {form.weather_dependent && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Видимость мин. (м)</label>
                  <input type="number" min="0" className={inputCls} value={form.min_visibility_m} onChange={e => set('min_visibility_m', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Ветер макс. (км/ч)</label>
                  <input type="number" min="0" className={inputCls} value={form.max_wind_kmh} onChange={e => set('max_wind_kmh', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Осадки макс. (мм)</label>
                  <input type="number" min="0" step="0.5" className={inputCls} value={form.max_precipitation_mm} onChange={e => set('max_precipitation_mm', e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Что включено */}
          <div className={sectionCls}>
            <p className={headingCls}>Состав тура</p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={labelCls}>Включено (каждый пункт с новой строки)</label>
                <textarea className={inputCls + ' min-h-[70px] resize-y font-mono'} value={form.included} onChange={e => set('included', e.target.value)} placeholder="Трансфер&#10;Обед&#10;Снаряжение" />
              </div>
              <div>
                <label className={labelCls}>Не включено</label>
                <textarea className={inputCls + ' min-h-[50px] resize-y font-mono'} value={form.not_included} onChange={e => set('not_included', e.target.value)} placeholder="Страховка&#10;Авиабилеты" />
              </div>
              <div>
                <label className={labelCls}>Что взять с собой</label>
                <textarea className={inputCls + ' min-h-[50px] resize-y font-mono'} value={form.what_to_bring} onChange={e => set('what_to_bring', e.target.value)} placeholder="Удобная обувь&#10;Дождевик" />
              </div>
            </div>
          </div>

          {/* Фотографии */}
          <div className={sectionCls}>
            <p className={headingCls}>Фотографии ({photos.length})</p>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt={`Фото ${idx + 1}`}
                      className="w-full h-20 object-contain bg-[var(--bg-hover)] rounded border border-[var(--border)]"
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPhotos(p => p.filter((_, i) => i !== idx))}
                        className="p-1 bg-[var(--danger)] rounded text-white hover:bg-[var(--danger)]/80"
                        title="Удалить фото"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => setPhotos(p => { const a = [...p]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; return a; })}
                          className="p-1 bg-[var(--bg-card)] rounded text-[var(--text-primary)] hover:bg-[var(--bg-hover)] text-[10px] font-bold"
                          title="Переместить влево"
                        >←</button>
                      )}
                      {idx < photos.length - 1 && (
                        <button
                          type="button"
                          onClick={() => setPhotos(p => { const a = [...p]; [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; return a; })}
                          className="p-1 bg-[var(--bg-card)] rounded text-[var(--text-primary)] hover:bg-[var(--bg-hover)] text-[10px] font-bold"
                          title="Переместить вправо"
                        >→</button>
                      )}
                    </div>
                    <span className="absolute bottom-0.5 left-1 text-[9px] text-white/80 bg-black/50 px-1 rounded">{idx + 1}</span>
                  </div>
                ))}
              </div>
            )}
            {photos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-4 border border-dashed border-[var(--border)] rounded mb-3 text-[var(--text-muted)]">
                <Images className="w-5 h-5 mb-1" />
                <p className="text-[10px]">Нет фотографий</p>
              </div>
            )}
            {/* Upload from file */}
            <div className="mb-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--accent)] text-[var(--accent)] rounded hover:bg-[var(--accent)]/10 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? 'Загружается...' : 'Загрузить с устройства'}
              </button>
            </div>
            {/* Or add by URL */}
            <div className="flex gap-2">
              <input
                className={inputCls + ' flex-1'}
                value={newPhotoUrl}
                onChange={e => setNewPhotoUrl(e.target.value)}
                placeholder="https://... или /images/tours/photo.jpg"
                onKeyDown={e => {
                  if (e.key === 'Enter' && newPhotoUrl.trim()) {
                    e.preventDefault();
                    setPhotos(p => [...p, newPhotoUrl.trim()]);
                    setNewPhotoUrl('');
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newPhotoUrl.trim()) {
                    setPhotos(p => [...p, newPhotoUrl.trim()]);
                    setNewPhotoUrl('');
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border)] rounded hover:bg-[var(--border)] transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> По URL
              </button>
            </div>
            <p className="text-[9px] text-[var(--text-muted)] mt-1">Первое фото — главное. Hover на фото → удалить или поменять порядок.</p>
          </div>

          {/* Теги */}
          <div className={sectionCls}>
            <p className={headingCls}>Теги</p>
            <div>
              <label className={labelCls}>Теги через запятую</label>
              <input className={inputCls} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="медведи, вулкан, джип" />
            </div>
          </div>

        </div>

        {/* Footer */}
        {error && (
          <div className="mx-5 mb-3 px-3 py-2 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded text-xs text-[var(--danger)]">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)]">
          <button onClick={onClose} className="px-4 py-1.5 text-xs border border-[var(--border)] rounded hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors">
            Отмена
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded font-medium transition-colors disabled:opacity-50">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Основной компонент
// ─────────────────────────────────────────────
export default function ToursManagement() {
  const molmoPilotEnabled = process.env.NEXT_PUBLIC_MOLMO_PILOT_ENABLED === 'true';
  const [tours, setTours] = useState<OperatorTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // offset-based
  const limit = 20;

  const [search, setSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [publishedFilter, setPublishedFilter] = useState('');

  const [editingTour, setEditingTour] = useState<OperatorTour | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [molmoLoadingByTour, setMolmoLoadingByTour] = useState<Record<string, boolean>>({});
  const [molmoAuditByTour, setMolmoAuditByTour] = useState<Record<string, MolmoAuditResult>>({});
  const [molmoError, setMolmoError] = useState<string | null>(null);

  const fetchTours = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      if (search) params.set('search', search);
      if (activityFilter) params.set('activity_type', activityFilter);
      if (locationFilter) params.set('location_type', locationFilter);
      if (publishedFilter) params.set('is_published', publishedFilter);

      const res = await fetch(`/api/admin/operator-tours?${params}`);
      const json: unknown = await res.json();
      if (typeof json === 'object' && json !== null && 'success' in json && (json as { success: boolean }).success) {
        const j = json as unknown as { data: OperatorTour[]; meta: { total: number } };
        setTours(j.data);
        setTotal(j.meta.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, activityFilter, locationFilter, publishedFilter]);

  useEffect(() => { fetchTours(); }, [fetchTours]);

  async function handleSave(id: string, data: Partial<OperatorTour>) {
    const res = await fetch(`/api/admin/operator-tours/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json: unknown = await res.json();
    if (!res.ok) {
      let msg = (typeof json === 'object' && json !== null && 'error' in json)
        ? String((json as { error: unknown }).error) : 'Ошибка сервера';
      if (typeof json === 'object' && json !== null && 'details' in json) {
        const d = (json as { details: { fieldErrors?: Record<string, string[]> } }).details;
        const fields = Object.entries(d.fieldErrors ?? {}).map(([k, v]) => `${k}: ${v[0]}`).join('; ');
        if (fields) msg += ` (${fields})`;
      }
      throw new Error(msg);
    }
    fetchTours();
  }

  async function handleToggle(tour: OperatorTour, field: 'is_published' | 'is_active') {
    setActionLoading(`${field}-${tour.id}`);
    try {
      await fetch(`/api/admin/operator-tours/${tour.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !tour[field] }),
      });
      fetchTours();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(tour: OperatorTour) {
    if (!confirm(`Удалить тур «${tour.title}»? Действие необратимо.`)) return;
    setActionLoading(`del-${tour.id}`);
    try {
      await fetch(`/api/admin/operator-tours/${tour.id}`, { method: 'DELETE' });
      fetchTours();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMolmoAudit(tour: OperatorTour) {
    if (!molmoPilotEnabled) return;

    setMolmoError(null);
    setMolmoLoadingByTour(prev => ({ ...prev, [tour.id]: true }));

    try {
      const firstPhoto = Array.isArray(tour.photos) ? tour.photos.find(p => /^https?:\/\//.test(p)) : null;
      const fallbackImage = (tour.tour_image && /^https?:\/\//.test(tour.tour_image)) ? tour.tour_image : firstPhoto;
      const numericTourId = Number(tour.id);

      const payload: Record<string, unknown> = {};
      if (Number.isInteger(numericTourId) && numericTourId > 0) {
        payload.tourId = numericTourId;
      } else if (fallbackImage) {
        payload.imageUrl = fallbackImage;
      }

      if (!payload.tourId && !payload.imageUrl) {
        setMolmoError('Для этого тура нет доступного изображения (HTTP URL) для Molmo-аудита.');
        return;
      }

      const res = await fetch('/api/agents/molmo-pilot/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json: unknown = await res.json();
      if (!res.ok || typeof json !== 'object' || json === null || !('success' in json)) {
        const msg = (typeof json === 'object' && json !== null && 'error' in json)
          ? String((json as { error: unknown }).error)
          : 'Ошибка Molmo-аудита';
        throw new Error(msg);
      }

      const result = json as { success: boolean; audit?: MolmoAuditResult };
      if (!result.success || !result.audit) {
        throw new Error('Molmo-аудит не вернул результат');
      }

      setMolmoAuditByTour(prev => ({ ...prev, [tour.id]: result.audit! }));
    } catch (e) {
      setMolmoError(e instanceof Error ? e.message : 'Ошибка Molmo-аудита');
    } finally {
      setMolmoLoadingByTour(prev => ({ ...prev, [tour.id]: false }));
    }
  }

  const auditedTours = tours
    .map(tour => ({ tour, audit: molmoAuditByTour[tour.id] }))
    .filter(item => Boolean(item.audit));

  const totalPages = Math.ceil(total / limit);
  const selectCls = 'px-3 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  return (
    <div className="p-5 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-[var(--text-primary)]">Туры операторов</h1>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{total} туров в базе</p>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-[200px] px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
          <input
            className="flex-1 text-xs bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            placeholder="Поиск по названию или оператору..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <select className={selectCls} value={activityFilter} onChange={e => { setActivityFilter(e.target.value); setPage(0); }}>
          <option value="">Все активности</option>
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className={selectCls} value={locationFilter} onChange={e => { setLocationFilter(e.target.value); setPage(0); }}>
          <option value="">Все локации</option>
          {Object.entries(LOCATION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className={selectCls} value={publishedFilter} onChange={e => { setPublishedFilter(e.target.value); setPage(0); }}>
          <option value="">Все статусы</option>
          <option value="true">Опубликованные</option>
          <option value="false">Черновики</option>
        </select>
      </div>

      {/* Таблица */}
      {molmoError && (
        <div className="px-3 py-2 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded text-xs text-[var(--warning)]">
          {molmoError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tours.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Filter className="w-8 h-8 text-[var(--text-muted)] mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Туры не найдены</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-hover)]">
                  <th className="px-3 py-2 text-left font-medium text-[var(--text-muted)]">Тур / оператор</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--text-muted)]">Тип</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--text-muted)]">Цена</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--text-muted)]">Участники</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--text-muted)]">Статус</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--text-muted)]">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {tours.map(tour => (
                  <tr key={tour.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-3 py-2.5 max-w-xs">
                      <p className="font-medium text-[var(--text-primary)] truncate">{tour.title}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{tour.operator_name} · {tour.location_name}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                          <ActivityIcon type={tour.activity_type} />
                          {ACTIVITY_TYPE_LABELS[tour.activity_type] || tour.activity_type}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {LOCATION_TYPE_LABELS[tour.location_type] || tour.location_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-mono font-medium text-[var(--text-primary)]">{formatPrice(tour.base_price)}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{PRICE_UNIT_LABELS[tour.price_unit] || tour.price_unit}</p>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{tour.min_participants ?? 1}–{tour.max_participants}</span>
                      </div>
                      {tour.duration_hours && (
                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[var(--text-muted)]">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{tour.duration_hours}ч</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium w-fit ${tour.is_published ? 'bg-[var(--success)]/15 text-[var(--success)]' : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}>
                          {tour.is_published ? 'Опубликован' : 'Черновик'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium w-fit ${tour.is_active ? 'bg-[var(--ocean)]/15 text-[var(--ocean)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>
                          {tour.is_active ? 'Активен' : 'Неактивен'}
                        </span>
                        {molmoAuditByTour[tour.id] && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium w-fit ${
                              molmoAuditByTour[tour.id].verdict === 'good'
                                ? 'bg-[var(--success)]/15 text-[var(--success)]'
                                : molmoAuditByTour[tour.id].verdict === 'warn'
                                  ? 'bg-[var(--warning)]/15 text-[var(--warning)]'
                                  : 'bg-[var(--danger)]/10 text-[var(--danger)]'
                            }`}
                          >
                            Molmo: {molmoAuditByTour[tour.id].verdict}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {/* Molmo-аудит */}
                        {molmoPilotEnabled && (
                          <button
                            onClick={() => handleMolmoAudit(tour)}
                            disabled={Boolean(molmoLoadingByTour[tour.id])}
                            title="Molmo-аудит фото"
                            className="p-1.5 hover:bg-[var(--bg-hover)] rounded transition-colors disabled:opacity-40"
                          >
                            {molmoLoadingByTour[tour.id]
                              ? <Loader2 className="w-3.5 h-3.5 text-[var(--accent)] animate-spin" />
                              : <Images className="w-3.5 h-3.5 text-[var(--accent)]" />}
                          </button>
                        )}
                        {/* Публикация */}
                        <button
                          onClick={() => handleToggle(tour, 'is_published')}
                          disabled={actionLoading === `is_published-${tour.id}`}
                          title={tour.is_published ? 'Снять с публикации' : 'Опубликовать'}
                          className="p-1.5 hover:bg-[var(--bg-hover)] rounded transition-colors disabled:opacity-40"
                        >
                          {tour.is_published
                            ? <EyeOff className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            : <Eye className="w-3.5 h-3.5 text-[var(--success)]" />}
                        </button>
                        {/* Активность */}
                        <button
                          onClick={() => handleToggle(tour, 'is_active')}
                          disabled={actionLoading === `is_active-${tour.id}`}
                          title={tour.is_active ? 'Деактивировать' : 'Активировать'}
                          className="p-1.5 hover:bg-[var(--bg-hover)] rounded transition-colors disabled:opacity-40"
                        >
                          {tour.is_active
                            ? <XCircle className="w-3.5 h-3.5 text-[var(--warning)]" />
                            : <CheckCircle className="w-3.5 h-3.5 text-[var(--success)]" />}
                        </button>
                        {/* Редактировать */}
                        <button
                          onClick={() => setEditingTour(tour)}
                          title="Редактировать"
                          className="p-1.5 hover:bg-[var(--bg-hover)] rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[var(--ocean)]" />
                        </button>
                        {/* Удалить */}
                        <button
                          onClick={() => handleDelete(tour)}
                          disabled={actionLoading === `del-${tour.id}`}
                          title="Удалить"
                          className="p-1.5 hover:bg-[var(--bg-hover)] rounded transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[var(--text-muted)]">
            {page * limit + 1}–{Math.min((page + 1) * limit, total)} из {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 border border-[var(--border)] rounded hover:bg-[var(--bg-hover)] disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
            <span className="px-3 py-1 text-xs text-[var(--text-secondary)]">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 border border-[var(--border)] rounded hover:bg-[var(--bg-hover)] disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          </div>
        </div>
      )}

      {/* Результаты Molmo-пилота */}
      {molmoPilotEnabled && auditedTours.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 space-y-2">
          <div>
            <h2 className="text-xs font-semibold text-[var(--text-primary)]">Molmo Pilot: результаты на текущей странице</h2>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{auditedTours.length} туров с завершённым аудитом</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {auditedTours.map(({ tour, audit }) => (
              <div key={tour.id} className="border border-[var(--border)] rounded p-2.5 bg-[var(--bg-primary)]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">{tour.title}</p>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      audit!.verdict === 'good'
                        ? 'bg-[var(--success)]/15 text-[var(--success)]'
                        : audit!.verdict === 'warn'
                          ? 'bg-[var(--warning)]/15 text-[var(--warning)]'
                          : 'bg-[var(--danger)]/10 text-[var(--danger)]'
                    }`}
                  >
                    {audit!.verdict}
                  </span>
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-2 text-[10px] text-[var(--text-secondary)]">
                  <span>Q: {audit!.quality}</span>
                  <span>R: {audit!.relevance}</span>
                  <span>S: {audit!.safety}</span>
                </div>
                {audit!.reasons.length > 0 && (
                  <p className="mt-1.5 text-[10px] text-[var(--text-muted)] line-clamp-2">{audit!.reasons.join(' · ')}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Модал редактирования */}
      {editingTour && (
        <EditModal
          tour={editingTour}
          onClose={() => setEditingTour(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
