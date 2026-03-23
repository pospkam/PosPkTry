'use client';

import { useState, useEffect } from 'react';
import { Protected } from '@/components/auth/Protected';
import { User, Loader2, Save, Lock, AlertCircle, CheckCircle, Send, ExternalLink } from 'lucide-react';

const INPUT_CLASS =
  'w-full min-h-[44px] px-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]';

const INPUT_READONLY_CLASS =
  'w-full min-h-[44px] px-4 bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] cursor-not-allowed select-none';

interface TouristProfile {
  full_name: string | null;
  phone: string | null;
  bio: string | null;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  error: string;
}

type ApiResult<T> = ApiSuccess<T> | ApiError;

interface ProfileApiData {
  profile: TouristProfile;
}

interface MeApiData {
  email: string;
  name: string;
}

function isApiSuccess<T>(res: ApiResult<T>): res is ApiSuccess<T> {
  return res.success === true;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(url, options);
  const json: unknown = await response.json();

  if (
    typeof json === 'object' &&
    json !== null &&
    'success' in json
  ) {
    return json as ApiResult<T>;
  }

  return { success: false, error: 'Неожиданный формат ответа от сервера' };
}

export default function ProfileClient() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const [tgLinked, setTgLinked] = useState<boolean | null>(null);
  const [tgUsername, setTgUsername] = useState<string | null>(null);
  const [tgLink, setTgLink] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setFetchError(null);

      try {
        const [profileResult, meResult] = await Promise.all([
          fetchJson<ProfileApiData>('/api/tourist/profile'),
          fetchJson<MeApiData>('/api/auth/me'),
        ]);

        if (cancelled) return;

        if (!isApiSuccess(profileResult)) {
          setFetchError(profileResult.error ?? 'Ошибка при загрузке профиля');
          setLoading(false);
          return;
        }

        if (!isApiSuccess(meResult)) {
          setFetchError(meResult.error ?? 'Ошибка при загрузке данных пользователя');
          setLoading(false);
          return;
        }

        const profile = profileResult.data.profile;
        setName(profile.full_name ?? '');
        setPhone(profile.phone ?? '');
        setBio(profile.bio ?? '');
        setEmail(meResult.data.email ?? '');

        // Загружаем статус Telegram
        const tgRes = await fetch('/api/telegram/connect');
        if (tgRes.ok) {
          const tgData = await tgRes.json() as { linked: boolean; username?: string; link?: string };
          setTgLinked(tgData.linked);
          setTgUsername(tgData.username ?? null);
          setTgLink(tgData.link ?? null);
        }
      } catch {
        if (!cancelled) {
          setFetchError('Не удалось загрузить профиль. Проверьте соединение.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const result = await fetchJson<TouristProfile>('/api/tourist/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: name.trim() || null,
          phone: phone.trim() || null,
          bio: bio.trim() || null,
        }),
      });

      if (isApiSuccess(result)) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setSaveError(result.error ?? 'Ошибка при сохранении профиля');
      }
    } catch {
      setSaveError('Не удалось сохранить профиль. Проверьте соединение.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(false);

    if (newPassword !== confirmNewPassword) {
      setPwdError('Новый пароль и подтверждение не совпадают');
      return;
    }
    if (newPassword.length < 8) {
      setPwdError('Новый пароль должен содержать не менее 8 символов');
      return;
    }

    setPwdSaving(true);
    try {
      const result = await fetchJson<{ message: string }>('/api/tourist/profile/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (isApiSuccess(result)) {
        setPwdSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => setPwdSuccess(false), 5000);
      } else {
        setPwdError(result.error ?? 'Ошибка при смене пароля');
      }
    } catch {
      setPwdError('Не удалось сменить пароль. Проверьте соединение.');
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <Protected roles={['tourist', 'admin']}>
      <div className="max-w-5xl mx-auto px-4 py-6 lg:py-8">
        <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-6">
          Профиль
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : fetchError ? (
          <div className="flex items-center gap-3 rounded-lg border border-[var(--danger)] bg-[var(--bg-card)] text-[var(--danger)] p-5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{fetchError}</span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Main profile form */}
            <form
              onSubmit={(e) => { void handleSaveProfile(e); }}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <User className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Личные данные
                </h2>
              </div>

              <div>
                <label htmlFor="profile-name" className="block text-sm mb-1 text-[var(--text-secondary)]">
                  Имя
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ваше имя"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="block text-sm mb-1 text-[var(--text-secondary)]">
                  Email
                  <span className="ml-2 text-xs text-[var(--text-muted)]">
                    (только для чтения)
                  </span>
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  readOnly
                  tabIndex={-1}
                  className={INPUT_READONLY_CLASS}
                />
              </div>

              <div>
                <label htmlFor="profile-phone" className="block text-sm mb-1 text-[var(--text-secondary)]">
                  Телефон
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 900 000-00-00"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="profile-bio" className="block text-sm mb-1 text-[var(--text-secondary)]">
                  О себе
                </label>
                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Расскажите о себе"
                  rows={3}
                  className={`${INPUT_CLASS} resize-y py-3`}
                />
              </div>

              {saveSuccess && (
                <div className="flex items-center gap-2 text-sm rounded-lg px-4 py-3 bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Профиль успешно сохранён
                </div>
              )}
              {saveError && (
                <div className="flex items-center gap-2 text-sm rounded-lg px-4 py-3 bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {saveError}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="ds-btn ds-btn-primary flex items-center gap-2 min-h-[44px] px-6"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </form>

            {/* Telegram personal channel */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Send className="w-5 h-5 text-[var(--ocean)]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Личный Telegram-канал
                </h2>
              </div>

              {tgLinked === null ? (
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Проверяем статус...
                </div>
              ) : tgLinked ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-[var(--success)]">
                    <CheckCircle className="w-5 h-5" />
                    <span>
                      Telegram подключён{tgUsername ? ` (@${tgUsername})` : ''}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    Уведомления о поездках приходят в бот @KuzmichKam_bot
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Подключи Telegram — Кузьмич будет присылать статусы броней,
                    напоминания о поездках и отвечать на вопросы прямо в чате.
                  </p>
                  {tgLink ? (
                    <a
                      href={tgLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ds-btn ds-btn-primary inline-flex items-center gap-2 min-h-[44px] px-5"
                    >
                      <Send className="w-4 h-4" />
                      Открыть в Telegram
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">Ссылка недоступна</p>
                  )}
                </div>
              )}
            </div>

            {/* Password change form */}
            <form
              onSubmit={(e) => { void handleChangePassword(e); }}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-[var(--warning)]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Смена пароля
                </h2>
              </div>

              <div>
                <label htmlFor="pwd-current" className="block text-sm mb-1 text-[var(--text-secondary)]">
                  Текущий пароль
                </label>
                <input
                  id="pwd-current"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Введите текущий пароль"
                  autoComplete="current-password"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="pwd-new" className="block text-sm mb-1 text-[var(--text-secondary)]">
                  Новый пароль
                </label>
                <input
                  id="pwd-new"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Не менее 8 символов"
                  autoComplete="new-password"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="pwd-confirm" className="block text-sm mb-1 text-[var(--text-secondary)]">
                  Подтвердите новый пароль
                </label>
                <input
                  id="pwd-confirm"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Повторите новый пароль"
                  autoComplete="new-password"
                  className={INPUT_CLASS}
                />
              </div>

              {pwdSuccess && (
                <div className="flex items-center gap-2 text-sm rounded-lg px-4 py-3 bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Пароль успешно изменён
                </div>
              )}
              {pwdError && (
                <div className="flex items-center gap-2 text-sm rounded-lg px-4 py-3 bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {pwdError}
                </div>
              )}

              <button
                type="submit"
                disabled={pwdSaving || !currentPassword || !newPassword || !confirmNewPassword}
                className="ds-btn ds-btn-primary flex items-center gap-2 min-h-[44px] px-6"
              >
                {pwdSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {pwdSaving ? 'Сохранение...' : 'Изменить пароль'}
              </button>
            </form>
          </div>
        )}
      </div>
    </Protected>
  );
}
