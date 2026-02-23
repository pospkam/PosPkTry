'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams?.get('type') || 'tourist';
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
    name: '',
    phone: '',
    role: type === 'tourist' ? 'tourist' : 'operator',
    company_name: '',
    inn: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isTourist = type === 'tourist';
  const isBusiness = type === 'business';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Валидация
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

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка регистрации');
      }

      // Успешная регистрация - переходим на страницу входа
      router.push('/auth/login?registered=true');
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block mb-4">
            <div className="text-3xl font-bold text-blue-600">KamHub</div>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">
            {isTourist ? 'Регистрация туриста' : 'Регистрация бизнеса'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isTourist 
              ? 'Создайте аккаунт для бронирования туров' 
              : 'Создайте аккаунт для предоставления услуг'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="your@email.com"
            />
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {isTourist ? 'Ваше имя *' : 'Контактное лицо *'}
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder={isTourist ? 'Иван Иванов' : 'Иван Петров'}
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Телефон
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          {/* Business Fields */}
          {isBusiness && (
            <>
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Название компании
                </label>
                <input
                  id="company_name"
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="ООО Камчатка Тур"
                />
              </div>

              <div>
                <label htmlFor="inn" className="block text-sm font-medium text-gray-700 mb-1">
                  ИНН
                </label>
                <input
                  id="inn"
                  type="text"
                  value={formData.inn}
                  onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="1234567890"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Тип услуг *
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                >
                    <option value="operator">Туроператор</option>
                    <option value="guide">Гид</option>
                    <option value="transfer">Трансфер</option>
                    <option value="agent">Агент</option>
                </select>
              </div>
            </>
          )}

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Пароль *
            </label>
            <input
              id="password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Минимум 6 символов"
            />
          </div>

          {/* Password Confirm */}
          <div>
            <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700 mb-1">
              Подтвердите пароль *
            </label>
            <input
              id="password_confirm"
              type="password"
              required
              value={formData.password_confirm}
              onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Повторите пароль"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : isTourist
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        {/* Login Link */}
        <div className="text-center text-sm">
          <span className="text-gray-600">Уже есть аккаунт? </span>
          <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Войти
          </Link>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-blue-600 text-xl">Загрузка...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
