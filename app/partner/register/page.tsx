'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target, Truck, Home, Fish } from 'lucide-react';

const ROLES = [
  { id: 'operator', name: 'Туроператор', description: 'Организация и продажа туров' },
  { id: 'transfer', name: 'Трансфер', description: 'Транспортные услуги' },
  { id: 'stay', name: 'Размещение', description: 'Отели, базы, домики' },
  { id: 'gear', name: 'Аренда снаряжения', description: 'Прокат оборудования' },
];

export default function PartnerRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
    address: '',
    website: '',
    roles: [] as string[],
    logoUrl: '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

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
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // В реальном проекте здесь была бы загрузка файла на сервер
      // Для демо используем data URL
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
      <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/15 border border-white/15 rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-white mb-2">Успешно!</h1>
          <p className="text-white/70 mb-4">
            Ваша заявка отправлена. Ожидайте подтверждения администратора.
          </p>
          <div className="text-sm text-white/50">
            Перенаправление в личный кабинет...
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-transparent text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Регистрация партнера</h1>
          <p className="text-white/70">
            Заполните форму, чтобы стать партнером Kamchatour Hub
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основная информация */}
          <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Основная информация</h2>
            
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Название компании <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
                  placeholder="Камчатская рыбалка"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
                    placeholder="info@kamchatka-fishing.ru"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Телефон <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Описание компании
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
                  placeholder="Расскажите о вашей компании..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Адрес
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
                  placeholder="г. Петропавловск-Камчатский, ул. Ленинская, 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Веб-сайт
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
                  placeholder="https://kamchatka-fishing.ru"
                />
              </div>
            </div>
          </div>

          {/* Выбор ролей */}
          <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-2">
              Выберите направления деятельности <span className="text-red-400">*</span>
            </h2>
            <p className="text-sm text-white/70 mb-4">
              Можно выбрать несколько
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleRoleToggle(role.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    formData.roles.includes(role.id)
                      ? 'border-white/15 bg-premium-gold/10'
                      : 'border-white/15 bg-white/15 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{role.icon}</span>
                    <span className="font-bold">{role.name}</span>
                  </div>
                  <p className="text-sm text-white/70">{role.description}</p>
                </button>
              ))}
            </div>

            {formData.roles.length === 0 && (
              <p className="text-red-400 text-sm mt-2">
                Выберите хотя бы одно направление
              </p>
            )}
          </div>

          {/* Логотип */}
          <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Логотип компании</h2>

            <div className="flex items-center gap-6">
              {logoPreview ? (
                <div className="w-32 h-32 rounded-xl border-2 border-white/15 overflow-hidden">
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center bg-white/15">
                  <span className="text-4xl">📷</span>
                </div>
              )}

              <div className="flex-1">
                <label className="block">
                  <span className="px-4 py-2 bg-premium-gold text-premium-black font-bold rounded-xl cursor-pointer hover:bg-premium-gold/90 transition-colors inline-block">
                    Выбрать файл
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-white/70 mt-2">
                  PNG, JPG до 5 МБ. Рекомендуемый размер: 512x512px
                </p>
              </div>
            </div>
          </div>

          {/* Кнопка отправки */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-white/15 border border-white/15 text-white rounded-xl hover:bg-white/10 transition-colors font-bold"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || formData.roles.length === 0}
              className="flex-1 px-6 py-3 bg-premium-gold text-premium-black rounded-xl hover:bg-premium-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
            >
              {loading ? 'Отправка...' : 'Зарегистрироваться'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
