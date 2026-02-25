'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, Send } from 'lucide-react';

type RegistrationStatus = 'submitted' | 'registered' | 'rejected' | 'failed';

interface RegistrationItem {
  id: string;
  groupName: string;
  routeDescription: string;
  routeRegion: string | null;
  startDate: string;
  endDate: string;
  participantCount: number;
  status: RegistrationStatus;
  mchsRequestId: string | null;
  lastError: string | null;
  submittedAt: string | null;
  createdAt: string;
}

interface RegistrationSummary {
  total: number;
  submitted: number;
  registered: number;
  rejected: number;
  failed: number;
}

interface RegistrationsApiResponse {
  success: boolean;
  data?: {
    registrations: RegistrationItem[];
    summary: RegistrationSummary;
  };
  error?: string;
}

interface FormState {
  groupName: string;
  routeDescription: string;
  routeRegion: string;
  startDate: string;
  endDate: string;
  participantCount: string;
  groupMembersRaw: string;
  guideFullName: string;
  guidePhone: string;
  guideEmail: string;
  emergencyContactsRaw: string;
}

const initialFormState: FormState = {
  groupName: '',
  routeDescription: '',
  routeRegion: 'Камчатский край',
  startDate: '',
  endDate: '',
  participantCount: '',
  groupMembersRaw: '',
  guideFullName: '',
  guidePhone: '',
  guideEmail: '',
  emergencyContactsRaw: '',
};

function parseGroupMembers(raw: string): Array<{ fullName: string; phone?: string }> {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [fullNamePart, phonePart] = line.split(',').map(part => part?.trim() || '');
      return {
        fullName: fullNamePart,
        phone: phonePart || undefined,
      };
    })
    .filter(item => item.fullName.length > 0);
}

function parseEmergencyContacts(raw: string): Array<{ name: string; phone: string; relation?: string }> {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [namePart, phonePart, relationPart] = line.split(',').map(part => part?.trim() || '');
      return {
        name: namePart,
        phone: phonePart,
        relation: relationPart || undefined,
      };
    })
    .filter(item => item.name.length > 0 && item.phone.length > 0);
}

function getStatusLabel(status: RegistrationStatus): string {
  if (status === 'submitted') return 'Отправлено';
  if (status === 'registered') return 'Зарегистрировано';
  if (status === 'rejected') return 'Отклонено';
  return 'Ошибка отправки';
}

function getStatusClasses(status: RegistrationStatus): string {
  if (status === 'registered') return 'bg-green-500/20 text-green-300 border border-green-400/30';
  if (status === 'submitted') return 'bg-sky-500/20 text-sky-300 border border-sky-400/30';
  if (status === 'rejected') return 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30';
  return 'bg-red-500/20 text-red-300 border border-red-400/30';
}

export function MchsRegistrationPanel() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [summary, setSummary] = useState<RegistrationSummary>({
    total: 0,
    submitted: 0,
    registered: 0,
    rejected: 0,
    failed: 0,
  });

  const parsedMembers = useMemo(
    () => parseGroupMembers(formState.groupMembersRaw),
    [formState.groupMembersRaw]
  );

  useEffect(() => {
    void loadRegistrations();
  }, []);

  async function loadRegistrations() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/operator/mchs-registrations?limit=5');
      const payload = (await response.json()) as RegistrationsApiResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Не удалось загрузить МЧС регистрации');
      }

      setRegistrations(payload.data.registrations);
      setSummary(payload.data.summary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }

  function onFormChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setFormState(prev => ({ ...prev, [field]: value }));
  }

  async function submitRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    const participantCount = parseInt(formState.participantCount, 10);
    const emergencyContacts = parseEmergencyContacts(formState.emergencyContactsRaw);

    if (parsedMembers.length === 0) {
      setSubmitError('Добавьте состав группы (минимум один участник).');
      return;
    }
    if (emergencyContacts.length === 0) {
      setSubmitError('Добавьте хотя бы один экстренный контакт.');
      return;
    }
    if (!Number.isFinite(participantCount) || participantCount <= 0) {
      setSubmitError('Количество участников должно быть положительным числом.');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/operator/mchs-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName: formState.groupName,
          groupMembers: parsedMembers,
          routeDescription: formState.routeDescription,
          routeRegion: formState.routeRegion || undefined,
          startDate: formState.startDate,
          endDate: formState.endDate,
          participantCount,
          guideContact: {
            fullName: formState.guideFullName,
            phone: formState.guidePhone,
            email: formState.guideEmail || undefined,
          },
          emergencyContacts,
        }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Не удалось отправить регистрацию в МЧС');
      }

      setSuccessMessage(payload.message || 'Регистрация отправлена в МЧС');
      setFormState(initialFormState);
      await loadRegistrations();
    } catch (submitErrorValue) {
      setSubmitError(
        submitErrorValue instanceof Error ? submitErrorValue.message : 'Не удалось отправить форму'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-white/15 border border-white/15 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Регистрация групп в МЧС</h2>
          <p className="text-white/70 mt-1">
            Автоматическая отправка данных группы и маршрута в МЧС перед стартом тура.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-200 text-sm">
          <AlertTriangle className="w-4 h-4" />
          Safety First
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-white/70" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-white/60">Всего</p>
              <p className="text-xl font-semibold text-white">{summary.total}</p>
            </div>
            <div className="bg-sky-500/15 rounded-xl p-3">
              <p className="text-xs text-white/60">Отправлено</p>
              <p className="text-xl font-semibold text-sky-200">{summary.submitted}</p>
            </div>
            <div className="bg-green-500/15 rounded-xl p-3">
              <p className="text-xs text-white/60">Зарегистрировано</p>
              <p className="text-xl font-semibold text-green-200">{summary.registered}</p>
            </div>
            <div className="bg-yellow-500/15 rounded-xl p-3">
              <p className="text-xs text-white/60">Отклонено</p>
              <p className="text-xl font-semibold text-yellow-200">{summary.rejected}</p>
            </div>
            <div className="bg-red-500/15 rounded-xl p-3">
              <p className="text-xs text-white/60">Ошибки</p>
              <p className="text-xl font-semibold text-red-200">{summary.failed}</p>
            </div>
          </div>

          <form onSubmit={submitRegistration} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-white/80">Название группы</span>
              <input
                value={formState.groupName}
                onChange={e => onFormChange('groupName', e.target.value)}
                className="mt-1 w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-white/80">Регион маршрута</span>
              <input
                value={formState.routeRegion}
                onChange={e => onFormChange('routeRegion', e.target.value)}
                className="mt-1 w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm text-white/80">Описание маршрута</span>
              <textarea
                value={formState.routeDescription}
                onChange={e => onFormChange('routeDescription', e.target.value)}
                className="mt-1 w-full min-h-[90px] bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-white/80">Дата начала</span>
              <input
                type="date"
                value={formState.startDate}
                onChange={e => onFormChange('startDate', e.target.value)}
                className="mt-1 w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-white/80">Дата окончания</span>
              <input
                type="date"
                value={formState.endDate}
                onChange={e => onFormChange('endDate', e.target.value)}
                className="mt-1 w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-white/80">Количество участников</span>
              <input
                type="number"
                min={1}
                max={100}
                value={formState.participantCount}
                onChange={e => onFormChange('participantCount', e.target.value)}
                className="mt-1 w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-white/80">Контакт гида (ФИО)</span>
              <input
                value={formState.guideFullName}
                onChange={e => onFormChange('guideFullName', e.target.value)}
                className="mt-1 w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-white/80">Телефон гида</span>
              <input
                value={formState.guidePhone}
                onChange={e => onFormChange('guidePhone', e.target.value)}
                className="mt-1 w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-white/80">Email гида</span>
              <input
                type="email"
                value={formState.guideEmail}
                onChange={e => onFormChange('guideEmail', e.target.value)}
                className="mt-1 w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm text-white/80">
                Состав группы (каждая строка: ФИО, телефон)
              </span>
              <textarea
                value={formState.groupMembersRaw}
                onChange={e => onFormChange('groupMembersRaw', e.target.value)}
                className="mt-1 w-full min-h-[90px] bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
              <p className="text-xs text-white/50 mt-1">Распознано участников: {parsedMembers.length}</p>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm text-white/80">
                Экстренные контакты (каждая строка: Имя, телефон, связь)
              </span>
              <textarea
                value={formState.emergencyContactsRaw}
                onChange={e => onFormChange('emergencyContactsRaw', e.target.value)}
                className="mt-1 w-full min-h-[90px] bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
            </label>

            {submitError && (
              <div className="md:col-span-2 px-3 py-2 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm">
                {submitError}
              </div>
            )}

            {successMessage && (
              <div className="md:col-span-2 px-3 py-2 rounded-xl bg-green-500/20 border border-green-400/30 text-green-200 text-sm inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {successMessage}
              </div>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl bg-ocean text-white font-medium inline-flex items-center gap-2 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Отправить в МЧС
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white inline-flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Последние регистрации
            </h3>

            {error && (
              <div className="px-3 py-2 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm">
                {error}
              </div>
            )}

            {registrations.length === 0 ? (
              <p className="text-white/60 text-sm">Пока нет отправленных регистраций.</p>
            ) : (
              <div className="space-y-2">
                {registrations.map(item => (
                  <div
                    key={item.id}
                    className="bg-white/10 border border-white/15 rounded-xl p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-white font-medium">{item.groupName}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusClasses(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </div>
                    <p className="text-white/70 text-sm line-clamp-2">{item.routeDescription}</p>
                    <p className="text-xs text-white/50">
                      {item.startDate} — {item.endDate} · участников: {item.participantCount}
                    </p>
                    {item.lastError && (
                      <p className="text-xs text-red-200 bg-red-500/15 rounded-lg px-2 py-1">{item.lastError}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
