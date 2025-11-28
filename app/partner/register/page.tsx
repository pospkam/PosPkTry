'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, MapPin, Globe, Building2, Mail, Phone, FileText, Upload } from 'lucide-react';

const ROLES = [
  { 
    id: 'operator', 
    name: 'Туроператор', 
    description: 'Организация и продажа туров',
    icon: <MapPin className="w-8 h-8" />,
    gradient: 'from-sky-200 to-cyan-200'
  },
  { 
    id: 'transfer', 
    name: 'Трансфер', 
    description: 'Транспортные услуги',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
        <circle cx="7" cy="17" r="2"/>
        <circle cx="17" cy="17" r="2"/>
      </svg>
    ),
    gradient: 'from-green-400 to-emerald-500'
  },
  { 
    id: 'stay', 
    name: 'Размещение', 
    description: 'Отели, базы, домики',
    icon: <Building2 className="w-8 h-8" />,
    gradient: 'from-purple-400 to-pink-500'
  },
  { 
    id: 'gear', 
    name: 'Аренда снаряжения', 
    description: 'Прокат оборудования',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v6m0 6v6M6 12H1m6 0h6m5.3-5.3l-4.2 4.2m0 0L9.7 6.7m8.5 10.6l-4.2-4.2m0 0l-4.2 4.2"/>
      </svg>
    ),
    gradient: 'from-orange-400 to-red-500'
  },
];

export default function PartnerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1, 2, 3
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const validateStep = (currentStep: number): boolean => {
    setError('');
    
    if (currentStep === 1) {
      if (!formData.name || !formData.email || !formData.phone) {
        setError('Заполните все обязательные поля');
        return false;
      }
      if (!formData.password || formData.password.length < 8) {
        setError('Пароль должен быть не менее 8 символов');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Пароли не совпадают');
        return false;
      }
    }
    
    if (currentStep === 2) {
      if (formData.roles.length === 0) {
        setError('Выберите хотя бы одно направление деятельности');
        return false;
      }
    }
    
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setStep(step - 1);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(3)) {
      return;
    }

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
      <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/15 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-bounce">
            <Check className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Успешно!
          </h1>
          <p className="text-white/80 mb-2">
            Ваша заявка отправлена
          </p>
          <p className="text-sm text-white/60">
            Ожидайте подтверждения администратора
          </p>
          <p className="text-xs text-white/50 mt-4">
            Перенаправление в личный кабинет...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-transparent text-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black mb-3 text-white">
            Регистрация партнера
          </h1>
          <p className="text-lg text-white/70">
            Станьте частью экосистемы Kamchatour Hub
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  step > s ? 'bg-green-500 text-white' :
                  step === s ? 'bg-gradient-to-r from-sky-200 to-cyan-200 text-premium-black shadow-lg' :
                  'bg-white/10 text-white/40'
                }`}>
                  {step > s ? <Check className="w-6 h-6" /> : s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 mx-2 transition-all ${
                    step > s ? 'bg-green-500' : 'bg-white/10'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-white/70 text-sm">
              Шаг {step} из 3: {
                step === 1 ? 'Основная информация' :
                step === 2 ? 'Направления деятельности' :
                'Дополнительно'
              }
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 backdrop-blur-2xl border border-red-500/30 rounded-2xl text-red-400">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ШАГ 1: Основная информация */}
          {step === 1 && (
            <div className="bg-white/15 backdrop-blur-2xl border border-white/15 rounded-3xl p-8 shadow-2xl space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Building2 className="w-7 h-7" />
                Основная информация
              </h2>
              
              <div>
                <label className="block text-sm font-semibold mb-2 text-white/90 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Название компании <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 text-white placeholder-white/40"
                  placeholder="Камчатская рыбалка"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-white/90 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 text-white placeholder-white/40"
                    placeholder="info@example.ru"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-white/90 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Телефон <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 text-white placeholder-white/40"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-white/90">
                    Пароль <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 text-white placeholder-white/40"
                      placeholder="Минимум 8 символов"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                    >
                      {showPassword ? '🙈' : '👁️'}
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
                  <label className="block text-sm font-semibold mb-2 text-white/90">
                    Подтверждение пароля <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 text-white placeholder-white/40"
                      placeholder="Повторите пароль"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-red-400 mt-2">Пароли не совпадают</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ШАГ 2: Направления деятельности */}
          {step === 2 && (
            <div className="bg-white/15 backdrop-blur-2xl border border-white/15 rounded-3xl p-8 shadow-2xl animate-fade-in">
              <h2 className="text-2xl font-bold text-white mb-2">
                Направления деятельности <span className="text-red-400">*</span>
              </h2>
              <p className="text-white/70 mb-6 text-sm">
                Выберите все подходящие направления
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                {ROLES.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleToggle(role.id)}
                    className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                      formData.roles.includes(role.id)
                        ? `border-transparent bg-gradient-to-br ${role.gradient} shadow-xl scale-105`
                        : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={formData.roles.includes(role.id) ? 'text-white' : 'text-white/70'}>
                        {role.icon}
                      </div>
                      <div>
                        <div className="text-xl font-bold text-white">{role.name}</div>
                        <div className="text-sm text-white/70">{role.description}</div>
                      </div>
                    </div>
                    
                    {formData.roles.includes(role.id) && (
                      <div className="mt-3 flex items-center gap-2 text-white font-bold text-sm">
                        <Check className="w-5 h-5" />
                        Выбрано
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {formData.roles.length > 0 && (
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <p className="text-green-400 text-sm flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Выбрано направлений: <strong>{formData.roles.length}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ШАГ 3: Дополнительная информация */}
          {step === 3 && (
            <div className="bg-white/15 backdrop-blur-2xl border border-white/15 rounded-3xl p-8 shadow-2xl space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <FileText className="w-7 h-7" />
                Дополнительная информация
              </h2>

              <div>
                <label className="block text-sm font-semibold mb-2 text-white/90 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Описание компании
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none text-white placeholder-white/40"
                  placeholder="Расскажите о вашей компании, опыте работы, преимуществах..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-white/90 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Адрес
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 text-white placeholder-white/40"
                    placeholder="г. Петропавловск-Камчатский"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-white/90 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Веб-сайт
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 text-white placeholder-white/40"
                    placeholder="https://example.ru"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-4 text-white/90 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Логотип компании
                </label>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="relative group">
                    {logoPreview ? (
                      <div className="w-32 h-32 rounded-2xl border-2 border-white/20 overflow-hidden shadow-xl">
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center bg-white/5">
                        <Upload className="w-12 h-12 text-white/40" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <label className="cursor-pointer">
                      <span className="px-6 py-3 bg-gradient-to-r from-sky-200 to-cyan-200 text-premium-black font-bold rounded-xl inline-flex items-center gap-2 hover:shadow-lg transition-all">
                        <Upload className="w-5 h-5" />
                        Выбрать файл
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                    <div className="mt-3 space-y-1 text-xs text-white/60">
                      <p>PNG, JPG, WEBP · Макс. 5 МБ · 512x512px</p>
                    </div>
                    
                    {logoFile && (
                      <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                        <p className="text-green-400 text-xs flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          {logoFile.name} ({(logoFile.size / 1024).toFixed(1)} КБ)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex-1 px-6 py-4 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/15 transition-all font-bold flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Назад
              </button>
            )}
            
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-sky-200 to-cyan-200 text-premium-black rounded-xl hover:shadow-xl transition-all font-bold flex items-center justify-center gap-2"
              >
                Далее
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl hover:shadow-xl disabled:opacity-50 transition-all font-bold flex items-center justify-center gap-2"
              >
                {loading ? 'Регистрация...' : (
                  <>
                    <Check className="w-5 h-5" />
                    Зарегистрироваться
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}
