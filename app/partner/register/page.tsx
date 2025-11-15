'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    password: '',
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
      <div className="min-h-screen flex items-center justify-center p-6" style={{
        background: 'linear-gradient(180deg, #4A90E2 0%, #7FB4E8 50%, #B3D9F5 100%)'
      }}>
        <div className="glass-card max-w-md w-full rounded-3xl p-10 text-center" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)'
        }}>
          <div className="text-6xl mb-6" style={{ color: '#fff' }}>✓</div>
          <h1 className="text-3xl font-bold text-white mb-3">Успешно!</h1>
          <p className="text-white/80 text-lg mb-4">
            Ваша заявка отправлена. Ожидайте подтверждения администратора.
          </p>
          <div className="text-sm text-white/60 mt-6">
            Перенаправление в личный кабинет...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Анимированный фон Samsung Weather */}
      <div className="weather-background" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: 'linear-gradient(180deg, #4A90E2 0%, #7FB4E8 40%, #B3D9F5 70%, #E8F4FB 100%)'
      }} />

      <main className="min-h-screen relative z-10 p-6 pt-16">
        <div className="max-w-4xl mx-auto">
          {/* Заголовок */}
          <div className="text-center mb-12">
            <h1 className="hero-title-elegant mb-4" style={{
              fontSize: 'clamp(36px, 6vw, 52px)',
              fontWeight: 300,
              lineHeight: 1.2,
              background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Регистрация партнера
            </h1>
            <p className="hero-subtitle-elegant" style={{
              fontSize: 'clamp(16px, 2.5vw, 20px)',
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: 400
            }}>
              Станьте частью крупнейшей туристической платформы Камчатки
            </p>
          </div>

          {/* Сообщение об ошибке */}
          {error && (
            <div className="glass-card mb-8 p-5 rounded-2xl" style={{
              background: 'rgba(239, 68, 68, 0.15)',
              backdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(239, 68, 68, 0.4)',
              color: '#fecaca'
            }}>
              <strong>Ошибка:</strong> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Основная информация */}
            <div className="glass-card rounded-3xl p-8" style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(30px)',
              border: '1.5px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15)'
            }}>
              <h2 className="section-title-elegant mb-6" style={{
                fontSize: 'clamp(22px, 4vw, 32px)',
                fontWeight: 700,
                color: '#fff'
              }}>
                Основная информация
              </h2>
              
              <div className="grid gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-3 text-white/90">
                    Название компании <span style={{ color: '#fca5a5' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="search-input-elegant w-full h-14 px-5 rounded-xl transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(10px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      fontSize: '16px'
                    }}
                    placeholder="Камчатская рыбалка"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-white/90">
                    Email <span style={{ color: '#fca5a5' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="search-input-elegant w-full h-14 px-5 rounded-xl transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(10px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      fontSize: '16px'
                    }}
                    placeholder="info@kamchatka-fishing.ru"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-white/90">
                      Телефон <span style={{ color: '#fca5a5' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="search-input-elegant w-full h-14 px-5 rounded-xl transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(10px)',
                        border: '1.5px solid rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                        fontSize: '16px'
                      }}
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-3 text-white/90">
                      Пароль <span style={{ color: '#fca5a5' }}>*</span>
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="search-input-elegant w-full h-14 px-5 rounded-xl transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(10px)',
                        border: '1.5px solid rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                        fontSize: '16px'
                      }}
                      placeholder="Минимум 8 символов"
                    />
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
                    className="search-input-elegant w-full px-5 py-4 rounded-xl transition-all resize-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(10px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      fontSize: '16px',
                      lineHeight: '1.6'
                    }}
                    placeholder="Расскажите о вашей компании..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-white/90">
                      Адрес
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="search-input-elegant w-full h-14 px-5 rounded-xl transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(10px)',
                        border: '1.5px solid rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                        fontSize: '16px'
                      }}
                      placeholder="г. Петропавловск-Камчатский"
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
                      className="search-input-elegant w-full h-14 px-5 rounded-xl transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(10px)',
                        border: '1.5px solid rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                        fontSize: '16px'
                      }}
                      placeholder="https://kamchatka-fishing.ru"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Выбор ролей */}
            <div className="glass-card rounded-3xl p-8" style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(30px)',
              border: '1.5px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15)'
            }}>
              <h2 className="section-title-elegant mb-3" style={{
                fontSize: 'clamp(22px, 4vw, 32px)',
                fontWeight: 700,
                color: '#fff'
              }}>
                Направления деятельности <span style={{ color: '#fca5a5' }}>*</span>
              </h2>
              <p className="text-white/70 mb-6 text-base">
                Выберите одно или несколько направлений
              </p>

              <div className="grid md:grid-cols-2 gap-5">
                {ROLES.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleToggle(role.id)}
                    className="innovation-card-elegant p-6 rounded-2xl text-left transition-all"
                    style={{
                      background: formData.roles.includes(role.id)
                        ? 'rgba(139, 92, 246, 0.25)'
                        : 'rgba(255, 255, 255, 0.06)',
                      backdropFilter: 'blur(20px)',
                      border: formData.roles.includes(role.id)
                        ? '2px solid rgba(139, 92, 246, 0.6)'
                        : '1.5px solid rgba(255, 255, 255, 0.12)',
                      transform: formData.roles.includes(role.id) ? 'translateY(-4px)' : 'translateY(0)',
                      boxShadow: formData.roles.includes(role.id)
                        ? '0 16px 40px rgba(139, 92, 246, 0.25)'
                        : 'none'
                    }}
                  >
                    <div className="innovation-title-elegant mb-2" style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#fff'
                    }}>
                      {role.name}
                    </div>
                    <p className="innovation-description-elegant" style={{
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      lineHeight: '1.5'
                    }}>
                      {role.description}
                    </p>
                  </button>
                ))}
              </div>

              {formData.roles.length === 0 && (
                <p className="text-red-300 text-sm mt-4 text-center">
                  Выберите хотя бы одно направление
                </p>
              )}
            </div>

            {/* Логотип */}
            <div className="glass-card rounded-3xl p-8" style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(30px)',
              border: '1.5px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15)'
            }}>
              <h2 className="section-title-elegant mb-6" style={{
                fontSize: 'clamp(22px, 4vw, 32px)',
                fontWeight: 700,
                color: '#fff'
              }}>
                Логотип компании
              </h2>

              <div className="flex flex-col md:flex-row items-center gap-8">
                {logoPreview ? (
                  <div className="w-40 h-40 rounded-2xl overflow-hidden flex-shrink-0" style={{
                    border: '2px solid rgba(139, 92, 246, 0.5)',
                    boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)'
                  }}>
                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-40 h-40 rounded-2xl flex items-center justify-center flex-shrink-0" style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '2px dashed rgba(255, 255, 255, 0.25)'
                  }}>
                    <span className="text-white/40 text-sm font-medium">Логотип</span>
                  </div>
                )}

                <div className="flex-1 w-full">
                  <label className="block">
                    <span className="search-btn-elegant inline-flex items-center gap-2 px-7 py-4 rounded-xl cursor-pointer font-semibold transition-all" style={{
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(139, 92, 246, 0.9))',
                      border: '1px solid rgba(139, 92, 246, 0.6)',
                      color: '#fff',
                      fontSize: '15px'
                    }}>
                      Выбрать файл
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-white/60 text-sm mt-4 leading-relaxed">
                    PNG, JPG до 5 МБ. Рекомендуемый размер: 512x512px
                  </p>
                </div>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex flex-col md:flex-row gap-5">
              <button
                type="button"
                onClick={() => router.back()}
                className="filter-btn-elegant flex-1 px-8 py-5 rounded-xl font-bold transition-all text-base"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff'
                }}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading || formData.roles.length === 0}
                className="search-btn-elegant flex-1 px-8 py-5 rounded-xl font-bold transition-all text-base"
                style={{
                  background: loading || formData.roles.length === 0
                    ? 'rgba(100, 100, 100, 0.5)'
                    : 'linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(139, 92, 246, 0.95))',
                  border: '1px solid rgba(139, 92, 246, 0.6)',
                  color: '#fff',
                  cursor: loading || formData.roles.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: loading || formData.roles.length === 0 ? 0.5 : 1
                }}
              >
                {loading ? 'Отправка...' : 'Зарегистрироваться'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
