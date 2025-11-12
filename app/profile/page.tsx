'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { LoadingSpinner } from '@/components/admin/shared';
import { User } from '@/types';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    preferences: {
      interests: [] as string[],
      budget: { min: 5000, max: 50000 },
      difficulty: 'medium' as 'easy' | 'medium' | 'hard',
      groupSize: 2
    }
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      // TODO: Реальный API endpoint
      // const response = await fetch('/api/profile');
      // const result = await response.json();
      
      // Mock данные пока
      const mockUser: User = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Демо Пользователь',
        role: 'tourist',
        preferences: {
          interests: ['вулканы', 'рыбалка'],
          budget: { min: 10000, max: 50000 },
          difficulty: 'medium',
          season: ['summer'],
          groupSize: 2
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setUser(mockUser);
      setFormData({
        name: mockUser.name,
        email: mockUser.email,
        phone: '',
        preferences: mockUser.preferences
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // TODO: Реальный API endpoint
      // const response = await fetch('/api/profile', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });

      // Имитация сохранения
      await new Promise(resolve => setTimeout(resolve, 1000));

      setMessage('Профиль успешно обновлён');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setMessage('Ошибка сохранения профиля');
    } finally {
      setSaving(false);
    }
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        interests: prev.preferences.interests.includes(interest)
          ? prev.preferences.interests.filter(i => i !== interest)
          : [...prev.preferences.interests, interest]
      }
    }));
  };

  const popularInterests = [
    'Вулканы', 'Рыбалка', 'Хели-туры', 'Фототуры', 
    'Трекинг', 'Дайвинг', 'Каякинг', 'Наблюдение за животными'
  ];

  if (loading) {
    return (
      <Protected roles={['tourist', 'operator', 'agent', 'guide', 'transfer', 'admin']}>
        <div className="min-h-screen bg-premium-black flex items-center justify-center">
          <LoadingSpinner message="Загрузка профиля..." />
        </div>
      </Protected>
    );
  }

  return (
    <Protected roles={['tourist', 'operator', 'agent', 'guide', 'transfer', 'admin']}>
      <main className="min-h-screen bg-premium-black text-white">
        {/* Header */}
        <div className="bg-white/5 border-b border-white/10 p-6">
          <h1 className="text-3xl font-black text-premium-gold">Мой профиль</h1>
          <p className="text-white/70">Управление личными данными и предпочтениями</p>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {message && (
            <div className={`mb-6 p-4 rounded-xl ${
              message.includes('успешно')
                ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                : 'bg-red-500/20 border border-red-500/50 text-red-400'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Личные данные */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-6">Личные данные</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/70 mb-2">Имя</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white/70 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white/70 mb-2">Телефон</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+7 (XXX) XXX-XX-XX"
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold"
                  />
                </div>
              </div>
            </div>

            {/* Предпочтения */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-6">Предпочтения</h2>
              
              {/* Интересы */}
              <div className="mb-6">
                <label className="block text-white/70 mb-3">Интересы</label>
                <div className="flex flex-wrap gap-2">
                  {popularInterests.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => handleInterestToggle(interest.toLowerCase())}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        formData.preferences.interests.includes(interest.toLowerCase())
                          ? 'bg-premium-gold text-premium-black'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Бюджет */}
              <div className="mb-6">
                <label className="block text-white/70 mb-3">
                  Бюджет на путешествие: {formData.preferences.budget.min.toLocaleString('ru-RU')} - {formData.preferences.budget.max.toLocaleString('ru-RU')} ₽
                </label>
                <div className="flex gap-4">
                  <input
                    type="range"
                    min="5000"
                    max="200000"
                    step="5000"
                    value={formData.preferences.budget.max}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferences: {
                        ...formData.preferences,
                        budget: { ...formData.preferences.budget, max: Number(e.target.value) }
                      }
                    })}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Сложность */}
              <div>
                <label className="block text-white/70 mb-3">Предпочитаемая сложность</label>
                <div className="flex gap-3">
                  {(['easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        preferences: { ...formData.preferences, difficulty: diff }
                      })}
                      className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors ${
                        formData.preferences.difficulty === diff
                          ? 'bg-premium-gold text-premium-black'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {diff === 'easy' ? 'Легкий' : diff === 'medium' ? 'Средний' : 'Сложный'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Кнопка сохранения */}
            <button
              type="submit"
              disabled={saving}
              className="w-full px-8 py-4 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </form>
        </div>
      </main>
    </Protected>
  );
}

