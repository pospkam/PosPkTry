'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, Eye, EyeOff, Building2, Truck, Home, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ROLES = [
  { id: 'operator', name: 'Туры', icon: Building2, description: 'Организация туров' },
  { id: 'transfer', name: 'Трансфер', icon: Truck, description: 'Трансфер и доставка' },
  { id: 'stay', name: 'Размещение', icon: Home, description: 'Базы и гостиницы' },
  { id: 'gear', name: 'Снаряжение', icon: Package, description: 'Прокат снаряжения' },
];

const INPUT = 'w-full px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';
const LABEL = 'block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5';

export default function AuthPageClient() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    description: '', address: '', website: '', roles: [] as string[], logoUrl: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  const getPasswordStrength = (password: string) => {
    if (!password) return { level: 0, text: '', color: '' };
    if (password.length < 6) return { level: 1, text: 'Слабый', color: 'bg-[var(--danger)]' };
    if (password.length < 8) return { level: 2, text: 'Средний', color: 'bg-[var(--warning)]' };
    if (password.length < 12) return { level: 3, text: 'Хороший', color: 'bg-[var(--success)]' };
    return { level: 4, text: 'Отличный', color: 'bg-[var(--accent)]' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleRoleToggle = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId) ? prev.roles.filter(r => r !== roleId) : [...prev.roles, roleId],
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Размер файла не должен превышать 5 МБ'); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const validateStep = (currentStep: number): boolean => {
    setError('');
    if (currentStep === 1) {
      if (!formData.name || !formData.email || !formData.phone) { setError('Заполните все обязательные поля'); return false; }
      if (!formData.password || formData.password.length < 8) { setError('Пароль должен быть не менее 8 символов'); return false; }
      if (formData.password !== formData.confirmPassword) { setError('Пароли не совпадают'); return false; }
    }
    if (currentStep === 2 && formData.roles.length === 0) { setError('Выберите хотя бы одно направление деятельности'); return false; }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(loginData.email, loginData.password);
      // signIn saves user to localStorage before returning
      const storedUser = JSON.parse(localStorage.getItem('user') ?? '{}') as { role?: string };
      const role = storedUser.role ?? 'tourist';
      const roleRedirect: Record<string, string> = {
        tourist: '/hub/tourist',
        operator: '/hub/operator',
        guide: '/hub/guide',
        admin: '/hub/admin',
        transfer: '/hub/operator',
        transfer_operator: '/hub/operator',
        agent: '/hub/operator',
      };
      const from = new URLSearchParams(window.location.search).get('from');
      router.push(from ?? roleRedirect[role] ?? '/hub/tourist');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/partners/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, logoUrl: logoPreview || '' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка при регистрации');
      setSuccess(true);
      setTimeout(() => router.push('/partner/dashboard'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-[var(--success)]/10 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6 text-[var(--success)]" />
          </div>
          <h1 className="text-base font-semibold text-[var(--text-primary)] mb-2">Заявка принята</h1>
          <p className="text-sm text-[var(--text-muted)]">Перенаправление в личный кабинет...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image src="/logo-kamchatka.svg" alt="Kamchatka Tour Hub" width={48} height={48} />
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Kamchatour Hub</h1>
          <p className="text-sm text-[var(--text-muted)]">Платформа для туристического бизнеса Камчатки</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 mb-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-1 max-w-xs mx-auto">
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setStep(1); setError(''); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === m ? 'bg-[var(--accent)] text-[var(--bg-card)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}>
              {m === 'login' ? 'Вход' : 'Регистрация'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-md text-sm text-[var(--danger)]">{error}</div>
        )}

        {/* LOGIN */}
        {mode === 'login' && (
          <div className="max-w-sm mx-auto">
            <form onSubmit={handleLogin} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
              <div>
                <label htmlFor="login-email" className={LABEL}>Email</label>
                <input id="login-email" type="email" required value={loginData.email}
                  onChange={e => setLoginData({ ...loginData, email: e.target.value })}
                  className={INPUT} placeholder="info@kamchatka-fishing.ru" />
              </div>
              <div>
                <label htmlFor="login-password" className={LABEL}>Пароль</label>
                <div className="relative">
                  <input id="login-password" type={showPassword ? 'text' : 'password'} required
                    value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                    className={INPUT} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-[var(--accent)] text-[var(--bg-card)] text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity">
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </form>
            <div className="text-center mt-4">
              <Link href="/demo" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                Демо-режим (без регистрации)
              </Link>
            </div>
          </div>
        )}

        {/* REGISTER MULTI-STEP */}
        {mode === 'register' && (
          <div>
            {/* Steps indicator */}
            <div className="flex items-center gap-2 mb-4 max-w-xs mx-auto">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    step > s ? 'bg-[var(--success)] text-white' :
                    step === s ? 'bg-[var(--accent)] text-[var(--bg-card)]' :
                    'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]'
                  }`}>
                    {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                  </div>
                  {s < 3 && <div className={`flex-1 h-px ${step > s ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`} />}
                </React.Fragment>
              ))}
            </div>
            <p className="text-center text-xs text-[var(--text-muted)] mb-5">
              Шаг {step} из 3 — {step === 1 ? 'Основная информация' : step === 2 ? 'Направления деятельности' : 'Дополнительно'}
            </p>

            <form onSubmit={handleRegister} className="space-y-4">
              {/* ШАГ 1 */}
              {step === 1 && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Основная информация</h2>
                  <div>
                    <label htmlFor="reg-name" className={LABEL}>Название компании <span className="text-[var(--danger)]">*</span></label>
                    <input id="reg-name" type="text" required value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className={INPUT} placeholder="Камчатская рыбалка" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-email" className={LABEL}>Email <span className="text-[var(--danger)]">*</span></label>
                      <input id="reg-email" type="email" required value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className={INPUT} placeholder="info@example.ru" />
                    </div>
                    <div>
                      <label htmlFor="reg-phone" className={LABEL}>Телефон <span className="text-[var(--danger)]">*</span></label>
                      <input id="reg-phone" type="tel" required value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className={INPUT} placeholder="+7 (999) 123-45-67" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-password" className={LABEL}>Пароль <span className="text-[var(--danger)]">*</span></label>
                      <div className="relative">
                        <input id="reg-password" type={showPassword ? 'text' : 'password'} required
                          value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                          className={INPUT} placeholder="Мин. 8 символов" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {formData.password && (
                        <div className="mt-1.5 flex gap-1">
                          {[1, 2, 3, 4].map(level => (
                            <div key={level} className={`h-1 flex-1 rounded-full ${level <= passwordStrength.level ? passwordStrength.color : 'bg-[var(--border)]'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label htmlFor="reg-confirm" className={LABEL}>Подтверждение <span className="text-[var(--danger)]">*</span></label>
                      <div className="relative">
                        <input id="reg-confirm" type={showConfirmPassword ? 'text' : 'password'} required
                          value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className={INPUT} placeholder="Повторите пароль" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <p className="text-[10px] text-[var(--danger)] mt-1">Пароли не совпадают</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ШАГ 2 */}
              {step === 2 && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Направления деятельности</h2>
                  <p className="text-xs text-[var(--text-muted)] mb-4">Выберите все подходящие направления</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {ROLES.map(role => {
                      const Icon = role.icon;
                      const selected = formData.roles.includes(role.id);
                      return (
                        <button key={role.id} type="button" onClick={() => handleRoleToggle(role.id)}
                          className={`flex items-center gap-3 p-4 rounded-md border text-left transition-colors ${
                            selected
                              ? 'bg-[var(--accent)]/10 border-[var(--accent)]/40'
                              : 'bg-[var(--bg-primary)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                          }`}>
                          <Icon className={`w-5 h-5 shrink-0 ${selected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-[var(--text-primary)]">{role.name}</div>
                            <div className="text-[10px] text-[var(--text-muted)]">{role.description}</div>
                          </div>
                          {selected && <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ШАГ 3 */}
              {step === 3 && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Дополнительная информация</h2>
                  <div>
                    <label htmlFor="reg-desc" className={LABEL}>Описание компании</label>
                    <textarea id="reg-desc" value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      rows={3} className={`${INPUT} resize-none`}
                      placeholder="Расскажите о вашей компании, опыте работы, преимуществах..." />
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-address" className={LABEL}>Адрес</label>
                      <input id="reg-address" type="text" value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className={INPUT} placeholder="г. Петропавловск-Камчатский" />
                    </div>
                    <div>
                      <label htmlFor="reg-website" className={LABEL}>Веб-сайт</label>
                      <input id="reg-website" type="url" value={formData.website}
                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                        className={INPUT} placeholder="https://example.ru" />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Логотип компании</label>
                    <div className="flex items-center gap-4">
                      {logoPreview ? (
                        <Image src={logoPreview} alt="Logo" width={56} height={56} className="rounded-md border border-[var(--border)] object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-muted)]">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <label htmlFor="logo-upload" className="cursor-pointer text-xs text-[var(--accent)] hover:underline">
                          Выбрать файл
                          <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                        </label>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">PNG, JPG, WEBP · Макс. 5 МБ</p>
                        {logoFile && <p className="text-[10px] text-[var(--success)] mt-0.5">{logoFile.name}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-2">
                {step > 1 && (
                  <button type="button" onClick={() => { setStep(p => p - 1); setError(''); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Назад
                  </button>
                )}
                {step < 3 ? (
                  <button type="button" onClick={() => { if (validateStep(step)) { setStep(p => p + 1); window.scrollTo({ top: 0 }); } }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium bg-[var(--accent)] text-[var(--bg-card)] rounded-md hover:opacity-90 transition-opacity">
                    Далее <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="submit" disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium bg-[var(--accent)] text-[var(--bg-card)] rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity">
                    {loading ? 'Регистрация...' : (<><Check className="w-4 h-4" /> Зарегистрироваться</>)}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        <p className="text-center mt-8 text-[10px] text-[var(--text-muted)]">Kamchatour Hub — платформа туризма Камчатки</p>
      </div>
    </main>
  );
}
