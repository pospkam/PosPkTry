'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const INPUT = 'w-full px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';
const LABEL = 'block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams?.get('type') || 'tourist';

  const [formData, setFormData] = useState({
    email: '', password: '', password_confirm: '',
    name: '', phone: '', role: type === 'tourist' ? 'tourist' : 'operator',
    company_name: '', inn: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isTourist = type === 'tourist';
  const isBusiness = type === 'business';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.email || !formData.password || !formData.name) {
      setError('Заполните все обязательные поля');
      setLoading(false);
      return;
    }
    if (formData.password !== formData.password_confirm) {
      setError('Пароли не совпадают');
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError('Пароль должен быть минимум 6 символов');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка регистрации');
      router.push('/auth/login?registered=true');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block mb-3">
            <span className="text-xl font-semibold text-[var(--accent)]">KamHub</span>
          </Link>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {isTourist ? 'Регистрация туриста' : 'Регистрация бизнеса'}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {isTourist ? 'Создайте аккаунт для бронирования туров' : 'Создайте аккаунт для предоставления услуг'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-md text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className={LABEL}>Email *</label>
              <input id="email" type="email" required value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className={INPUT} placeholder="your@email.com" />
            </div>

            <div>
              <label htmlFor="name" className={LABEL}>{isTourist ? 'Ваше имя *' : 'Контактное лицо *'}</label>
              <input id="name" type="text" required value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={INPUT} placeholder={isTourist ? 'Иван Иванов' : 'Иван Петров'} />
            </div>

            <div>
              <label htmlFor="phone" className={LABEL}>Телефон</label>
              <input id="phone" type="tel" value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className={INPUT} placeholder="+7 (999) 123-45-67" />
            </div>

            {isBusiness && (
              <>
                <div>
                  <label htmlFor="company_name" className={LABEL}>Название компании</label>
                  <input id="company_name" type="text" value={formData.company_name}
                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                    className={INPUT} placeholder="ООО Камчатка Тур" />
                </div>
                <div>
                  <label htmlFor="inn" className={LABEL}>ИНН</label>
                  <input id="inn" type="text" value={formData.inn}
                    onChange={e => setFormData({ ...formData, inn: e.target.value })}
                    className={INPUT} placeholder="1234567890" />
                </div>
                <div>
                  <label htmlFor="role" className={LABEL}>Тип услуг *</label>
                  <select id="role" value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className={INPUT}>
                    <option value="operator">Туроператор</option>
                    <option value="guide">Гид</option>
                    <option value="transfer">Трансфер</option>
                    <option value="agent">Агент</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label htmlFor="password" className={LABEL}>Пароль *</label>
              <input id="password" type="password" required value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className={INPUT} placeholder="Минимум 6 символов" />
            </div>

            <div>
              <label htmlFor="password_confirm" className={LABEL}>Подтвердите пароль *</label>
              <input id="password_confirm" type="password" required value={formData.password_confirm}
                onChange={e => setFormData({ ...formData, password_confirm: e.target.value })}
                className={INPUT} placeholder="Повторите пароль" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-[var(--accent)] text-[var(--bg-card)] text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-[var(--text-muted)]">
            Уже есть аккаунт?{' '}
            <Link href="/auth/login" className="text-[var(--accent)] hover:underline">Войти</Link>
          </div>
          <div className="mt-2 text-center">
            <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
              ← Вернуться на главную
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-sm text-[var(--text-muted)]">Загрузка...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
