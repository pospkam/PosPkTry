'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Save, X, Plus, Images, ArrowLeft,
  MapPin, Clock, Users, DollarSign, Mountain, Upload, Loader2,
  CalendarDays,
} from 'lucide-react';

// ─── Типы ───────────────────────────────────────────────────────────────────

interface TourData {
  id: string;
  title: string;
  short_description: string | null;
  description: string | null;
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
  is_active: boolean;
  is_published: boolean;
  included: string[] | null;
  not_included: string[] | null;
  what_to_bring: string[] | null;
  photos: string[] | null;
  tour_image: string | null;
}

// ─── Константы ──────────────────────────────────────────────────────────────

const LOCATION_TYPES = [
  ['volcano', 'Вулкан'], ['hot_spring', 'Термальный источник'], ['bay', 'Бухта'],
  ['lake', 'Озеро'], ['mountain', 'Горы'], ['river', 'Река'],
  ['geyser', 'Гейзер'], ['other', 'Другое'],
];
const ACTIVITY_TYPES = [
  ['trekking', 'Трекинг'], ['thermal', 'Термальный'], ['boat_trip', 'Морская прогулка'],
  ['rafting', 'Сплав'], ['fishing', 'Рыбалка'], ['bears', 'Медведи'],
  ['helicopter', 'Вертолёт'], ['jeep', 'Джип-тур'], ['other', 'Другое'],
];
const DIFFICULTY_TYPES = [
  ['easy', 'Лёгкий'], ['medium', 'Средний'], ['hard', 'Сложный'], ['expert', 'Экстрим'],
];

export default function EditTourClient() {
  const router = useRouter();
  const params = useParams();
  const tourId = params.id as string;

  const [tour, setTour] = useState<TourData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Форм-стейт
  const [form, setForm] = useState({
    title: '',
    short_description: '',
    description: '',
    location_type: 'other',
    activity_type: 'other',
    location_name: '',
    latitude: '',
    longitude: '',
    base_price: '',
    price_old: '',
    price_unit: 'per_person',
    max_participants: '1',
    min_participants: '',
    duration_hours: '',
    duration_type: 'day',
    multi_day_count: '',
    season_start: '',
    season_end: '',
    seasonal_only: false,
    difficulty: '',
    weather_dependent: true,
    is_active: true,
    is_published: false,
    included: '',
    not_included: '',
    what_to_bring: '',
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Availability
  interface AvailSlot { id: string; date: string; available_slots: number; booked_slots: number; base_price_override: number | null }
  const [avail, setAvail] = useState<AvailSlot[]>([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newSlots, setNewSlots] = useState('8');
  const [addingSlot, setAddingSlot] = useState(false);

  const loadAvail = useCallback(async () => {
    setAvailLoading(true);
    try {
      const res = await fetch(`/api/hub/operator/tours/${tourId}/availability?from=${new Date().toISOString().slice(0,10)}&to=${new Date(Date.now()+365*86400000).toISOString().slice(0,10)}`);
      const json = await res.json() as { success: boolean; data: AvailSlot[] };
      if (json.success) setAvail(json.data);
    } catch { /* ignore */ }
    finally { setAvailLoading(false); }
  }, [tourId]);

  async function addAvailSlot() {
    if (!newDate || !newSlots) return;
    setAddingSlot(true);
    try {
      const res = await fetch(`/api/hub/operator/tours/${tourId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: [{ date: newDate, available_slots: parseInt(newSlots, 10) }] }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Ошибка');
      setNewDate('');
      setNewSlots('8');
      await loadAvail();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка добавления даты');
    } finally { setAddingSlot(false); }
  }

  async function handleFileUpload(file: File) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/tour-photo', { method: 'POST', body: fd });
      const data = await res.json() as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok || !data.url) {
        throw new Error(data.error ?? 'Ошибка загрузки');
      }
      setPhotos(prev => [...prev, data.url!]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  useEffect(() => { void loadAvail(); }, [loadAvail]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/hub/operator/tours/${tourId}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || 'Ошибка загрузки тура');
          return;
        }
        const t: TourData = json.data;
        setTour(t);
        setPhotos(t.photos || []);
        setForm({
          title: t.title,
          short_description: t.short_description || '',
          description: t.description || '',
          location_type: t.location_type,
          activity_type: t.activity_type,
          location_name: t.location_name,
          latitude: t.latitude?.toString() || '',
          longitude: t.longitude?.toString() || '',
          base_price: t.base_price.toString(),
          price_old: t.price_old?.toString() || '',
          price_unit: t.price_unit || 'per_person',
          max_participants: t.max_participants.toString(),
          min_participants: t.min_participants?.toString() || '',
          duration_hours: t.duration_hours?.toString() || '',
          duration_type: t.duration_type || 'day',
          multi_day_count: t.multi_day_count?.toString() || '',
          season_start: t.season_start?.slice(0, 10) || '',
          season_end: t.season_end?.slice(0, 10) || '',
          seasonal_only: t.seasonal_only,
          difficulty: t.difficulty || '',
          weather_dependent: t.weather_dependent,
          is_active: t.is_active,
          is_published: t.is_published,
          included: (t.included || []).join('\n'),
          not_included: (t.not_included || []).join('\n'),
          what_to_bring: (t.what_to_bring || []).join('\n'),
        });
      } catch {
        setError('Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tourId]);

  function setF<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function parseLines(s: string) {
    return s.split('\n').map(l => l.trim()).filter(Boolean);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        short_description: form.short_description || null,
        description: form.description || null,
        location_type: form.location_type,
        activity_type: form.activity_type,
        location_name: form.location_name,
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
        is_active: form.is_active,
        is_published: form.is_published,
        included: parseLines(form.included),
        not_included: parseLines(form.not_included),
        what_to_bring: parseLines(form.what_to_bring),
        photos,
      };

      const res = await fetch(`/api/hub/operator/tours/${tourId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Ошибка сохранения');
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  }

  const inp = 'w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors';
  const lbl = 'block text-xs font-medium text-[var(--text-muted)] mb-1';
  const heading = 'text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border)] pb-1 mb-4';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="p-6 text-center">
        <Mountain className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2" />
        <p className="text-sm text-[var(--text-secondary)]">{error || 'Тур не найден'}</p>
        <button onClick={() => router.push('/hub/operator/tours')}
          className="mt-4 text-xs text-[var(--ocean)] hover:underline">
          Вернуться к турам
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 max-w-3xl mx-auto space-y-6">
      {/* Заголовок */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/hub/operator/tours')}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Все туры
          </button>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Редактирование тура</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">#{tour.id} · {tour.title}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => router.push('/hub/operator/tours')}
            className="px-4 py-2 text-xs border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors">
            Отмена
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Статус сохранения */}
      {success && (
        <div className="px-4 py-2 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-lg text-xs text-[var(--success)]">
          Изменения сохранены
        </div>
      )}
      {error && (
        <div className="px-4 py-2 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg text-xs text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* Статус и публикация */}
      <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 space-y-3">
        <p className={heading}>Статус</p>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setF('is_active', e.target.checked)}
              className="w-4 h-4 accent-[var(--accent)]" />
            <span className="text-sm text-[var(--text-primary)]">Активен</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_published} onChange={e => setF('is_published', e.target.checked)}
              className="w-4 h-4 accent-[var(--accent)]" />
            <span className="text-sm text-[var(--text-primary)]">Опубликован</span>
          </label>
        </div>
      </section>

      {/* Основное */}
      <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <p className={heading}>Основная информация</p>
        <div>
          <label className={lbl}>Название тура</label>
          <input className={inp} value={form.title} onChange={e => setF('title', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Короткое описание (до 500 символов)</label>
          <input className={inp} value={form.short_description} onChange={e => setF('short_description', e.target.value)} placeholder="Захватывающий тур на вулкан..." />
        </div>
        <div>
          <label className={lbl}>Полное описание</label>
          <textarea className={inp + ' min-h-[120px] resize-y'} value={form.description} onChange={e => setF('description', e.target.value)} />
        </div>
      </section>

      {/* Фотографии */}
      <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 space-y-3">
        <p className={heading}>Фотографии ({photos.length})</p>
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt={`Фото ${idx + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-[var(--border)]"
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1.5">
                  <button type="button"
                    onClick={() => setPhotos(p => p.filter((_, i) => i !== idx))}
                    className="p-1.5 bg-[var(--danger)] rounded-lg text-white hover:bg-[var(--danger)]/80">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {idx > 0 && (
                    <button type="button"
                      onClick={() => setPhotos(p => { const a=[...p]; [a[idx-1],a[idx]]=[a[idx],a[idx-1]]; return a; })}
                      className="p-1.5 bg-[var(--bg-card)] rounded-lg text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--bg-hover)]">←</button>
                  )}
                  {idx < photos.length - 1 && (
                    <button type="button"
                      onClick={() => setPhotos(p => { const a=[...p]; [a[idx],a[idx+1]]=[a[idx+1],a[idx]]; return a; })}
                      className="p-1.5 bg-[var(--bg-card)] rounded-lg text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--bg-hover)]">→</button>
                  )}
                </div>
                {idx === 0 && (
                  <span className="absolute top-1 left-1 text-[9px] bg-[var(--accent)] text-white px-1.5 py-0.5 rounded font-medium">Главное</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 border border-dashed border-[var(--border)] rounded-lg text-[var(--text-muted)] mb-3">
            <Images className="w-6 h-6 mb-2" />
            <p className="text-xs">Нет фотографий</p>
          </div>
        )}
        {/* Upload from file */}
        <div>
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
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[var(--accent)] text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/10 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Загружается...' : 'Загрузить фото с устройства'}
          </button>
        </div>
        {/* Or add by URL */}
        <div className="flex gap-2">
          <input
            className={inp + ' flex-1'}
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
          <button type="button"
            onClick={() => {
              if (newPhotoUrl.trim()) {
                setPhotos(p => [...p, newPhotoUrl.trim()]);
                setNewPhotoUrl('');
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border)] transition-colors whitespace-nowrap border border-[var(--border)]">
            <Plus className="w-4 h-4" /> По URL
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-muted)]">Первое фото — главное на карточке. Hover → удалить или поменять порядок.</p>
      </section>

      {/* Категории */}
      <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <p className={heading}>Категории и место</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Тип локации</label>
            <select className={inp} value={form.location_type} onChange={e => setF('location_type', e.target.value)}>
              {LOCATION_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Тип активности</label>
            <select className={inp} value={form.activity_type} onChange={e => setF('activity_type', e.target.value)}>
              {ACTIVITY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={lbl}>Название места</label>
          <input className={inp} value={form.location_name} onChange={e => setF('location_name', e.target.value)} placeholder="Авачинский вулкан" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}><MapPin className="w-3 h-3 inline mr-1" />Широта</label>
            <input type="number" step="0.0001" className={inp} value={form.latitude} onChange={e => setF('latitude', e.target.value)} placeholder="53.0" />
          </div>
          <div>
            <label className={lbl}><MapPin className="w-3 h-3 inline mr-1" />Долгота</label>
            <input type="number" step="0.0001" className={inp} value={form.longitude} onChange={e => setF('longitude', e.target.value)} placeholder="158.0" />
          </div>
        </div>
      </section>

      {/* Цена */}
      <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <p className={heading}>Цена и участники</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={lbl}><DollarSign className="w-3 h-3 inline mr-1" />Цена (₽)</label>
            <input type="number" min="0" className={inp} value={form.base_price} onChange={e => setF('base_price', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Старая цена</label>
            <input type="number" min="0" className={inp} value={form.price_old} onChange={e => setF('price_old', e.target.value)} placeholder="Зачёркнутая" />
          </div>
          <div>
            <label className={lbl}>Единица цены</label>
            <select className={inp} value={form.price_unit} onChange={e => setF('price_unit', e.target.value)}>
              <option value="per_person">за человека</option>
              <option value="per_tour">за тур</option>
              <option value="per_day_per_person">за день/чел.</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}><Users className="w-3 h-3 inline mr-1" />Макс. участников</label>
            <input type="number" min="1" className={inp} value={form.max_participants} onChange={e => setF('max_participants', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Мин. участников</label>
            <input type="number" min="1" className={inp} value={form.min_participants} onChange={e => setF('min_participants', e.target.value)} placeholder="Не указано" />
          </div>
        </div>
      </section>

      {/* Длительность и сезон */}
      <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <p className={heading}>Длительность и сезон</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={lbl}><Clock className="w-3 h-3 inline mr-1" />Длительность (ч.)</label>
            <input type="number" min="0" step="0.5" className={inp} value={form.duration_hours} onChange={e => setF('duration_hours', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Тип</label>
            <select className={inp} value={form.duration_type} onChange={e => setF('duration_type', e.target.value)}>
              <option value="day">Однодневный</option>
              <option value="multi_day">Многодневный</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Дней (если многодн.)</label>
            <input type="number" min="1" className={inp} value={form.multi_day_count} onChange={e => setF('multi_day_count', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Начало сезона</label>
            <input type="date" className={inp} value={form.season_start} onChange={e => setF('season_start', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Конец сезона</label>
            <input type="date" className={inp} value={form.season_end} onChange={e => setF('season_end', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Сложность</label>
            <select className={inp} value={form.difficulty} onChange={e => setF('difficulty', e.target.value)}>
              <option value="">Не указано</option>
              {DIFFICULTY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.seasonal_only} onChange={e => setF('seasonal_only', e.target.checked)}
                className="w-4 h-4 accent-[var(--accent)]" />
              <span className="text-sm text-[var(--text-primary)]">Только в сезон</span>
            </label>
          </div>
        </div>
      </section>

      {/* Состав тура */}
      <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <p className={heading}>Состав тура</p>
        <div>
          <label className={lbl}>Включено (каждый пункт — с новой строки)</label>
          <textarea className={inp + ' min-h-[80px] resize-y font-mono text-xs'} value={form.included}
            onChange={e => setF('included', e.target.value)} placeholder={'Трансфер\nОбед\nСнаряжение'} />
        </div>
        <div>
          <label className={lbl}>Не включено</label>
          <textarea className={inp + ' min-h-[60px] resize-y font-mono text-xs'} value={form.not_included}
            onChange={e => setF('not_included', e.target.value)} placeholder={'Страховка\nАвиабилеты'} />
        </div>
        <div>
          <label className={lbl}>Что взять с собой</label>
          <textarea className={inp + ' min-h-[60px] resize-y font-mono text-xs'} value={form.what_to_bring}
            onChange={e => setF('what_to_bring', e.target.value)} placeholder={'Удобная обувь\nДождевик'} />
        </div>
      </section>

      {/* Расписание / доступность */}
      <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className={heading} style={{ marginBottom: 0 }}>
            <CalendarDays className="w-3.5 h-3.5 inline mr-1.5" />
            Расписание (ближайшие даты туров)
          </p>
          <button type="button" onClick={loadAvail} disabled={availLoading}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            {availLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Обновить'}
          </button>
        </div>

        {/* Add new date */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className={lbl}>Дата</label>
            <input
              type="date"
              className={inp}
              value={newDate}
              min={new Date().toISOString().slice(0,10)}
              onChange={e => setNewDate(e.target.value)}
            />
          </div>
          <div className="w-28">
            <label className={lbl}>Мест</label>
            <input
              type="number"
              min="1"
              max="999"
              className={inp}
              value={newSlots}
              onChange={e => setNewSlots(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={addAvailSlot}
            disabled={addingSlot || !newDate || !newSlots}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {addingSlot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Добавить
          </button>
        </div>

        {/* Existing slots */}
        {availLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : avail.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
            Дат пока нет. Добавьте первую дату выше — туристы смогут бронировать конкретные числа.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {avail.map(slot => {
              const d = new Date(slot.date + 'T12:00:00');
              const dateStr = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
              const pct = slot.available_slots > 0 ? Math.round((slot.booked_slots / slot.available_slots) * 100) : 0;
              const isFull = slot.booked_slots >= slot.available_slots;
              return (
                <div key={slot.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-sm font-medium w-36 shrink-0" style={{ color: 'var(--text-primary)' }}>{dateStr}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${pct}%`,
                        background: isFull ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--success)',
                      }} />
                    </div>
                    <span className="text-xs whitespace-nowrap" style={{ color: isFull ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {slot.booked_slots}/{slot.available_slots} мест
                    </span>
                  </div>
                  {slot.base_price_override && (
                    <span className="text-xs font-medium shrink-0" style={{ color: 'var(--accent)' }}>
                      {Number(slot.base_price_override).toLocaleString('ru-RU')} ₽
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Туристы видят только даты с свободными местами. Занятые даты скрыты автоматически.
        </p>
      </section>

      {/* Кнопка внизу */}
      <div className="flex justify-end gap-3 pb-6">
        <button onClick={() => router.push('/hub/operator/tours')}
          className="px-5 py-2.5 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors">
          Отмена
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </div>
    </div>
  );
}
