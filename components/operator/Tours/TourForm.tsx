'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, Upload, Loader2 } from 'lucide-react';
import { TourFormData } from '@/types/operator';

interface KamchatkaRoute {
  id: string;
  title: string;
  category: string;
  description: string;
  lat: number | null;
  lng: number | null;
  sourceName: string | null;
}

interface TourFormProps {
  initialData?: Partial<TourFormData>;
  onSubmit: (data: TourFormData) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

type FieldErrors = Partial<Record<keyof TourFormData, string>>;

function validate(data: TourFormData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.name.trim() || data.name.trim().length < 5)
    errors.name = 'Название — минимум 5 символов';

  if (!data.description.trim() || data.description.trim().length < 20)
    errors.description = 'Описание — минимум 20 символов';

  if (!data.price || data.price <= 0)
    errors.price = 'Цена должна быть больше 0';

  if (!data.duration || data.duration <= 0)
    errors.duration = 'Укажите длительность (часов)';

  if (data.minGroupSize < 1)
    errors.minGroupSize = 'Минимум 1 участник';

  if (data.maxGroupSize < data.minGroupSize)
    errors.maxGroupSize = 'Максимум не может быть меньше минимума';

  return errors;
}

export function TourForm({ initialData, onSubmit, onCancel, isEdit = false }: TourFormProps) {
  const [loading, setLoading]       = useState(false);
  const [routes, setRoutes]         = useState<KamchatkaRoute[]>([]);
  const [errors, setErrors]         = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<TourFormData>({
    name:          initialData?.name          ?? '',
    description:   initialData?.description   ?? '',
    category:      initialData?.category      ?? 'fishing',
    difficulty:    initialData?.difficulty    ?? 'medium',
    duration:      initialData?.duration      ?? 4,
    maxGroupSize:  initialData?.maxGroupSize  ?? 15,
    minGroupSize:  initialData?.minGroupSize  ?? 1,
    price:         initialData?.price         ?? 0,
    currency:      initialData?.currency      ?? 'RUB',
    includes:      initialData?.includes      ?? [],
    excludes:      initialData?.excludes      ?? [],
    itinerary:     initialData?.itinerary     ?? [],
    images:        initialData?.images        ?? [],
    tourImage:     initialData?.tourImage     ?? '',
    routeId:       initialData?.routeId,
  });

  const [newInclude, setNewInclude] = useState('');
  const [newExclude, setNewExclude] = useState('');

  useEffect(() => {
    fetch(`/api/kamchatka-routes?limit=200`)
      .then(r => r.json())
      .then(j => { if (j.success) setRoutes(j.data ?? []); })
      .catch(() => setRoutes([]));
  }, []);

  function handleChange<K extends keyof TourFormData>(field: K, value: TourFormData[K]) {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  function addInclude() {
    const v = newInclude.trim();
    if (v) { handleChange('includes', [...formData.includes, v]); setNewInclude(''); }
  }

  function removeInclude(i: number) {
    handleChange('includes', (formData.includes as string[]).filter((_, idx) => idx !== i));
  }

  function addExclude() {
    const v = newExclude.trim();
    if (v) { handleChange('excludes', [...formData.excludes, v]); setNewExclude(''); }
  }

  function removeExclude(i: number) {
    handleChange('excludes', (formData.excludes as string[]).filter((_, idx) => idx !== i));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/hub/operator/upload', { method: 'POST', body: fd });
      const json = await res.json() as { success: boolean; url?: string; error?: string };
      if (!json.success || !json.url) throw new Error(json.error ?? 'Ошибка загрузки');
      handleChange('tourImage', json.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    const fieldErrors = validate(formData);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      // scroll to first error
      const firstKey = Object.keys(fieldErrors)[0];
      document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Ошибка при сохранении тура');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">

      {/* Основная информация */}
      <section className="ds-card p-6 space-y-5">
        <h2 className="ds-h2">Основная информация</h2>

        {/* Название */}
        <div id="field-name">
          <label htmlFor="tour-name" className="ds-label mb-1">
            Название тура <span className="text-[var(--accent)]">*</span>
          </label>
          <input
            id="tour-name"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="Например: Сплав по реке Быстрой — 3 дня"
            className={`ds-input w-full ${errors.name ? 'border-[var(--danger)]' : ''}`}
          />
          {errors.name && <p className="mt-1 text-xs text-[var(--danger)] flex items-center gap-1"><AlertCircle size={12} />{errors.name}</p>}
        </div>

        {/* Описание */}
        <div id="field-description">
          <label htmlFor="tour-description" className="ds-label mb-1">
            Описание <span className="text-[var(--accent)]">*</span>
          </label>
          <textarea
            id="tour-description"
            value={formData.description}
            onChange={e => handleChange('description', e.target.value)}
            placeholder="Подробное описание тура — программа, особенности, уровень подготовки..."
            rows={5}
            className={`ds-input w-full resize-none ${errors.description ? 'border-[var(--danger)]' : ''}`}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.description
              ? <p className="text-xs text-[var(--danger)] flex items-center gap-1"><AlertCircle size={12} />{errors.description}</p>
              : <span />}
            <span className={`text-xs ${formData.description.length < 20 ? 'text-[var(--text-muted)]' : 'text-[var(--success)]'}`}>
              {formData.description.length} / 2000
            </span>
          </div>
        </div>

        {/* Категория + Сложность */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tour-category" className="ds-label mb-1">Категория</label>
            <select
              id="tour-category"
              value={formData.category}
              onChange={e => handleChange('category', e.target.value)}
              className="ds-input w-full"
            >
              <option value="vulkani">Вулканы</option>
              <option value="geyzery">Гейзеры</option>
              <option value="rybalka">Рыбалка</option>
              <option value="termalnye_istochniki">Термы / Горячие источники</option>
              <option value="medvedi">Медведи / Дикая природа</option>
              <option value="morskie_progulki">Морские прогулки</option>
              <option value="vertoletnye_tury">Вертолётные туры</option>
              <option value="trekking">Треккинг / Пешие туры</option>
              <option value="snegohod">Снегоходы</option>
              <option value="dzhip">Джип-туры</option>
              <option value="splav">Сплав / Рафтинг</option>
              <option value="ozera">Озёра</option>
              <option value="gory">Горы</option>
              <option value="reki">Реки</option>
              <option value="eko">Эко-туры</option>
              <option value="kombo">Комбо-тур</option>
            </select>
          </div>

          <div>
            <label htmlFor="tour-difficulty" className="ds-label mb-1">Сложность</label>
            <select
              id="tour-difficulty"
              value={formData.difficulty}
              onChange={e => handleChange('difficulty', e.target.value as TourFormData['difficulty'])}
              className="ds-input w-full"
            >
              <option value="easy">Легко — подходит для всех</option>
              <option value="medium">Средне — базовая физподготовка</option>
              <option value="hard">Сложно — опытные туристы</option>
            </select>
          </div>
        </div>

        {/* Базовый маршрут */}
        <div>
          <label htmlFor="tour-route" className="ds-label mb-1">
            Базовый маршрут
            <span className="ml-2 text-[var(--text-muted)] text-xs font-normal">(необязательно)</span>
          </label>
          <select
            id="tour-route"
            value={formData.routeId ?? ''}
            onChange={e => handleChange('routeId', e.target.value || undefined)}
            className="ds-input w-full"
          >
            <option value="">— без привязки к маршруту —</option>
            {routes.map(r => (
              <option key={r.id} value={r.id}>
                {r.title}{r.sourceName ? ` (${r.sourceName})` : ''}
              </option>
            ))}
          </select>
          {routes.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] mt-1">Нет маршрутов для этой категории</p>
          )}
        </div>
      </section>

      {/* Параметры */}
      <section className="ds-card p-6 space-y-5">
        <h2 className="ds-h2">Параметры</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Длительность */}
          <div id="field-duration">
            <label htmlFor="tour-duration" className="ds-label mb-1">
              Длительность (ч) <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              id="tour-duration"
              type="number"
              min="1"
              max="999"
              value={formData.duration}
              onChange={e => handleChange('duration', Math.max(1, parseInt(e.target.value, 10) || 0))}
              className={`ds-input w-full ${errors.duration ? 'border-[var(--danger)]' : ''}`}
            />
            {errors.duration && <p className="mt-1 text-xs text-[var(--danger)] flex items-center gap-1"><AlertCircle size={12} />{errors.duration}</p>}
          </div>

          {/* Мин. группа */}
          <div id="field-minGroupSize">
            <label htmlFor="tour-min-group" className="ds-label mb-1">
              Мин. группа <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              id="tour-min-group"
              type="number"
              min="1"
              value={formData.minGroupSize}
              onChange={e => handleChange('minGroupSize', Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={`ds-input w-full ${errors.minGroupSize ? 'border-[var(--danger)]' : ''}`}
            />
            {errors.minGroupSize && <p className="mt-1 text-xs text-[var(--danger)] flex items-center gap-1"><AlertCircle size={12} />{errors.minGroupSize}</p>}
          </div>

          {/* Макс. группа */}
          <div id="field-maxGroupSize">
            <label htmlFor="tour-max-group" className="ds-label mb-1">
              Макс. группа <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              id="tour-max-group"
              type="number"
              min={formData.minGroupSize}
              value={formData.maxGroupSize}
              onChange={e => handleChange('maxGroupSize', Math.max(formData.minGroupSize, parseInt(e.target.value, 10) || 1))}
              className={`ds-input w-full ${errors.maxGroupSize ? 'border-[var(--danger)]' : ''}`}
            />
            {errors.maxGroupSize && <p className="mt-1 text-xs text-[var(--danger)] flex items-center gap-1"><AlertCircle size={12} />{errors.maxGroupSize}</p>}
          </div>

          {/* Цена */}
          <div id="field-price">
            <label htmlFor="tour-price" className="ds-label mb-1">
              Цена (₽) <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              id="tour-price"
              type="number"
              min="1"
              step="100"
              value={formData.price || ''}
              onChange={e => handleChange('price', parseFloat(e.target.value) || 0)}
              placeholder="15000"
              className={`ds-input w-full ${errors.price ? 'border-[var(--danger)]' : ''}`}
            />
            {errors.price && <p className="mt-1 text-xs text-[var(--danger)] flex items-center gap-1"><AlertCircle size={12} />{errors.price}</p>}
          </div>
        </div>

        {/* Итоговая цена за группу */}
        {formData.price > 0 && (
          <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] px-3 py-2 rounded-lg">
            При группе {formData.minGroupSize}–{formData.maxGroupSize} чел.:
            {' '}<span className="text-[var(--text-primary)] font-medium">{(formData.price * formData.minGroupSize).toLocaleString('ru-RU')} — {(formData.price * formData.maxGroupSize).toLocaleString('ru-RU')} ₽</span>
          </div>
        )}
      </section>

      {/* Главное фото */}
      <section className="ds-card p-6 space-y-3">
        <h2 className="ds-h2">Главное фото</h2>

        {formData.tourImage ? (
          <div className="relative h-48 rounded-lg overflow-hidden border border-[var(--border)]">
            <img src={formData.tourImage} alt="Превью" className="w-full h-full object-contain bg-[var(--bg-hover)]" />
            <button
              type="button"
              onClick={() => handleChange('tourImage', '')}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className={`flex flex-col items-center justify-center h-48 rounded-lg border-2 border-dashed cursor-pointer transition-colors
            ${uploading ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5'}`}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploading}
            />
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mb-2" />
                <span className="text-sm text-[var(--text-muted)]">Загружаю...</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[var(--text-muted)] mb-2" />
                <span className="text-sm text-[var(--text-primary)] font-medium">Нажми чтобы загрузить фото</span>
                <span className="text-xs text-[var(--text-muted)] mt-1">JPEG, PNG, WebP — до 5 MB</span>
              </>
            )}
          </label>
        )}

        {uploadError && (
          <p className="text-sm text-[var(--danger)] flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />{uploadError}
          </p>
        )}
      </section>

      {/* Включено */}
      <section className="ds-card p-6 space-y-4">
        <h2 className="ds-h2">Включено в стоимость</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newInclude}
            onChange={e => setNewInclude(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInclude())}
            placeholder="Транспорт от места сбора, снаряжение..."
            className="ds-input flex-1 text-sm"
          />
          <button type="button" onClick={addInclude} className="ds-btn ds-btn-secondary text-sm px-4">
            Добавить
          </button>
        </div>
        {(formData.includes as string[]).length > 0 && (
          <ul className="space-y-1.5">
            {(formData.includes as string[]).map((item, i) => (
              <li key={i} className="flex items-center justify-between bg-[var(--bg-hover)] px-3 py-2 rounded-lg text-sm">
                <span className="text-[var(--text-primary)]">{item}</span>
                <button type="button" onClick={() => removeInclude(i)} className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors ml-2">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Не включено */}
      <section className="ds-card p-6 space-y-4">
        <h2 className="ds-h2">Не включено в стоимость</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newExclude}
            onChange={e => setNewExclude(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExclude())}
            placeholder="Личное снаряжение, питание в пути..."
            className="ds-input flex-1 text-sm"
          />
          <button type="button" onClick={addExclude} className="ds-btn ds-btn-secondary text-sm px-4">
            Добавить
          </button>
        </div>
        {(formData.excludes as string[]).length > 0 && (
          <ul className="space-y-1.5">
            {(formData.excludes as string[]).map((item, i) => (
              <li key={i} className="flex items-center justify-between bg-[var(--bg-hover)] px-3 py-2 rounded-lg text-sm">
                <span className="text-[var(--text-primary)]">{item}</span>
                <button type="button" onClick={() => removeExclude(i)} className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors ml-2">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Submit error */}
      {submitError && (
        <div className="flex items-center gap-2 p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg text-sm text-[var(--danger)]">
          <AlertCircle size={16} className="shrink-0" />
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} disabled={loading} className="ds-btn ds-btn-secondary">
          Отмена
        </button>
        <button type="submit" disabled={loading} className="ds-btn ds-btn-primary">
          {loading ? 'Сохранение…' : isEdit ? 'Сохранить изменения' : 'Создать тур'}
        </button>
      </div>
    </form>
  );
}
