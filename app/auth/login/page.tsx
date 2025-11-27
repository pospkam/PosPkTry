'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// Модные SVG иконки вместо emoji
const ROLES = [
  { 
    id: 'operator', 
    name: 'Туры', 
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    ),
    description: 'Организация туров', 
    gradient: 'from-sky-200 to-cyan-200' 
  },
  { 
    id: 'transfer', 
    name: 'Трансфер', 
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
        <circle cx="7" cy="17" r="2"/>
        <circle cx="17" cy="17" r="2"/>
      </svg>
    ),
    description: 'Трансфер и доставка', 
    gradient: 'from-green-500 to-emerald-500' 
  },
  { 
    id: 'stay', 
    name: 'Размещение', 
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    description: 'Базы и гостиницы', 
    gradient: 'from-purple-500 to-pink-500' 
  },
  { 
    id: 'gear', 
    name: 'Снаряжение', 
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v6m0 6v6M6 12H1m6 0h6m5.3-5.3l-4.2 4.2m0 0L9.7 6.7m8.5 10.6l-4.2-4.2m0 0l-4.2 4.2"/>
      </svg>
    ),
    description: 'Прокат снаряжения', 
    gradient: 'from-orange-500 to-red-500' 
  },
];

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login form
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  // Register form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    description: '',
    address: '',
    website: '',
    roles: [] as string[],
    logoUrl: '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { level: 0, text: '', color: '' };
    if (password.length < 6) return { level: 1, text: 'Слабый', color: 'bg-red-500' };
    if (password.length < 8) return { level: 2, text: 'Средний', color: 'bg-yellow-500' };
    if (password.length < 12) return { level: 3, text: 'Хороший', color: 'bg-green-500' };
    return { level: 4, text: 'Отличный', color: 'bg-emerald-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleRoleToggle = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter(r => r !== roleId)
        : [...prev.roles, roleId]
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Размер файла не должен превышать 5 МБ');
        return;
      }
      
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (loginData.email && loginData.password) {
        router.push('/partner/dashboard');
      } else {
        throw new Error('Заполните все поля');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (formData.roles.length === 0) {
        throw new Error('Выберите хотя бы одно направление деятельности');
      }

      if (formData.password.length < 8) {
        throw new Error('Пароль должен быть не менее 8 символов');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Пароли не совпадают');
      }

      const submitData = {
        ...formData,
        logoUrl: logoPreview || '',
      };

      const response = await fetch('/api/partners/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка при регистрации');
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
      <div className="min-h-screen relative flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-bounce">
              <span className="text-4xl">✓</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r text-white bg-clip-text text-transparent mb-3">
              Успешно!
            </h1>
            <p className="text-white/80 mb-2">
              Ваша заявка принята
            </p>
            <p className="text-sm text-white/60">
              Перенаправление в личный кабинет...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen relative text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-premium-gold/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-12 mt-8">
          <div className="mx-auto mb-6 flex justify-center">
            <img src="/logo-kamchatka.svg" alt="Kamchatka Tour Hub" className="h-16 md:h-20 transform hover:scale-110 transition-transform" />
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-3 bg-gradient-to-r text-white bg-clip-text text-transparent">
            Kamchatka Tour Hub
          </h1>
          <p className="text-xl text-white/70">
            Экосистема туризма Камчатки
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="max-w-md mx-auto mb-10">
          <div className="bg-white/15 backdrop-blur-2xl border border-white/15 rounded-2xl p-1.5 flex gap-2 shadow-xl">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-4 rounded-xl font-bold transition-all duration-300 ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-sky-200 to-cyan-200 text-premium-black shadow-lg shadow-blue-500/50'
                  : 'text-white/70 hover:text-white hover:bg-white/15'
              }`}
            >
              Вход
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-4 rounded-xl font-bold transition-all duration-300 ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-sky-200 to-cyan-200 text-premium-black shadow-lg shadow-blue-500/50'
                  : 'text-white/70 hover:text-white hover:bg-white/15'
              }`}
            >
              Регистрация
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-500/10 backdrop-blur-2xl border border-red-500/30 rounded-2xl text-red-400 animate-shake">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <div className="max-w-md mx-auto">
            <form onSubmit={handleLogin} className="bg-white/15 backdrop-blur-2xl border border-white/15 rounded-3xl p-8 space-y-6 shadow-2xl">
              <div>
                <label className="block text-sm font-semibold mb-3 text-white/90">Email</label>
                <input
                  type="email"
                  required
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="w-full px-6 py-4 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent text-white placeholder-white/40 transition-all"
                  placeholder="info@kamchatka-fishing.ru"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 text-white/90">Пароль</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full px-6 py-4 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent text-white placeholder-white/40 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                  >
                    {showPassword ? "" : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-sky-200 to-cyan-200 text-premium-black font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 transition-all transform hover:scale-105"
              >
                {loading ? '⏳ Вход...' : '→ Войти'}
              </button>
            </form>

            <div className="text-center mt-6">
              <a href="/demo" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                🚀 Демо-режим (без регистрации)
              </a>
            </div>
          </div>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="max-w-5xl mx-auto space-y-8">
            {/* Основная информация */}
            <div className="bg-white/15 backdrop-blur-2xl border border-white/15 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-premium-gold to-yellow-300 bg-clip-text text-transparent">
                📋 Основная информация
              </h2>
              
              <div className="grid gap-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-white/90">
                      Название компании <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-6 py-4 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent text-white placeholder-white/40 transition-all"
                      placeholder="Камчатская рыбалка"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-3 text-white/90">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-6 py-4 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent text-white placeholder-white/40 transition-all"
                      placeholder="info@kamchatka-fishing.ru"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-white/90">
                      Телефон <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-6 py-4 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent text-white placeholder-white/40 transition-all"
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-3 text-white/90">
                      Веб-сайт
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-6 py-4 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent text-white placeholder-white/40 transition-all"
                      placeholder="https://kamchatka-fishing.ru"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-white/90">
                      Пароль <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-6 py-4 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent text-white placeholder-white/40 transition-all"
                        placeholder="Минимум 8 символов"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                      >
                        {showPassword ? "" : '👁️‍🗨️'}
                      </button>
                    </div>
                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-all ${
                                level <= passwordStrength.level ? passwordStrength.color : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-white/70">{passwordStrength.text}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-3 text-white/90">
                      Подтверждение пароля <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full px-6 py-4 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent text-white placeholder-white/40 transition-all"
                        placeholder="Повторите пароль"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? "" : '👁️‍🗨️'}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-red-400 mt-2">Пароли не совпадают</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-white/90">
                    Описание компании
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-6 py-4 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent resize-none text-white placeholder-white/40 transition-all"
                    placeholder="Расскажите о вашей компании, опыте работы, преимуществах..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-white/90">
                    Адрес
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-6 py-4 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent text-white placeholder-white/40 transition-all"
                    placeholder="г. Петропавловск-Камчатский, ул. Ленинская, 1"
                  />
                </div>
              </div>
            </div>

            {/* Направления деятельности */}
            <div className="bg-white/15 backdrop-blur-2xl border border-white/15 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-premium-gold to-yellow-300 bg-clip-text text-transparent">
                 Направления деятельности <span className="text-red-400">*</span>
              </h2>
              <p className="text-white/70 mb-8">
                Выберите все подходящие направления
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {ROLES.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleToggle(role.id)}
                    className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden ${
                      formData.roles.includes(role.id)
                        ? `border-transparent bg-gradient-to-br ${role.gradient} shadow-2xl shadow-${role.gradient}/50 scale-105`
                        : 'border-white/15 bg-white/15 hover:border-white/20 hover:bg-white/10 hover:scale-102'
                    }`}
                  >
                    <div className="relative">
                      <div className="flex items-center gap-4 mb-3">
                        <div className={formData.roles.includes(role.id) ? 'text-white' : 'text-white/70 group-hover:text-white transition-colors'}>
                          {role.icon}
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{role.name}</div>
                          <div className="text-sm text-white/70">{role.description}</div>
                        </div>
                      </div>
                      
                      {formData.roles.includes(role.id) && (
                        <div className="mt-4 flex items-center gap-2 text-white font-bold text-sm">
                          <span className="text-xl">✓</span>
                          Выбрано
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {formData.roles.length > 0 && (
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <p className="text-green-400 text-sm flex items-center gap-2">
                    <span className="text-xl">✓</span>
                    Выбрано направлений: <strong className="text-lg">{formData.roles.length}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Логотип */}
            <div className="bg-white/15 backdrop-blur-2xl border border-white/15 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-premium-gold to-yellow-300 bg-clip-text text-transparent">
                📸 Логотип компании
              </h2>

              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group">
                  {logoPreview ? (
                    <div className="w-48 h-48 rounded-2xl border-4 border-white/15 overflow-hidden shadow-2xl shadow-blue-500/30 transform group-hover:scale-105 transition-transform">
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-48 h-48 rounded-2xl border-4 border-dashed border-white/20 flex items-center justify-center bg-white/15 group-hover:border-white/15 transition-all">
                      <div className="text-center">
                        <span className="text-6xl">📷</span>
                        <p className="text-xs text-white/50 mt-3">Загрузите лого</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full">
                  <label className="block">
                    <span className="px-8 py-4 bg-gradient-to-r from-sky-200 to-cyan-200 text-premium-black font-bold rounded-xl cursor-pointer hover:shadow-lg hover:shadow-blue-500/50 transition-all inline-flex items-center gap-2 transform hover:scale-105">
                      <span className="text-xl">📁</span>
                      Выбрать файл
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  <div className="mt-6 space-y-2 text-sm text-white/70">
                    <p className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> PNG, JPG, WEBP
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> Максимум 5 МБ
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> Рекомендуем 512x512px
                    </p>
                  </div>
                  
                  {logoFile && (
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                      <p className="text-green-400 text-sm flex items-center gap-2">
                        <span className="text-xl">✓</span>
                        {logoFile.name} ({(logoFile.size / 1024).toFixed(1)} КБ)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Кнопка отправки */}
            <div className="sticky bottom-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-2xl">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="flex-1 px-8 py-5 bg-white/15 border border-white/15 text-white rounded-2xl hover:bg-white/10 transition-all font-bold transform hover:scale-105"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading || formData.roles.length === 0 || formData.password !== formData.confirmPassword}
                  className="flex-1 px-8 py-5 bg-gradient-to-r from-sky-200 to-cyan-200 text-premium-black rounded-2xl hover:shadow-xl hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-lg transform hover:scale-105"
                >
                  {loading ? '⏳ Регистрация...' : '✓ Зарегистрироваться'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="text-center mt-16 text-white/50 text-sm">
          <p> Kamchatour Hub — экосистема туризма Камчатки</p>
        </div>
      </div>
    </main>
  );
}
