'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, User, Briefcase, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import TelegramLoginButton, { type TelegramUser } from './_TelegramLoginButton';

type Mode = 'login' | 'register';
type UserType = 'tourist' | 'partner';

const PARTNER_ROLES = [
  { id: 'operator', label: 'Туроператор', desc: 'Организация туров' },
  { id: 'guide',    label: 'Гид',         desc: 'Проведение экскурсий' },
  { id: 'transfer', label: 'Трансфер',    desc: 'Перевозка туристов' },
  { id: 'agent',    label: 'Агент',       desc: 'Продажа туров' },
] as const;

const INPUT = 'w-full px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';
const LABEL = 'block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5';

export default function AuthPageClient() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [userType, setUserType] = useState<UserType>('tourist');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Форма
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partnerRoles, setPartnerRoles] = useState<string[]>([]);
  const [pdConsent, setPdConsent] = useState(false);

  const toggleRole = (roleId: string) => {
    setPartnerRoles(prev =>
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { level: 0, color: '' };
    if (pwd.length < 6) return { level: 1, color: 'bg-[var(--danger)]' };
    if (pwd.length < 8) return { level: 2, color: 'bg-[var(--warning)]' };
    if (pwd.length < 12) return { level: 3, color: 'bg-[var(--success)]' };
    return { level: 4, color: 'bg-[var(--accent)]' };
  };

  const strength = getPasswordStrength(password);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      const storedUser = JSON.parse(localStorage.getItem('user') ?? '{}') as { role?: string };
      const role = storedUser.role ?? 'tourist';
      const redirectMap: Record<string, string> = {
        tourist: '/hub/tourist',
        operator: '/hub/operator',
        guide: '/hub/guide',
        admin: '/hub/admin',
        transfer: '/hub/transfer-operator',
        agent: '/hub/agent',
      };
      router.push(redirectMap[role] ?? '/hub/tourist');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Валидация
    if (!email || !password || !name) {
      setError('Заполните все обязательные поля');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен быть минимум 6 символов');
      setLoading(false);
      return;
    }
    if (password !== passwordConfirm) {
      setError('Пароли не совпадают');
      setLoading(false);
      return;
    }
    if (userType === 'partner' && partnerRoles.length === 0) {
      setError('Выберите хотя бы одно направление деятельности');
      setLoading(false);
      return;
    }
    if (!pdConsent) {
      setError('Необходимо согласие на обработку персональных данных');
      setLoading(false);
      return;
    }

    try {
      // Регистрация напрямую через API (с ролями)
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          phone: phone || undefined,
          role: userType === 'tourist' ? 'tourist' : partnerRoles[0],
          roles: userType === 'tourist' ? ['tourist'] : partnerRoles,
          pd_consent: true,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Ошибка регистрации');
      }

      // Сохраняем в localStorage для AuthContext
      const userData = {
        ...result.user,
        token: result.token,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      localStorage.setItem('user', JSON.stringify(userData));

      // Редирект
      const primaryRole = userType === 'tourist' ? 'tourist' : partnerRoles[0] ?? 'operator';
      const redirectMap: Record<string, string> = {
        tourist: '/hub/tourist',
        operator: '/hub/operator',
        guide: '/hub/guide',
        transfer: '/hub/transfer-operator',
        agent: '/hub/agent',
        stay: '/hub/operator',
        gear: '/hub/operator',
      };
      router.push(redirectMap[primaryRole] ?? '/hub/tourist');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setPasswordConfirm('');
    setName('');
    setPhone('');
    setPartnerRoles([]);
    setError('');
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    resetForm();
  };

  const handleTelegramAuth = async (tgUser: TelegramUser) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tgUser),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Ошибка Telegram входа');

      const userData = { ...result.data, preferences: {}, createdAt: new Date(), updatedAt: new Date() };
      localStorage.setItem('user', JSON.stringify(userData));
      router.push('/hub/tourist');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа через Telegram');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block mb-3">
            <Image src="/logo-kamchatka.svg" alt="Kamchatour Hub" width={48} height={48} />
          </Link>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Kamchatour Hub</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Туристическая платформа Камчатки</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 mb-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-1">
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {m === 'login' ? 'Вход' : 'Регистрация'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-md text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
            <div>
              <label htmlFor="login-email" className={LABEL}>Email</label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={INPUT}
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="login-password" className={LABEL}>Пароль</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={INPUT}
                  placeholder="Введите пароль"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[var(--accent)] text-white text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* User Type Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUserType('tourist')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                  userType === 'tourist'
                    ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                    : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                }`}
              >
                <User className="w-6 h-6" />
                <div className="text-center">
                  <div className="text-sm font-medium">Путешественник</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Ищу туры</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUserType('partner')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                  userType === 'partner'
                    ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                    : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                }`}
              >
                <Briefcase className="w-6 h-6" />
                <div className="text-center">
                  <div className="text-sm font-medium">Партнёр</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Предоставляю услуги</div>
                </div>
              </button>
            </div>

            {/* Partner Roles */}
            {userType === 'partner' && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                <p className="text-xs text-[var(--text-muted)] mb-3">Выберите направления деятельности</p>
                <div className="grid grid-cols-2 gap-2">
                  {PARTNER_ROLES.map(role => {
                    const selected = partnerRoles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(role.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-md border text-left transition-colors ${
                          selected
                            ? 'bg-[var(--accent)]/10 border-[var(--accent)]/40'
                            : 'bg-[var(--bg-primary)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-[var(--text-primary)] truncate">{role.label}</div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate">{role.desc}</div>
                        </div>
                        {selected && <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
              <div>
                <label htmlFor="reg-name" className={LABEL}>
                  {userType === 'tourist' ? 'Ваше имя' : 'Название компании / Имя'} *
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={INPUT}
                  placeholder={userType === 'tourist' ? 'Иван Петров' : 'Камчатка Тур'}
                />
              </div>

              <div>
                <label htmlFor="reg-email" className={LABEL}>Email *</label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={INPUT}
                  placeholder="your@email.com"
                />
              </div>

              {userType === 'partner' && (
                <div>
                  <label htmlFor="reg-phone" className={LABEL}>Телефон</label>
                  <input
                    id="reg-phone"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className={INPUT}
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              )}

              <div>
                <label htmlFor="reg-password" className={LABEL}>Пароль *</label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={INPUT}
                    placeholder="Минимум 6 символов"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-1.5 flex gap-1">
                    {[1, 2, 3, 4].map(level => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full ${
                          level <= strength.level ? strength.color : 'bg-[var(--border)]'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Повторите пароль */}
              <div>
                <label htmlFor="reg-password-confirm" className={LABEL}>Повторите пароль *</label>
                <input
                  id="reg-password-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  className={INPUT}
                  placeholder="Повторите пароль"
                  autoComplete="new-password"
                />
                {passwordConfirm && password !== passwordConfirm && (
                  <p className="text-xs text-[var(--danger)] mt-1">Пароли не совпадают</p>
                )}
              </div>

              {/* Consent 152-ФЗ */}
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={pdConsent}
                  onChange={e => setPdConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border)] accent-[var(--accent)] cursor-pointer shrink-0"
                />
                <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Даю согласие на{' '}
                  <Link href="/legal/privacy" target="_blank" className="text-[var(--ocean)] hover:underline">
                    обработку персональных данных
                  </Link>{' '}
                  в соответствии с 152-ФЗ
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !pdConsent}
                className="w-full py-2.5 bg-[var(--accent)] text-white text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              </button>
            </div>
          </form>
        )}

        {/* Telegram Login */}
        <div className="mt-4">
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)]">или</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
          <TelegramLoginButton onAuth={handleTelegramAuth} />
          <p className="text-[10px] text-center text-[var(--text-muted)] mt-2">
            Telegram-аккаунт создаётся автоматически
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            Вернуться на главную
          </Link>
        </div>
      </div>
    </main>
  );
}
