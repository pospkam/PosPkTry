'use client';

import { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { User, Loader2, Save, Lock } from 'lucide-react';

const INPUT_CLASS =
  'w-full min-h-[44px] px-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]';

export default function ProfileClient() {
  const [loading, setLoading] = useState(true);

  // Данные профиля
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Смена пароля
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Имитация загрузки профиля
  useEffect(() => {
    const timer = setTimeout(() => {
      setName('Иван Петров');
      setEmail('ivan@example.com');
      setPhone('+7 900 123-45-67');
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // Отправка данных профиля на сервер
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    // Отправка запроса смены пароля
  };

  return (
    <Protected roles={['tourist', 'admin']}>
      <div className="max-w-5xl mx-auto p-6">
        <h1
          className="text-2xl font-semibold mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          Профиль
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: 'var(--accent)' }}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Основная информация */}
            <form
              onSubmit={handleSaveProfile}
              className="rounded-2xl border p-6 space-y-5"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <User className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <h2
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Личные данные
                </h2>
              </div>

              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-sm mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Имя
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ваше имя"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label
                  htmlFor="profile-email"
                  className="block text-sm mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label
                  htmlFor="profile-phone"
                  className="block text-sm mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Телефон
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 900 000-00-00"
                  className={INPUT_CLASS}
                />
              </div>

              <button
                type="submit"
                className="flex items-center gap-2 min-h-[44px] px-6 rounded-xl font-medium text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                }}
              >
                <Save className="w-4 h-4" />
                Сохранить
              </button>
            </form>

            {/* Смена пароля */}
            <form
              onSubmit={handleChangePassword}
              className="rounded-2xl border p-6 space-y-5"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Lock className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                <h2
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Смена пароля
                </h2>
              </div>

              <div>
                <label
                  htmlFor="old-password"
                  className="block text-sm mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Текущий пароль
                </label>
                <input
                  id="old-password"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Введите текущий пароль"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="block text-sm mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Новый пароль
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Введите новый пароль"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Подтвердите пароль
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите новый пароль"
                  className={INPUT_CLASS}
                />
              </div>

              <button
                type="submit"
                className="flex items-center gap-2 min-h-[44px] px-6 rounded-xl font-medium text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--warning)',
                  color: '#fff',
                }}
              >
                <Lock className="w-4 h-4" />
                Изменить пароль
              </button>
            </form>
          </div>
        )}
      </div>
    </Protected>
  );
}
