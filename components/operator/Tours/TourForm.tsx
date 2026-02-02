'use client';

import React, { useState } from 'react';
import { TourFormData } from '@/types/operator';

interface TourFormProps {
  initialData?: Partial<TourFormData>;
  onSubmit: (data: TourFormData) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

export function TourForm({ initialData, onSubmit, onCancel, isEdit = false }: TourFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TourFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    category: initialData?.category || 'adventure',
    difficulty: initialData?.difficulty || 'medium',
    duration: initialData?.duration || 4,
    maxGroupSize: initialData?.maxGroupSize || 15,
    minGroupSize: initialData?.minGroupSize || 1,
    price: initialData?.price || 0,
    currency: initialData?.currency || 'RUB',
    includes: initialData?.includes || [],
    excludes: initialData?.excludes || [],
    itinerary: initialData?.itinerary || [],
    images: initialData?.images || []
  });

  const [newInclude, setNewInclude] = useState('');
  const [newExclude, setNewExclude] = useState('');

  const handleChange = (field: keyof TourFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddInclude = () => {
    if (newInclude.trim()) {
      handleChange('includes', [...formData.includes, newInclude.trim()]);
      setNewInclude('');
    }
  };

  const handleRemoveInclude = (index: number) => {
    handleChange('includes', formData.includes.filter((_, i) => i !== index));
  };

  const handleAddExclude = () => {
    if (newExclude.trim()) {
      handleChange('excludes', [...formData.excludes, newExclude.trim()]);
      setNewExclude('');
    }
  };

  const handleRemoveExclude = (index: number) => {
    handleChange('excludes', formData.excludes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    if (!formData.name || !formData.description || !formData.price) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Ошибка при сохранении тура');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Основная информация */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Основная информация</h2>
        
        <div className="space-y-6">
          {/* Название */}
          <div>
            <label className="block text-white/70 mb-2">
              Название тура <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Например: Восхождение на вулкан Авачинский"
              className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold"
              required
            />
          </div>

          {/* Описание */}
          <div>
            <label className="block text-white/70 mb-2">
              Описание <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Подробное описание тура..."
              rows={6}
              className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold resize-none"
              required
            />
          </div>

          {/* Категория и Сложность */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white/70 mb-2">Категория</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
              >
                <option value="adventure">Приключения</option>
                <option value="nature">Природа</option>
                <option value="culture">Культура</option>
                <option value="extreme">Экстрим</option>
                <option value="relaxation">Отдых</option>
              </select>
            </div>

            <div>
              <label className="block text-white/70 mb-2">Сложность</label>
              <select
                value={formData.difficulty}
                onChange={(e) => handleChange('difficulty', e.target.value as any)}
                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
              >
                <option value="easy">Легко</option>
                <option value="medium">Средне</option>
                <option value="hard">Сложно</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Параметры тура */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Параметры тура</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Длительность */}
          <div>
            <label className="block text-white/70 mb-2">
              Длительность (часы)
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => handleChange('duration', parseInt(e.target.value))}
              min="1"
              className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
            />
          </div>

          {/* Мин. группа */}
          <div>
            <label className="block text-white/70 mb-2">
              Мин. группа
            </label>
            <input
              type="number"
              value={formData.minGroupSize}
              onChange={(e) => handleChange('minGroupSize', parseInt(e.target.value))}
              min="1"
              className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
            />
          </div>

          {/* Макс. группа */}
          <div>
            <label className="block text-white/70 mb-2">
              Макс. группа
            </label>
            <input
              type="number"
              value={formData.maxGroupSize}
              onChange={(e) => handleChange('maxGroupSize', parseInt(e.target.value))}
              min="1"
              className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
            />
          </div>

          {/* Цена */}
          <div>
            <label className="block text-white/70 mb-2">
              Цена <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => handleChange('price', parseFloat(e.target.value))}
              min="0"
              step="100"
              className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
              required
            />
          </div>
        </div>
      </section>

      {/* Что включено */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Что включено в стоимость</h2>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newInclude}
              onChange={(e) => setNewInclude(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInclude())}
              placeholder="Например: Транспорт от места сбора"
              className="flex-1 px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold"
            />
            <button
              type="button"
              onClick={handleAddInclude}
              className="px-6 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl font-medium transition-colors"
            >
              Добавить
            </button>
          </div>

          {formData.includes.length > 0 && (
            <ul className="space-y-2">
              {formData.includes.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-xl"
                >
                  <span className="text-white"> {item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInclude(index)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Что НЕ включено */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Что НЕ включено в стоимость</h2>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newExclude}
              onChange={(e) => setNewExclude(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExclude())}
              placeholder="Например: Личное снаряжение"
              className="flex-1 px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold"
            />
            <button
              type="button"
              onClick={handleAddExclude}
              className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-colors"
            >
              Добавить
            </button>
          </div>

          {formData.excludes.length > 0 && (
            <ul className="space-y-2">
              {formData.excludes.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-xl"
                >
                  <span className="text-white"> {item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveExclude(index)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Действия */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center"
        >
          {loading ? (
            <>
              <span className="animate-spin mr-2"></span>
              Сохранение...
            </>
          ) : (
            <>{isEdit ? 'Сохранить изменения' : 'Создать тур'}</>
          )}
        </button>
      </div>
    </form>
  );
}



