'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import WeatherBackground from '@/components/WeatherBackground';

export default function OperatorRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    // Личные данные
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    
    // Данные компании
    company_name: '',
    company_inn: '',
    company_address: '',
    website: '',
    description: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Валидация
    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          role: 'operator'
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка регистрации');
      }

      // Сохраняем токен
      if (data.data.token) {
        localStorage.setItem('token', data.data.token);
      }

      setSuccess(true);
      
      // Редирект через 3 секунды
      setTimeout(() => {
        router.push('/hub/operator');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <WeatherBackground />
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-md w-full border border-white/20 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Регистрация успешна!
            </h2>
            <p className="text-white/80 mb-4">
              Ваша заявка отправлена на модерацию.
              <br />
              Вы будете уведомлены после проверки.
            </p>
            <p className="text-sm text-white/60">
              Перенаправление...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <WeatherBackground />
      
      <div className="min-h-screen flex items-center justify-center p-4 py-20">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-2xl w-full border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Регистрация туроператора
            </h1>
            <p className="text-white/70">
              Заполните форму для начала работы
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
              <p className="text-white text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Личные данные */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Личные данные</h3>
              
              <div>
                <label htmlFor="operator-name" className="block text-white/80 text-sm mb-2">
                  ФИО контактного лица *
                </label>
                <input
                  id="operator-name"
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                  placeholder="Иван Иванов"
                />
              </div>

              <div>
                <label htmlFor="operator-email" className="block text-white/80 text-sm mb-2">
                  Email *
                </label>
                <input
                  id="operator-email"
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label htmlFor="operator-phone" className="block text-white/80 text-sm mb-2">
                  Телефон
                </label>
                <input
                  id="operator-phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="operator-password" className="block text-white/80 text-sm mb-2">
                    Пароль *
                  </label>
                  <input
                    id="operator-password"
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                    placeholder="Минимум 6 символов"
                  />
                </div>

                <div>
                  <label htmlFor="operator-confirm-password" className="block text-white/80 text-sm mb-2">
                    Подтвердите пароль *
                  </label>
                  <input
                    id="operator-confirm-password"
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                    placeholder="Повторите пароль"
                  />
                </div>
              </div>
            </div>

            {/* Данные компании */}
            <div className="space-y-4 pt-4 border-t border-white/20">
              <h3 className="text-lg font-semibold text-white">Данные компании</h3>
              
              <div>
                <label htmlFor="operator-company-name" className="block text-white/80 text-sm mb-2">
                  Название компании *
                </label>
                <input
                  id="operator-company-name"
                  type="text"
                  name="company_name"
                  required
                  value={formData.company_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                  placeholder="ООО 'Камчатка Тур'"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="operator-company-inn" className="block text-white/80 text-sm mb-2">
                    ИНН
                  </label>
                  <input
                    id="operator-company-inn"
                    type="text"
                    name="company_inn"
                    value={formData.company_inn}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                    placeholder="1234567890"
                  />
                </div>

                <div>
                  <label htmlFor="operator-website" className="block text-white/80 text-sm mb-2">
                    Веб-сайт
                  </label>
                  <input
                    id="operator-website"
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="operator-company-address" className="block text-white/80 text-sm mb-2">
                  Адрес компании
                </label>
                <input
                  id="operator-company-address"
                  type="text"
                  name="company_address"
                  value={formData.company_address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                  placeholder="г. Петропавловск-Камчатский, ул. Ленинская, 1"
                />
              </div>

              <div>
                <label htmlFor="operator-description" className="block text-white/80 text-sm mb-2">
                  Описание компании
                </label>
                <textarea
                  id="operator-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 resize-none"
                  placeholder="Расскажите о вашей компании и услугах..."
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-white text-blue-600 font-semibold hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>

            {/* Login Link */}
            <p className="text-center text-white/70 text-sm">
              Уже есть аккаунт?{' '}
              <Link href="/auth/login" className="text-white font-semibold hover:underline">
                Войти
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Back to Home */}
      <Link 
        href="/"
        className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/20 text-white hover:bg-white/20 transition-all"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        <span className="text-sm font-medium">На главную</span>
      </Link>
    </>
  );
}
