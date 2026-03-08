'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon } from 'lucide-react';
import { Protected } from '@/components/auth/Protected';
import { LoadingSpinner } from '@/components/admin/shared';
import { useTheme } from '@/contexts/ThemeContext';
import { User as UserType } from '@/types';
import BottomNav from '@/components/shared/BottomNav';

export default function ProfilePageClient() {
  const { isDark, toggleTheme } = useTheme();
  const [user, setUser] = useState<UserType | null>(null);
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
      const response = await fetch('/api/profile');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error ?? 'Ошибка загрузки профиля');
      }

      const data = result.data;
      const loadedUser: UserType = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        preferences: {
          interests: data.preferences?.interests ?? [],
          budget: data.preferences?.budget ?? { min: 5000, max: 50000 },
          difficulty: data.preferences?.difficulty ?? 'medium',
          season: data.preferences?.season ?? [],
          groupSize: data.preferences?.groupSize ?? 2,
        },
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };

      setUser(loadedUser);
      setFormData({
        name: loadedUser.name,
        email: loadedUser.email,
        phone: data.phone ?? '',
        preferences: loadedUser.preferences,
      });
    } catch {
      setMessage('Ошибка загрузки профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          preferences: formData.preferences,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error ?? 'Ошибка сохранения');
      }

      setMessage('Профиль успешно обновлён');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Ошибка сохранения профиля');
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
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <LoadingSpinner message="Загрузка профиля..." />
        </div>
      </Protected>
    );
  }

  return (
    <Protected roles={['tourist', 'operator', 'agent', 'guide', 'transfer', 'admin']}>
      <main className="min-h-screen bg-transparent text-white pb-24 md:pb-0">
        {/* Навигационная шапка */}
        <header style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.15)', position: 'sticky', top: 0, zIndex: 50 }}>
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" style={{ fontFamily: "var(--font-playfair,'Playfair Display',serif)", fontSize: '1.4rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
              KH
            </Link>
            <h1 className="text-lg font-bold text-white">Мой профиль</h1>
            <button onClick={toggleTheme} className="text-white/70 hover:text-white transition-colors" aria-label="Переключить тему">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

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
            <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-6">Личные данные</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="profile-name" className="block text-white/70 mb-2">Имя</label>
                  <input
                    id="profile-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="profile-email" className="block text-white/70 mb-2">Email</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="profile-phone" className="block text-white/70 mb-2">Телефон</label>
                  <input
                    id="profile-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+7 (XXX) XXX-XX-XX"
                    className="w-full px-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
              </div>
            </div>

            {/* Предпочтения */}
            <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-6">Предпочтения</h2>
              
              {/* Интересы */}
              <div className="mb-6">
                <span className="block text-white/70 mb-3">Интересы</span>
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
                <span className="block text-white/70 mb-3">
                  Бюджет на путешествие: {formData.preferences.budget.min.toLocaleString('ru-RU')} - {formData.preferences.budget.max.toLocaleString('ru-RU')} ₽
                </span>
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
                <span className="block text-white/70 mb-3">Предпочитаемая сложность</span>
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

        <BottomNav activePath="/profile" />
      </main>
    </Protected>
  );
}

