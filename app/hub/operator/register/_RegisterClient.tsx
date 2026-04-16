'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

export default function OperatorRegister() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    password: '',
    telegram: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/hub/operator/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json() as { token?: string; operator_id?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? 'Регистрация не удалась');
      }

      // Сохраняем токен — оператор сразу залогинен
      if (data.token) {
        try { localStorage.setItem('auth_token', data.token); } catch { /* SSR safe */ }
      }

      router.push(`/hub/operator?onboarding=true&id=${data.operator_id ?? ''}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="ds-card max-w-md w-full p-8">
        <h1 className="ds-h1 mb-2 text-center">Присоединись к TourHab</h1>
        <p className="text-center text-[var(--text-secondary)] mb-6 text-sm">
          Первый месяц — 0% комиссии. Просто тестируешь. Без обмана.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="ds-label">Название компании / тура</label>
            <input
              type="text"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              className="ds-input w-full"
              placeholder="Камчатская рыбалка"
              required
            />
          </div>

          <div>
            <label className="ds-label">Ваше имя</label>
            <input
              type="text"
              name="contact_name"
              value={formData.contact_name}
              onChange={handleChange}
              className="ds-input w-full"
              placeholder="Иван Иванов"
              required
            />
          </div>

          <div>
            <label className="ds-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="ds-input w-full"
              placeholder="ivan@example.com"
              required
            />
          </div>

          <div>
            <label className="ds-label">Телефон</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="ds-input w-full"
              placeholder="+7 (XXX) XXX-XX-XX"
              required
            />
          </div>

          <div>
            <label className="ds-label">Пароль</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="ds-input w-full pr-10"
                placeholder="Минимум 8 символов"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="ds-label">Telegram — для уведомлений о бронях (опционально)</label>
            <input
              type="text"
              name="telegram"
              value={formData.telegram}
              onChange={handleChange}
              className="ds-input w-full"
              placeholder="@your_telegram"
            />
          </div>

          {error && (
            <div className="bg-[var(--danger)]/10 border border-[var(--danger)] text-[var(--danger)] p-3 rounded text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="ds-btn ds-btn-primary w-full"
          >
            {loading ? 'Создаём аккаунт...' : 'Начать бесплатно'}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          Уже есть аккаунт?{' '}
          <Link href="/signin" className="text-[var(--ocean)] hover:underline">
            Войти
          </Link>
          {' · '}
          <Link href="/legal/terms" className="text-[var(--ocean)] hover:underline">
            Условия
          </Link>
        </p>
      </div>
    </div>
  );
}
