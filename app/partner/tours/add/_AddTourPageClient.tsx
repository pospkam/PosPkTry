'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Flower, Leaf, Snowflake, Sun, CheckCircle2, XCircle, Circle } from 'lucide-react';
import BottomNav from '@/components/shared/BottomNav';

const INPUT = 'w-full px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';
const LABEL = 'block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5';

const DIFFICULTY_LEVELS = [
  { id: 'easy', name: 'Легкий', color: 'var(--success)', description: 'Для новичков' },
  { id: 'medium', name: 'Средний', color: 'var(--warning)', description: 'Требуется подготовка' },
  { id: 'hard', name: 'Сложный', color: 'var(--danger)', description: 'Для опытных' },
];

const SEASONS = [
  { id: 'spring', name: 'Весна', Icon: Flower },
  { id: 'summer', name: 'Лето', Icon: Sun },
  { id: 'autumn', name: 'Осень', Icon: Leaf },
  { id: 'winter', name: 'Зима', Icon: Snowflake },
];

export default function AddTourPageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    operatorId: '', // В реальном проекте берется из сессии
    name: '',
    description: '',
    shortDescription: '',
    difficulty: '' as 'easy' | 'medium' | 'hard' | '',
    duration: 8,
    price: 0,
    currency: 'RUB',
    maxGroupSize: 10,
    minGroupSize: 2,
    season: [] as string[],
    requirements: [] as string[],
    included: [] as string[],
    notIncluded: [] as string[],
    images: [] as string[],
  });

  const [currentRequirement, setCurrentRequirement] = useState('');
  const [currentIncluded, setCurrentIncluded] = useState('');
  const [currentNotIncluded, setCurrentNotIncluded] = useState('');
  const [currentImage, setCurrentImage] = useState('');

  const handleSeasonToggle = (seasonId: string) => {
    setFormData(prev => ({
      ...prev,
      season: prev.season.includes(seasonId)
        ? prev.season.filter(s => s !== seasonId)
        : [...prev.season, seasonId]
    }));
  };

  const addItem = (type: 'requirements' | 'included' | 'notIncluded', value: string) => {
    if (!value.trim()) return;
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], value.trim()]
    }));
    if (type === 'requirements') setCurrentRequirement('');
    if (type === 'included') setCurrentIncluded('');
    if (type === 'notIncluded') setCurrentNotIncluded('');
  };

  const removeItem = (type: 'requirements' | 'included' | 'notIncluded' | 'images', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const addImage = () => {
    if (!currentImage.trim()) return;
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, currentImage.trim()]
    }));
    setCurrentImage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // В реальном проекте operatorId берется из сессии
      // Для демо используем временный ID
      const submitData = {
        ...formData,
        operatorId: formData.operatorId || 'demo-operator-id',
      };

      const response = await fetch('/api/tours/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка при создании тура');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/partner/dashboard');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-5 lg:p-6 flex items-center justify-center min-h-[400px]">
        <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-8 text-center">
          <CheckCircle2 className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--success)' }} />
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Тур добавлен!</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Тур успешно создан и доступен для бронирования.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Добавить тур</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Заполните информацию о новом туре</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg border flex items-center gap-3"
          style={{ borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)', background: 'color-mix(in srgb, var(--danger) 10%, transparent)', color: 'var(--danger)' }}>
          <XCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Основная информация */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Основная информация</h2>

          <div className="grid gap-4">
            <div>
              <label htmlFor="tour-name" className={LABEL}>
                Название тура <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="tour-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={INPUT}
                placeholder="Рыбалка на реке Быстрая"
              />
            </div>

            <div>
              <label htmlFor="tour-short-desc" className={LABEL}>
                Краткое описание
              </label>
              <input
                id="tour-short-desc"
                type="text"
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                className={INPUT}
                placeholder="Незабываемая рыбалка в горной реке"
                maxLength={100}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">Макс. 100 символов</p>
            </div>

            <div>
              <label htmlFor="tour-description" className={LABEL}>
                Полное описание <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                id="tour-description"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className={`${INPUT} resize-none`}
                placeholder="Детальное описание тура, маршрута, особенностей..."
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="tour-duration" className={LABEL}>
                  Длительность (часов) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  id="tour-duration"
                  type="number"
                  required
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
                  className={INPUT}
                />
              </div>

              <div>
                <label htmlFor="tour-price" className={LABEL}>
                  Цена (₽) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  id="tour-price"
                  type="number"
                  required
                  min="0"
                  step="100"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className={INPUT}
                  placeholder="15000"
                />
              </div>

              <div>
                <label htmlFor="tour-max-group" className={LABEL}>
                  Макс. группа
                </label>
                <input
                  id="tour-max-group"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.maxGroupSize}
                  onChange={(e) => setFormData({ ...formData, maxGroupSize: parseInt(e.target.value) || 10 })}
                  className={INPUT}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Сложность */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Уровень сложности <span style={{ color: 'var(--danger)' }}>*</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            {DIFFICULTY_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => setFormData({ ...formData, difficulty: level.id as 'easy' | 'medium' | 'hard' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.difficulty === level.id
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                    : 'border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--accent)]/40'
                }`}
              >
                <div className="mb-2">
                  <Circle className="w-7 h-7 fill-current mx-auto" style={{ color: level.color }} />
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">{level.name}</div>
                <div className="text-xs text-[var(--text-muted)]">{level.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Сезоны */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Сезоны проведения</h2>
          <div className="grid grid-cols-4 gap-3">
            {SEASONS.map((season) => (
              <button
                key={season.id}
                type="button"
                onClick={() => handleSeasonToggle(season.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.season.includes(season.id)
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                    : 'border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--accent)]/40'
                }`}
              >
                <div className="mb-1 flex justify-center">
                  {React.createElement(season.Icon, { className: 'w-5 h-5 text-[var(--text-secondary)]' })}
                </div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">{season.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Что включено */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Что включено в стоимость</h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={currentIncluded}
              onChange={(e) => setCurrentIncluded(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('included', currentIncluded))}
              className={INPUT}
              placeholder="Трансфер, обед, снаряжение..."
            />
            <button
              type="button"
              onClick={() => addItem('included', currentIncluded)}
              className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Добавить
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.included.map((item, includedIdx) => (
              <span
                key={`included-${item}-${includedIdx}`}
                className="px-3 py-1 rounded-md text-sm flex items-center gap-1.5 border"
                style={{ color: 'var(--success)', borderColor: 'color-mix(in srgb, var(--success) 30%, transparent)', background: 'color-mix(in srgb, var(--success) 10%, transparent)' }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {item}
                <button
                  type="button"
                  onClick={() => removeItem('included', includedIdx)}
                  className="hover:opacity-60 ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Что НЕ включено */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Что НЕ включено</h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={currentNotIncluded}
              onChange={(e) => setCurrentNotIncluded(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('notIncluded', currentNotIncluded))}
              className={INPUT}
              placeholder="Личные расходы, алкоголь..."
            />
            <button
              type="button"
              onClick={() => addItem('notIncluded', currentNotIncluded)}
              className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Добавить
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.notIncluded.map((item, notIncludedIdx) => (
              <span
                key={`notIncluded-${item}-${notIncludedIdx}`}
                className="px-3 py-1 rounded-md text-sm flex items-center gap-1.5 border"
                style={{ color: 'var(--danger)', borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)', background: 'color-mix(in srgb, var(--danger) 10%, transparent)' }}
              >
                <XCircle className="w-3.5 h-3.5" />
                {item}
                <button
                  type="button"
                  onClick={() => removeItem('notIncluded', notIncludedIdx)}
                  className="hover:opacity-60 ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Фотографии */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Фотографии</h2>
          <div className="flex gap-2 mb-3">
            <input
              type="url"
              value={currentImage}
              onChange={(e) => setCurrentImage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
              className={INPUT}
              placeholder="https://example.com/image.jpg"
            />
            <button
              type="button"
              onClick={addImage}
              className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Добавить
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {formData.images.map((url, imgIndex) => (
              <div key={`image-${url}-${imgIndex}`} className="relative group">
                <Image src={url} alt="" className="w-full h-24 object-cover rounded-md" width={200} height={96} />
                <button
                  type="button"
                  onClick={() => removeItem('images', imgIndex)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'var(--danger)' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-5 py-2.5 text-sm border border-[var(--border)] text-[var(--text-secondary)] rounded-md hover:bg-[var(--bg-primary)] transition-colors font-medium"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading || !formData.difficulty}
            className="flex-1 px-5 py-2.5 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? 'Создание...' : 'Создать тур'}
          </button>
        </div>
      </form>
      <BottomNav activePath="/" />
    </div>
  );
}
