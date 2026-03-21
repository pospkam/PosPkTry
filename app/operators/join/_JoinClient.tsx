'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Mountain, Fish, Car, Hotel, Backpack, Users } from 'lucide-react';

const CATEGORIES = [
  { value: 'operator',  label: 'Туроператор',       icon: Mountain, desc: 'Многодневные маршруты, пакетные туры' },
  { value: 'guide',     label: 'Гид',                icon: Users,    desc: 'Индивидуальные и групповые экскурсии' },
  { value: 'fishing',   label: 'Рыболовный тур',     icon: Fish,     desc: 'Рыбалка, охота, охотничьи туры' },
  { value: 'transfer',  label: 'Трансфер',            icon: Car,      desc: 'Перевозка туристов, вахтовки, вертолёты' },
  { value: 'hotel',     label: 'Размещение',          icon: Hotel,    desc: 'Базы, глэмпинги, гостиницы' },
  { value: 'rent',      label: 'Аренда снаряжения',   icon: Backpack, desc: 'Одежда, оборудование, транспорт' },
];

const BENEFITS = [
  'Карточка компании в каталоге TourHab',
  'Онлайн-бронирование с оплатой',
  'Личный кабинет — заявки, календарь, аналитика',
  'Уведомления о новых бронированиях на email',
  'Выход на туристов из всей России',
];

export default function JoinClient() {
  const router = useRouter();

  const [form, setForm] = useState({
    companyName: '',
    category: '',
    description: '',
    contactName: '',
    phone: '',
    email: '',
    password: '',
    passwordConfirm: '',
    pd_consent: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category) { setError('Выберите категорию деятельности'); return; }
    if (form.password.length < 8) { setError('Пароль должен быть минимум 8 символов'); return; }
    if (form.password !== form.passwordConfirm) { setError('Пароли не совпадают'); return; }
    if (!form.pd_consent) { setError('Необходимо согласие на обработку персональных данных'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register-operator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, pd_consent: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Ошибка регистрации');
      } else {
        setDone(true);
        setTimeout(() => router.push('/hub/operator'), 2000);
      }
    } catch {
      setError('Ошибка соединения. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen ds-page flex items-center justify-center p-6">
        <div className="ds-card p-10 max-w-md w-full text-center">
          <CheckCircle className="mx-auto mb-4" size={48} color="var(--success)" />
          <h1 className="ds-h2 mb-2">Добро пожаловать!</h1>
          <p className="text-[var(--text-secondary)]">Перенаправляем в ваш кабинет…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ds-page">
      <div className="max-w-5xl mx-auto px-4 py-16">

        {/* Заголовок */}
        <div className="text-center mb-14">
          <p className="ds-label mb-3" style={{ color: 'var(--accent)' }}>Для бизнеса</p>
          <h1 className="ds-h1 mb-4">Разместите туры на TourHab</h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">
            Получайте бронирования от туристов, которые уже ищут туры на Камчатке
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-10">

          {/* Форма */}
          <form onSubmit={submit} className="space-y-8">

            {/* Шаг 1 — Категория */}
            <div className="ds-card p-6">
              <h2 className="ds-h2 mb-1 text-xl">Чем занимаетесь?</h2>
              <p className="text-[var(--text-secondary)] text-sm mb-5">Выберите основную категорию</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const active = form.category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => set('category', cat.value)}
                      className={`text-left p-4 rounded-lg border transition-all duration-150 ${
                        active
                          ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                          : 'border-[var(--border)] hover:border-[var(--accent)]/50 bg-[var(--bg-hover)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={16} color={active ? 'var(--accent)' : 'var(--text-muted)'} />
                        <span className={`font-semibold text-sm ${active ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                          {cat.label}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">{cat.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Шаг 2 — Компания */}
            <div className="ds-card p-6 space-y-4">
              <h2 className="ds-h2 text-xl">О компании</h2>
              <div>
                <label className="ds-label block mb-1">Название компании *</label>
                <input
                  className="ds-input w-full"
                  placeholder="Камчатская Рыбалка"
                  value={form.companyName}
                  onChange={e => set('companyName', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="ds-label block mb-1">Коротко о вас</label>
                <textarea
                  className="ds-input w-full resize-none"
                  rows={3}
                  placeholder="Организуем рыбалку на реке Камчатка с 2010 года…"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">{form.description.length}/500</p>
              </div>
            </div>

            {/* Шаг 3 — Контакт */}
            <div className="ds-card p-6 space-y-4">
              <h2 className="ds-h2 text-xl">Контактное лицо</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label block mb-1">Ваше имя *</label>
                  <input
                    className="ds-input w-full"
                    placeholder="Иван Петров"
                    value={form.contactName}
                    onChange={e => set('contactName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="ds-label block mb-1">Телефон *</label>
                  <input
                    className="ds-input w-full"
                    type="tel"
                    placeholder="+7 (900) 000-00-00"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Шаг 4 — Аккаунт */}
            <div className="ds-card p-6 space-y-4">
              <h2 className="ds-h2 text-xl">Аккаунт</h2>
              <div>
                <label className="ds-label block mb-1">Email *</label>
                <input
                  className="ds-input w-full"
                  type="email"
                  placeholder="info@example.ru"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
              <div>
                <label className="ds-label block mb-1">Пароль *</label>
                <input
                  className="ds-input w-full"
                  type="password"
                  placeholder="Минимум 8 символов"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label className="ds-label block mb-1">Повторите пароль *</label>
                <input
                  className="ds-input w-full"
                  type="password"
                  placeholder="Повторите пароль"
                  value={form.passwordConfirm}
                  onChange={e => set('passwordConfirm', e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                {form.passwordConfirm && form.password !== form.passwordConfirm && (
                  <p className="text-xs text-[var(--danger)] mt-1">Пароли не совпадают</p>
                )}
              </div>
            </div>

            {/* Согласие + кнопка */}
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-[var(--accent)]"
                  checked={form.pd_consent}
                  onChange={e => set('pd_consent', e.target.checked)}
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  Согласен(а) на обработку персональных данных в соответствии с{' '}
                  <a href="/legal/privacy" className="text-[var(--ocean)] hover:underline">политикой конфиденциальности</a>
                </span>
              </label>

              {error && (
                <p className="text-[var(--danger)] text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="ds-btn ds-btn-primary w-full py-3 text-base"
              >
                {loading ? 'Регистрация…' : 'Создать кабинет оператора'}
              </button>

              <p className="text-center text-sm text-[var(--text-muted)]">
                Уже зарегистрированы?{' '}
                <a href="/auth/signin" className="text-[var(--ocean)] hover:underline">Войти</a>
              </p>
            </div>
          </form>

          {/* Sidebar — преимущества */}
          <div className="space-y-6">
            <div className="ds-card p-6">
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">Что вы получаете</h3>
              <ul className="space-y-3">
                {BENEFITS.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <CheckCircle size={16} className="mt-0.5 shrink-0" color="var(--success)" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="ds-card p-6">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                После регистрации ваша карточка появится в каталоге после проверки модератором.
                Обычно это занимает до 24 часов.
              </p>
            </div>

            <div className="ds-card p-6">
              <p className="ds-label mb-2">Вопросы?</p>
              <a href="mailto:support@tourhab.ru" className="text-[var(--ocean)] text-sm hover:underline">
                support@tourhab.ru
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
