'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: 'admin',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Неверный email или пароль');
      }

      // Сохраняем токен и роль администратора
      if (data.token) {
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_email', formData.email);
        // КРИТИЧЕСКИ ВАЖНО: Устанавливаем роль admin для доступа к защищённым страницам
        localStorage.setItem('user_roles', JSON.stringify(['admin']));
      }

      // Редирект на админ панель
      router.push('/hub/admin');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative text-white overflow-hidden flex items-center justify-center p-4">
      {/* Animated Premium Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="mx-auto mb-6 w-24 h-24 bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-500/50 transform hover:scale-110 transition-transform">
            <Shield className="w-14 h-14 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-3 bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
            Панель администратора
          </h1>
          <p className="text-lg text-white/70">
            Kamchatour Hub Admin
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 backdrop-blur-2xl border border-red-500/30 rounded-2xl animate-shake">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6 animate-slide-up">
          <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl">
            {/* Email Field */}
            <div className="mb-6">
              <label className="block text-sm font-bold mb-3 text-white/90 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email администратора
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-6 py-4 bg-white/10 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-white placeholder-white/40 transition-all text-lg"
                  placeholder="admin@kamchatour.ru"
                  autoComplete="email"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div className="mb-6">
              <label className="block text-sm font-bold mb-3 text-white/90 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Пароль
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-6 py-4 bg-white/10 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-white placeholder-white/40 transition-all text-lg"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 text-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                  <span>Вход...</span>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>Войти в панель</span>
                </>
              )}
            </button>
          </div>

          {/* Security Notice */}
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-2xl border border-blue-500/30 rounded-2xl p-4">
            <div className="flex items-start gap-3 text-blue-300">
              <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Защищённый доступ</p>
                <p className="text-blue-300/70">
                  Все действия в панели администратора логируются и защищены двухфакторной авторизацией.
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-2xl border border-purple-500/30 rounded-2xl p-4">
          <div className="flex items-start gap-3 text-purple-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold mb-2">Тестовый доступ:</p>
              <div className="space-y-1 font-mono text-purple-300/80">
                <p>Email: admin@kamhub.test</p>
                <p>Пароль: Admin123456</p>
              </div>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="text-white/60 hover:text-white transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Вернуться на главную
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
          animation-delay: 0.2s;
          animation-fill-mode: both;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </main>
  );
}
