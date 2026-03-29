'use client';

import { useState, useEffect } from 'react';
import { Protected } from '@/components/auth/Protected';
import {
  Building2, Loader2, Save, AlertCircle, CheckCircle,
  MapPin, Phone, Globe, MessageSquare, BadgeCheck, Clock,
} from 'lucide-react';

const INPUT = 'w-full min-h-[44px] px-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]';
const INPUT_RO = 'w-full min-h-[44px] px-4 bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] cursor-not-allowed select-none';

interface Contacts { phone?: string; telegram?: string; website?: string }
interface Location { address?: string; city?: string }

interface OperatorProfileData {
  id: string;
  company_name: string | null;
  category: string | null;
  description: string | null;
  short_description: string | null;
  profile_status: string | null;
  is_verified: boolean;
  contacts: Contacts | null;
  location: Location | null;
  services: string[] | null;
  features: string[] | null;
  email: string;
  contact_name: string | null;
}

export default function OperatorProfileClient() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/hub/operator/profile');
        const json = await res.json() as { success: boolean; data: OperatorProfileData; error?: string };
        if (cancelled) return;
        if (!json.success || !json.data) {
          setFetchError(json.error ?? 'Не удалось загрузить профиль');
          setLoading(false);
          return;
        }
        const d = json.data;
        setCompanyName(d.company_name ?? '');
        setEmail(d.email ?? '');
        setCategory(d.category ?? '');
        setDescription(d.description ?? '');
        setShortDescription(d.short_description ?? '');
        setPhone(d.contacts?.phone ?? '');
        setTelegram(d.contacts?.telegram ?? '');
        setWebsite(d.contacts?.website ?? '');
        setCity(d.location?.city ?? '');
        setAddress(d.location?.address ?? '');
        setProfileStatus(d.profile_status ?? null);
        setIsVerified(d.is_verified ?? false);
      } catch {
        if (!cancelled) setFetchError('Не удалось загрузить профиль. Проверьте соединение.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      const res = await fetch('/api/hub/operator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description:       description.trim() || undefined,
          short_description: shortDescription.trim() || undefined,
          phone:             phone.trim() || undefined,
          telegram:          telegram.trim() || undefined,
          website:           website.trim() || undefined,
          location: {
            city:    city.trim() || undefined,
            address: address.trim() || undefined,
          },
        }),
      });
      const json = await res.json() as { success: boolean; message?: string; error?: string };
      if (json.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setSaveError(json.error ?? 'Ошибка при сохранении');
      }
    } catch {
      setSaveError('Не удалось сохранить профиль. Проверьте соединение.');
    } finally {
      setSaving(false);
    }
  };

  const statusLabel: Record<string, string> = {
    draft:    'Черновик',
    pending:  'На проверке',
    active:   'Активен',
    rejected: 'Отклонён',
    inactive: 'Неактивен',
  };

  const statusColor: Record<string, string> = {
    draft:    'text-[var(--text-muted)]',
    pending:  'text-[var(--warning)]',
    active:   'text-[var(--success)]',
    rejected: 'text-[var(--danger)]',
    inactive: 'text-[var(--text-secondary)]',
  };

  return (
    <Protected roles={['operator', 'admin']}>
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Профиль компании
          </h1>
          {!loading && !fetchError && (
            <div className="flex items-center gap-3 shrink-0">
              {isVerified && (
                <span className="flex items-center gap-1 text-xs text-[var(--success)]">
                  <BadgeCheck className="w-4 h-4" /> Верифицирован
                </span>
              )}
              {profileStatus && (
                <span className={`flex items-center gap-1 text-xs ${statusColor[profileStatus] ?? 'text-[var(--text-secondary)]'}`}>
                  <Clock className="w-4 h-4" />
                  {statusLabel[profileStatus] ?? profileStatus}
                </span>
              )}
            </div>
          )}
        </div>

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
          <form onSubmit={(e) => { void handleSave(e); }} className="space-y-6">
            {/* Компания */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-base font-semibold text-[var(--text-primary)]">О компании</h2>
              </div>

              <div>
                <label className="block text-sm mb-1 text-[var(--text-secondary)]">
                  Название компании
                  <span className="ml-2 text-xs text-[var(--text-muted)]">(только для чтения)</span>
                </label>
                <input value={companyName} readOnly tabIndex={-1} className={INPUT_RO} />
              </div>

              <div>
                <label className="block text-sm mb-1 text-[var(--text-secondary)]">
                  Email
                  <span className="ml-2 text-xs text-[var(--text-muted)]">(только для чтения)</span>
                </label>
                <input value={email} readOnly tabIndex={-1} className={INPUT_RO} />
              </div>

              {category && (
                <div>
                  <label className="block text-sm mb-1 text-[var(--text-secondary)]">Категория</label>
                  <input value={category} readOnly tabIndex={-1} className={INPUT_RO} />
                </div>
              )}

              <div>
                <label className="block text-sm mb-1 text-[var(--text-secondary)]">
                  Краткое описание
                  <span className="ml-2 text-xs text-[var(--text-muted)]">до 300 символов</span>
                </label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={e => setShortDescription(e.target.value)}
                  maxLength={300}
                  placeholder="Одно предложение о компании для каталога"
                  className={INPUT}
                />
              </div>

              <div>
                <label className="block text-sm mb-1 text-[var(--text-secondary)]">
                  Полное описание
                  <span className="ml-2 text-xs text-[var(--text-muted)]">до 2000 символов</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={2000}
                  rows={5}
                  placeholder="Расскажите о компании, опыте, специализации..."
                  className={`${INPUT} resize-y py-3`}
                />
              </div>
            </div>

            {/* Контакты */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="w-5 h-5 text-[var(--ocean)]" />
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Контакты</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-[var(--text-secondary)]">Телефон</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+7 900 000-00-00"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> Telegram
                    </span>
                  </label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={e => setTelegram(e.target.value)}
                    placeholder="@username или +7..."
                    className={INPUT}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1 text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> Сайт
                  </span>
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://example.ru"
                  className={INPUT}
                />
              </div>
            </div>

            {/* Локация */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Местоположение</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-[var(--text-secondary)]">Город</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Петропавловск-Камчатский"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-[var(--text-secondary)]">Адрес</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="ул. Ленинская, 12"
                    className={INPUT}
                  />
                </div>
              </div>
            </div>

            {saveSuccess && (
              <div className="flex items-center gap-2 text-sm rounded-lg px-4 py-3 bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Профиль сохранён
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
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </form>
        )}
      </div>
    </Protected>
  );
}
