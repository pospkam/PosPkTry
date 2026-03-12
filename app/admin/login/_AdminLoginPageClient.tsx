'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

const INPUT = 'w-full px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';
const LABEL = 'block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5';

export default function AdminLoginPageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!data.success || !data.data?.token) throw new Error(data.error || 'Неверный email или пароль');
      const user = data.data;
      if (user.role !== 'admin') throw new Error('Доступ разрешён только администраторам');

      localStorage.setItem('token', user.token);
      localStorage.setItem('admin_token', user.token);
      localStorage.setItem('admin_email', user.email);
      localStorage.setItem('user_roles', JSON.stringify(user.roles || [user.role]));

      router.push('/hub/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Панель администратора</h1>
          <p className="text-xs text-[var(--text-muted)]">Kamchatour Hub Admin</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-md flex items-center gap-2 text-sm text-[var(--danger)]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
          <div>
            <label htmlFor="admin-email" className={`${LABEL} flex items-center gap-1.5`}>
              <Mail className="w-3 h-3" /> Email администратора
            </label>
            <input id="admin-email" type="email" required value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className={INPUT} placeholder="admin@kamchatour.ru" autoComplete="email" />
          </div>

          <div>
            <label htmlFor="admin-password" className={`${LABEL} flex items-center gap-1.5`}>
              <Lock className="w-3 h-3" /> Пароль
            </label>
            <div className="relative">
              <input id="admin-password" type={showPassword ? 'text' : 'password'} required
                value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                className={INPUT} placeholder="••••••••" autoComplete="current-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-[var(--accent)] text-[var(--bg-card)] text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Вход...</>
            ) : (
              <><Shield className="w-4 h-4" /> Войти в панель</>
            )}
          </button>
        </form>

        {/* Security notice */}
        <div className="mt-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-md p-3">
          <div className="flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-[var(--text-muted)] mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-medium text-[var(--text-secondary)]">Защищённый доступ</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                Все действия в панели администратора логируются.
              </p>
            </div>
          </div>
        </div>

        {/* Test credentials */}
        <div className="mt-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-md p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-[var(--text-muted)] mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-medium text-[var(--text-secondary)]">Тестовый доступ</p>
              <div className="mt-1 space-y-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                <p>admin@kamhub.test</p>
                <p>Admin123456</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex items-center justify-center gap-1.5">
            ← Вернуться на главную
          </Link>
        </div>
      </div>
    </main>
  );
}
