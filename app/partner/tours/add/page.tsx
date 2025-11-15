'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import WeatherBackground from '@/components/WeatherBackground';

const DIFFICULTY_LEVELS = [
  { 
    id: 'easy', 
    name: 'Легкий', 
    description: 'Для новичков',
    color: 'from-green-500 to-emerald-500',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  { 
    id: 'medium', 
    name: 'Средний', 
    description: 'Требуется подготовка',
    color: 'from-yellow-500 to-orange-500',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  },
  { 
    id: 'hard', 
    name: 'Сложный', 
    description: 'Для опытных',
    color: 'from-red-500 to-pink-500',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  },
];

const SEASONS = [
  { id: 'spring', name: 'Весна', color: 'from-pink-500 to-rose-500', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707' },
  { id: 'summer', name: 'Лето', color: 'from-yellow-500 to-orange-500', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
  { id: 'autumn', name: 'Осень', color: 'from-orange-500 to-amber-500', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'winter', name: 'Зима', color: 'from-blue-500 to-cyan-500', icon: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4' },
];

export default function AddTourPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    operatorId: '',
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <WeatherBackground />
        <div className="relative z-10 max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl p-8 sm:p-12 text-center border border-white/20 shadow-2xl">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Тур добавлен!</h1>
          <p className="text-white/80 text-lg mb-6">
            Тур успешно создан и доступен для бронирования.
          </p>
          <div className="text-sm text-white/60">
            Перенаправление в личный кабинет...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <WeatherBackground />
      
      <main className="relative z-10 min-h-screen p-4 sm:p-6 lg:p-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => router.back()}
                className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-all"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">Добавить тур</h1>
                <p className="text-white/70 text-sm sm:text-base mt-1">
                  Заполните информацию о новом туре
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-2xl text-red-200 text-sm flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Основная информация */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Основная информация</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Название тура <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Рыбалка на реке Быстрая"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Краткое описание
                  </label>
                  <input
                    type="text"
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Незабываемая рыбалка в горной реке"
                    maxLength={100}
                  />
                  <p className="text-xs text-white/50 mt-1">Макс. 100 символов</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Полное описание <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    placeholder="Детальное описание тура, маршрута, особенностей..."
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Длительность (часов) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Цена (₽) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="100"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="15000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Макс. группа
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.maxGroupSize}
                      onChange={(e) => setFormData({ ...formData, maxGroupSize: parseInt(e.target.value) || 10 })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Сложность */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
                Уровень сложности <span className="text-red-400">*</span>
              </h2>
              <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
                {DIFFICULTY_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, difficulty: level.id as any })}
                    className={`p-4 sm:p-5 rounded-xl border-2 transition-all ${
                      formData.difficulty === level.id
                        ? 'border-blue-400 bg-blue-500/20 scale-105'
                        : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                    }`}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${level.color} flex items-center justify-center`}>
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={level.icon} />
                      </svg>
                    </div>
                    <div className="font-bold text-white text-sm sm:text-base mb-1">{level.name}</div>
                    <div className="text-xs sm:text-sm text-white/70">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Сезоны */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Сезоны проведения</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {SEASONS.map((season) => (
                  <button
                    key={season.id}
                    type="button"
                    onClick={() => handleSeasonToggle(season.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.season.includes(season.id)
                        ? 'border-blue-400 bg-blue-500/20 scale-105'
                        : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                    }`}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 rounded-full bg-gradient-to-br ${season.color} flex items-center justify-center`}>
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={season.icon} />
                      </svg>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-white">{season.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Что включено */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Что включено в стоимость</h2>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={currentIncluded}
                  onChange={(e) => setCurrentIncluded(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('included', currentIncluded))}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  placeholder="Трансфер, обед, снаряжение..."
                />
                <button
                  type="button"
                  onClick={() => addItem('included', currentIncluded)}
                  className="px-4 sm:px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Добавить</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.included.map((item, index) => (
                  <span key={index} className="px-3 py-2 bg-green-500/20 text-green-300 border border-green-500/30 rounded-lg text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                    <button
                      type="button"
                      onClick={() => removeItem('included', index)}
                      className="ml-1 hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Что НЕ включено */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Что НЕ включено</h2>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={currentNotIncluded}
                  onChange={(e) => setCurrentNotIncluded(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('notIncluded', currentNotIncluded))}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  placeholder="Личные расходы, алкоголь..."
                />
                <button
                  type="button"
                  onClick={() => addItem('notIncluded', currentNotIncluded)}
                  className="px-4 sm:px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Добавить</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.notIncluded.map((item, index) => (
                  <span key={index} className="px-3 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {item}
                    <button
                      type="button"
                      onClick={() => removeItem('notIncluded', index)}
                      className="ml-1 hover:text-white transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Фотографии */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Фотографии</h2>
              <div className="flex gap-2 mb-3">
                <input
                  type="url"
                  value={currentImage}
                  onChange={(e) => setCurrentImage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="https://example.com/image.jpg"
                />
                <button
                  type="button"
                  onClick={addImage}
                  className="px-4 sm:px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Добавить</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {formData.images.map((url, index) => (
                  <div key={index} className="relative group">
                    <img src={url} alt="" className="w-full h-24 sm:h-32 object-cover rounded-xl border-2 border-white/20" />
                    <button
                      type="button"
                      onClick={() => removeItem('images', index)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 sm:py-4 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all font-semibold text-sm sm:text-base"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading || !formData.difficulty}
                className="flex-1 px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm sm:text-base"
              >
                {loading ? 'Создание...' : 'Создать тур'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
