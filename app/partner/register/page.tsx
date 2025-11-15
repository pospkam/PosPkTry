'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDevice } from '@/lib/device';
import WeatherBackground from '@/components/WeatherBackground';

// Типы
interface FormData {
  // Шаг 1: Основная информация
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  
  // Шаг 2: О компании
  description: string;
  address: string;
  website: string;
  logoUrl: string;
  
  // Шаг 3: Направления
  roles: string[];
}

const ROLES = [
  { id: 'operator', name: 'Туроператор', description: 'Организация и продажа туров', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { id: 'transfer', name: 'Трансфер', description: 'Транспортные услуги', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  { id: 'stay', name: 'Размещение', description: 'Отели, базы, домики', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'gear', name: 'Аренда снаряжения', description: 'Прокат оборудования', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
];

const INITIAL_FORM_DATA: FormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  description: '',
  address: '',
  website: '',
  logoUrl: '',
  roles: []
};

export default function PartnerRegisterPage() {
  const router = useRouter();
  const device = useDevice();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Автосохранение в localStorage
  useEffect(() => {
    const saved = localStorage.getItem('partner-registration-draft');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setFormData(data);
      } catch (e) {
        console.error('Failed to load saved data:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (formData.name || formData.email) {
      localStorage.setItem('partner-registration-draft', JSON.stringify(formData));
    }
  }, [formData]);

  // Валидация шагов
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          setError('Введите название компании');
          return false;
        }
        if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          setError('Введите корректный email');
          return false;
        }
        if (!formData.phone.trim()) {
          setError('Введите номер телефона');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Пароль должен быть не менее 8 символов');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Пароли не совпадают');
          return false;
        }
        break;
      case 2:
        // Описание опционально, но если заполнено - проверяем
        if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
          setError('Введите корректный URL сайта (начинается с http:// или https://)');
          return false;
        }
        break;
      case 3:
        if (formData.roles.length === 0) {
          setError('Выберите хотя бы одно направление деятельности');
          return false;
        }
        break;
    }
    setError('');
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleRoleToggle = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter(r => r !== roleId)
        : [...prev.roles, roleId]
    }));
  };

  // Drag & Drop для логотипа
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processLogoFile(file);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processLogoFile(file);
    }
  };

  const processLogoFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5 МБ');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setFormData(prev => ({ ...prev, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/partners/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка при регистрации');
      }

      setSuccess(true);
      localStorage.removeItem('partner-registration-draft');
      
      setTimeout(() => {
        router.push('/partner/dashboard');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <WeatherBackground />
        <div className="relative z-10 max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl p-8 sm:p-12 text-center border border-white/20 shadow-2xl">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Заявка отправлена!</h1>
          <p className="text-white/80 text-lg mb-6">
            Ваша заявка отправлена на модерацию. Мы свяжемся с вами в ближайшее время.
          </p>
          <div className="text-sm text-white/60">
            Перенаправление в личный кабинет...
          </div>
        </div>
      </div>
    );
  }

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen relative">
      <WeatherBackground />
      
      <main className="relative z-10 min-h-screen flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Регистрация партнера
            </h1>
            <p className="text-white/70 text-base sm:text-lg">
              Шаг {currentStep} из {totalSteps}
            </p>
          </div>

          {/* Прогресс-бар */}
          <div className="mb-8">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Форма */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl">
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Шаг 1: Основная информация */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <h2 className="text-2xl font-bold text-white mb-6">Основная информация</h2>
                
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Название компании *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="ООО Камчатские приключения"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="info@company.ru"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Телефон *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Пароль *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                      placeholder="Минимум 8 символов"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {showPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Подтвердите пароль *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                      placeholder="Повторите пароль"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {showConfirmPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Шаг 2: О компании */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <h2 className="text-2xl font-bold text-white mb-6">О компании</h2>
                
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Расскажите о вашей компании..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Адрес
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="г. Петропавловск-Камчатский, ул. Ленинская, 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Веб-сайт
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="https://company.ru"
                  />
                </div>

                {/* Drag & Drop Логотип */}
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Логотип компании
                  </label>
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-white/20 bg-white/5 hover:border-white/40'
                    }`}
                  >
                    {logoPreview ? (
                      <div className="space-y-4">
                        <img src={logoPreview} alt="Logo preview" className="w-32 h-32 mx-auto object-cover rounded-xl" />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoPreview('');
                            setLogoFile(null);
                            setFormData({ ...formData, logoUrl: '' });
                          }}
                          className="text-sm text-red-300 hover:text-red-200 transition-colors"
                        >
                          Удалить
                        </button>
                      </div>
                    ) : (
                      <div>
                        <svg className="w-12 h-12 mx-auto mb-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-white/70 mb-2">Перетащите файл сюда или</p>
                        <label className="inline-block px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer transition-colors">
                          Выберите файл
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-white/50 mt-3">PNG, JPG до 5 МБ</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Шаг 3: Направления */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <h2 className="text-2xl font-bold text-white mb-2">Направления деятельности</h2>
                <p className="text-white/70 mb-6">Выберите одно или несколько направлений</p>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  {ROLES.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleToggle(role.id)}
                      className={`p-5 rounded-xl text-left transition-all ${
                        formData.roles.includes(role.id)
                          ? 'bg-blue-500/30 border-2 border-blue-400 shadow-lg shadow-blue-500/20'
                          : 'bg-white/10 border-2 border-white/20 hover:bg-white/15'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-white flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={role.icon} />
                        </svg>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">{role.name}</h3>
                          <p className="text-sm text-white/70">{role.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Кнопки навигации */}
            <div className="flex gap-3 mt-8">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-medium transition-all"
                >
                  Назад
                </button>
              )}
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all shadow-lg"
                >
                  Далее
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Отправка...' : 'Зарегистрироваться'}
                </button>
              )}
            </div>

            {/* Черновик сохранен */}
            {formData.name && (
              <p className="text-xs text-white/50 text-center mt-4">
                Черновик автоматически сохранен
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
