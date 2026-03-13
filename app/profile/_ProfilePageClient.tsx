'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User, Mail, Phone, Mountain, Fish, Camera, Footprints,
  Waves, Binoculars, ChevronRight, Save, AlertCircle, CheckCircle,
  type LucideIcon,
} from 'lucide-react';
import { Protected } from '@/components/auth/Protected';
import { LoadingSpinner } from '@/components/admin/shared';
import { User as UserType } from '@/types';
import BottomNav from '@/components/shared/BottomNav';

/* ── Interest chips ── */
interface InterestDef { key: string; label: string; icon: LucideIcon }
const INTERESTS: InterestDef[] = [
  { key: 'вулканы', label: 'Вулканы', icon: Mountain },
  { key: 'рыбалка', label: 'Рыбалка', icon: Fish },
  { key: 'фототуры', label: 'Фототуры', icon: Camera },
  { key: 'трекинг', label: 'Трекинг', icon: Footprints },
  { key: 'каякинг', label: 'Каякинг', icon: Waves },
  { key: 'наблюдение за животными', label: 'Животные', icon: Binoculars },
];

const DIFFICULTY_LABELS = {
  easy: 'Легкий',
  medium: 'Средний',
  hard: 'Сложный',
} as const;

/* ── Helpers ── */
function getRoleLabel(role: string): string {
  const map: Record<string, string> = {
    tourist: 'Турист',
    operator: 'Оператор',
    guide: 'Гид',
    agent: 'Агент',
    transfer: 'Трансфер',
    admin: 'Администратор',
  };
  return map[role] ?? role;
}

function getRoleHubPath(role: string): string {
  const map: Record<string, string> = {
    tourist: '/hub/tourist',
    operator: '/hub/operator',
    guide: '/hub/guide',
    agent: '/hub/agent',
    transfer: '/hub/transfer-operator',
    admin: '/hub/admin',
  };
  return map[role] ?? '/';
}

export default function ProfilePageClient() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    preferences: {
      interests: [] as string[],
      budget: { min: 5000, max: 50000 },
      difficulty: 'medium' as 'easy' | 'medium' | 'hard',
      groupSize: 2,
    },
  });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile');
      const result = await response.json();
      if (!result.success) throw new Error(result.error ?? 'Ошибка загрузки профиля');

      const data = result.data;
      const loaded: UserType = {
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
      setUser(loaded);
      setFormData({
        name: loaded.name,
        email: loaded.email,
        phone: data.phone ?? '',
        preferences: loaded.preferences,
      });
    } catch {
      setMessage({ text: 'Ошибка загрузки профиля', type: 'error' });
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
      if (!result.success) throw new Error(result.error ?? 'Ошибка сохранения');
      setMessage({ text: 'Профиль успешно обновлён', type: 'success' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Ошибка сохранения', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (key: string) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        interests: prev.preferences.interests.includes(key)
          ? prev.preferences.interests.filter(i => i !== key)
          : [...prev.preferences.interests, key],
      },
    }));
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <Protected roles={['tourist', 'operator', 'agent', 'guide', 'transfer', 'admin']}>
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
          <LoadingSpinner message="Загрузка профиля..." />
        </div>
      </Protected>
    );
  }

  return (
    <Protected roles={['tourist', 'operator', 'agent', 'guide', 'transfer', 'admin']}>
      <main className="min-h-screen bg-[var(--bg-primary)] pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-6 lg:py-8">

          {/* ─── Page header ─── */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">Мой профиль</h1>
              {user && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {getRoleLabel(user.role)}
                </p>
              )}
            </div>
            {user && (
              <Link
                href={getRoleHubPath(user.role)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[var(--accent)] bg-[var(--accent)]/10 rounded-lg hover:bg-[var(--accent)]/15 transition-colors"
              >
                Личный кабинет <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* ─── Message banner ─── */}
          {message && (
            <div className={`flex items-center gap-2 px-3.5 py-2.5 mb-5 text-xs font-medium rounded-lg border ${
              message.type === 'success'
                ? 'bg-[var(--success)]/8 border-[var(--success)]/15 text-[var(--success)]'
                : 'bg-[var(--danger)]/8 border-[var(--danger)]/15 text-[var(--danger)]'
            }`}>
              {message.type === 'success'
                ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                : <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              }
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ─── Personal info ─── */}
            <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <h2 className="text-xs font-semibold text-[var(--text-primary)]">Личные данные</h2>
              </div>
              <div className="p-4 space-y-3">
                {/* Name */}
                <div>
                  <label htmlFor="profile-name" className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)] mb-1.5">
                    <User className="w-3 h-3" /> Имя
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]/40 transition-colors"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="profile-email" className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)] mb-1.5">
                    <Mail className="w-3 h-3" /> Email
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-muted)] cursor-not-allowed"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Email нельзя изменить</p>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="profile-phone" className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)] mb-1.5">
                    <Phone className="w-3 h-3" /> Телефон
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+7 (XXX) XXX-XX-XX"
                    className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]/40 transition-colors"
                  />
                </div>
              </div>
            </section>

            {/* ─── Interests ─── */}
            <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <h2 className="text-xs font-semibold text-[var(--text-primary)]">Интересы</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INTERESTS.map((item) => {
                    const active = formData.preferences.interests.includes(item.key);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => toggleInterest(item.key)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                          active
                            ? 'bg-[var(--accent)] text-white shadow-sm'
                            : 'bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/30 hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ─── Preferences ─── */}
            <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <h2 className="text-xs font-semibold text-[var(--text-primary)]">Настройки путешествий</h2>
              </div>
              <div className="p-4 space-y-5">
                {/* Budget */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)]">Бюджет</span>
                    <span className="text-xs font-semibold text-[var(--text-primary)] font-mono">
                      {formData.preferences.budget.max.toLocaleString('ru-RU')} &#8381;
                    </span>
                  </div>
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
                        budget: { ...formData.preferences.budget, max: Number(e.target.value) },
                      },
                    })}
                    className="w-full h-1.5 bg-[var(--bg-hover)] rounded-full appearance-none cursor-pointer accent-[var(--accent)]"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                    <span>5 000 &#8381;</span>
                    <span>200 000 &#8381;</span>
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <span className="text-[10px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)] mb-2 block">Сложность</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(DIFFICULTY_LABELS) as [keyof typeof DIFFICULTY_LABELS, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          preferences: { ...formData.preferences, difficulty: key },
                        })}
                        className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                          formData.preferences.difficulty === key
                            ? 'bg-[var(--accent)] text-white shadow-sm'
                            : 'bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/30'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Group size */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)]">Размер группы</span>
                    <span className="text-xs font-semibold text-[var(--text-primary)] font-mono">
                      {formData.preferences.groupSize} чел.
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={formData.preferences.groupSize}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, groupSize: Number(e.target.value) },
                    })}
                    className="w-full h-1.5 bg-[var(--bg-hover)] rounded-full appearance-none cursor-pointer accent-[var(--accent)]"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                    <span>1</span>
                    <span>20</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ─── Save button ─── */}
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--accent)] text-white font-medium text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </form>
        </div>

        <BottomNav activePath="/profile" />
      </main>
    </Protected>
  );
}
