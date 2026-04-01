'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mountain, Check, ArrowRight, Eye, EyeOff } from 'lucide-react';

const PERKS = [
  'Первый месяц — 0% комиссии',
  'Личный кабинет с календарём и аналитикой',
  '1189 маршрутов уже в базе — привяжите тур к маршруту',
  'Автоматические уведомления о бронированиях',
  'Поддержка команды при настройке',
];

const INP = 'w-full px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';
const LBL = 'block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5';

export default function JoinClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    telegram: '',
    pd_consent: false,
  });

  function set(k: keyof typeof form, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.pd_consent) { setError('Необходимо согласие на обработку персональных данных'); return; }
    if (form.password.length < 6) { setError('Пароль минимум 6 символов'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: 'operator',
          roles: ['operator'],
          pd_consent: true,
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string; user?: { id: string; role: string }; token?: string };

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Ошибка регистрации');
      }

      // Save to localStorage for AuthContext
      localStorage.setItem('user', JSON.stringify({
        ...data.user,
        token: data.token,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      setDone(true);
      setTimeout(() => router.push('/hub/operator'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'var(--success)' }}>
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Добро пожаловать!
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Переходим в личный кабинет...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-5xl mx-auto px-4 py-12 grid lg:grid-cols-2 gap-12 items-start">

        {/* Left — value prop */}
        <div className="space-y-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 mb-8">
              <Mountain className="w-6 h-6" style={{ color: 'var(--accent)' }} />
              <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                KamchatourHub
              </span>
            </Link>
            <h1 className="text-4xl font-bold leading-tight" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--text-primary)' }}>
              Разместите туры<br />
              <span style={{ color: 'var(--accent)' }}>на Камчатке</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Платформа для туроператоров, гидов и транспортных компаний.
              Управляйте бронированиями, получайте лиды и аналитику в одном месте.
            </p>
          </div>

          <ul className="space-y-3">
            {PERKS.map(perk => (
              <li key={perk} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'var(--success)' }}>
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{perk}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Уже есть аккаунт?{' '}
            <Link href="/auth/login" className="hover:underline" style={{ color: 'var(--ocean)' }}>
              Войдите здесь
            </Link>
          </p>
        </div>

        {/* Right — form */}
        <div className="ds-card p-8">
          <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            Создать аккаунт
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={LBL}>Название компании / ваше имя</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={INP}
                placeholder="Камчатская рыбалка — Иван Петров"
                required
                minLength={2}
              />
            </div>

            <div>
              <label className={LBL}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className={INP}
                placeholder="operator@example.com"
                required
              />
            </div>

            <div>
              <label className={LBL}>Пароль</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className={INP + ' pr-10'}
                  placeholder="Минимум 6 символов"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className={LBL}>Телефон <span style={{ color: 'var(--text-muted)' }}>(необязательно)</span></label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className={INP}
                placeholder="+7 900 000-00-00"
              />
            </div>

            <div>
              <label className={LBL}>Telegram <span style={{ color: 'var(--text-muted)' }}>(необязательно)</span></label>
              <input
                type="text"
                value={form.telegram}
                onChange={e => set('telegram', e.target.value)}
                className={INP}
                placeholder="@username"
              />
            </div>

            {/* PD consent */}
            <label className="flex items-start gap-3 cursor-pointer">
              <div
                onClick={() => set('pd_consent', !form.pd_consent)}
                className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                style={{
                  borderColor: form.pd_consent ? 'var(--accent)' : 'var(--border)',
                  background: form.pd_consent ? 'var(--accent)' : 'transparent',
                }}
              >
                {form.pd_consent && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Я согласен на{' '}
                <Link href="/legal/privacy" className="hover:underline" style={{ color: 'var(--ocean)' }}>
                  обработку персональных данных
                </Link>
              </span>
            </label>

            {error && (
              <p className="text-sm px-3 py-2 rounded-md" style={{ background: 'var(--danger)/10', color: 'var(--danger)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full ds-btn ds-btn-primary flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Зарегистрироваться
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
