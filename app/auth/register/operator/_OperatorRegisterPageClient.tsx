'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

const INPUT = 'w-full px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';
const LABEL = 'block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5';

export default function OperatorRegisterPageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    company_name: '', company_inn: '', company_address: '', website: '', description: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role: 'operator' }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Ошибка регистрации');
      if (data.data.token) localStorage.setItem('token', data.data.token);
      setSuccess(true);
      setTimeout(() => router.push('/hub/operator'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-[var(--success)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">Регистрация успешна!</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-1">Ваша заявка отправлена на модерацию.</p>
          <p className="text-xs text-[var(--text-muted)]">Перенаправление...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-6 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> На главную
        </Link>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-base font-semibold text-[var(--text-primary)]">Регистрация туроператора</h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">Заполните форму для начала работы</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-md text-sm text-[var(--danger)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Личные данные */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-widest">Личные данные</h3>
              <div>
                <label htmlFor="op-name" className={LABEL}>ФИО контактного лица *</label>
                <input id="op-name" type="text" name="name" required value={formData.name}
                  onChange={handleChange} className={INPUT} placeholder="Иван Иванов" />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="op-email" className={LABEL}>Email *</label>
                  <input id="op-email" type="email" name="email" required value={formData.email}
                    onChange={handleChange} className={INPUT} placeholder="email@example.com" />
                </div>
                <div>
                  <label htmlFor="op-phone" className={LABEL}>Телефон</label>
                  <input id="op-phone" type="tel" name="phone" value={formData.phone}
                    onChange={handleChange} className={INPUT} placeholder="+7 (999) 123-45-67" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="op-password" className={LABEL}>Пароль *</label>
                  <input id="op-password" type="password" name="password" required value={formData.password}
                    onChange={handleChange} className={INPUT} placeholder="Минимум 6 символов" />
                </div>
                <div>
                  <label htmlFor="op-confirm-password" className={LABEL}>Подтвердите пароль *</label>
                  <input id="op-confirm-password" type="password" name="confirmPassword" required value={formData.confirmPassword}
                    onChange={handleChange} className={INPUT} placeholder="Повторите пароль" />
                </div>
              </div>
            </div>

            {/* Разделитель */}
            <div className="border-t border-[var(--border)]" />

            {/* Данные компании */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-widest">Данные компании</h3>
              <div>
                <label htmlFor="op-company-name" className={LABEL}>Название компании *</label>
                <input id="op-company-name" type="text" name="company_name" required value={formData.company_name}
                  onChange={handleChange} className={INPUT} placeholder="ООО «Камчатка Тур»" />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="op-inn" className={LABEL}>ИНН</label>
                  <input id="op-inn" type="text" name="company_inn" value={formData.company_inn}
                    onChange={handleChange} className={INPUT} placeholder="1234567890" />
                </div>
                <div>
                  <label htmlFor="op-website" className={LABEL}>Веб-сайт</label>
                  <input id="op-website" type="url" name="website" value={formData.website}
                    onChange={handleChange} className={INPUT} placeholder="https://example.com" />
                </div>
              </div>
              <div>
                <label htmlFor="op-address" className={LABEL}>Адрес компании</label>
                <input id="op-address" type="text" name="company_address" value={formData.company_address}
                  onChange={handleChange} className={INPUT} placeholder="г. Петропавловск-Камчатский, ул. Ленинская, 1" />
              </div>
              <div>
                <label htmlFor="op-description" className={LABEL}>Описание компании</label>
                <textarea id="op-description" name="description" value={formData.description}
                  onChange={handleChange} rows={3}
                  className={`${INPUT} resize-none`}
                  placeholder="Расскажите о вашей компании и услугах..." />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-[var(--accent)] text-[var(--bg-card)] text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>

            <p className="text-center text-xs text-[var(--text-muted)]">
              Уже есть аккаунт?{' '}
              <Link href="/auth/login" className="text-[var(--accent)] hover:underline">Войти</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
