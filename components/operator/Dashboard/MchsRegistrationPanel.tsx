'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, Search, Send } from 'lucide-react';

type RegistrationStatus = 'submitted' | 'registered' | 'rejected' | 'failed';

interface RegistrationDates {
  startDate: string;
  endDate: string;
}

interface GroupCompositionItem {
  fullName: string;
  phone?: string;
  role?: string;
}

interface EmergencyContactItem {
  name: string;
  phone: string;
  relation?: string;
}

interface GuideContacts {
  fullName: string;
  phone: string;
  email?: string;
}

interface RegistrationItem {
  id: string;
  bookingId: string;
  route: string;
  dates: RegistrationDates | null;
  status: RegistrationStatus;
  createdAt: string;
  updatedAt: string;
}

interface RegistrationDetails {
  id: string;
  bookingId: string;
  bookingStatus: string;
  bookingDates: RegistrationDates | null;
  tourName: string | null;
  groupComposition: GroupCompositionItem[];
  route: string;
  dates: RegistrationDates | null;
  guideContacts: GuideContacts | null;
  emergencyContacts: EmergencyContactItem[];
  status: RegistrationStatus;
  createdAt: string;
  updatedAt: string;
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
    registrations: Array<{
      id: string;
      bookingId: string;
      route: string;
      dates: unknown;
      status: RegistrationStatus;
      createdAt: string;
      updatedAt: string;
    }>;
    summary: RegistrationSummary;
  };
  error?: string | unknown;
}

interface RegistrationDetailsApiResponse {
  success: boolean;
  data?: {
    id: string;
    bookingId: string;
    bookingStatus: string;
    bookingDates: unknown;
    tour: { id: string; name: string | null };
    groupComposition: unknown;
    route: string;
    dates: unknown;
    guideContacts: unknown;
    emergencyContacts: unknown;
    status: RegistrationStatus;
    createdAt: string;
    updatedAt: string;
  };
  error?: string | unknown;
}

interface FormState {
  bookingId: string;
  route: string;
  startDate: string;
  endDate: string;
  groupCompositionRaw: string;
  guideFullName: string;
  guidePhone: string;
  guideEmail: string;
  emergencyContactsRaw: string;
}

const initialFormState: FormState = {
  bookingId: '',
  route: '',
  startDate: '',
  endDate: '',
  groupCompositionRaw: '',
  guideFullName: '',
  guidePhone: '',
  guideEmail: '',
  emergencyContactsRaw: '',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseDates(value: unknown): RegistrationDates | null {
  if (!isRecord(value)) {
    return null;
  }

  const startDate = typeof value.startDate === 'string' ? value.startDate : null;
  const endDate = typeof value.endDate === 'string' ? value.endDate : null;

  if (!startDate || !endDate) {
    return null;
  }

  return { startDate, endDate };
}

function parseGroupComposition(raw: string): GroupCompositionItem[] {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [fullNamePart, phonePart, rolePart] = line.split(',').map(part => part?.trim() || '');
      return {
        fullName: fullNamePart,
        phone: phonePart || undefined,
        role: rolePart || undefined,
      };
    })
    .filter(item => item.fullName.length > 0);
}

function parseEmergencyContacts(raw: string): EmergencyContactItem[] {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [namePart, phonePart, relationPart] = line.split(',').map(part => part?.trim() || '');
      const parsed: EmergencyContactItem = {
        name: namePart,
        phone: phonePart,
      };
      if (relationPart) {
        parsed.relation = relationPart;
      }
      return parsed;
    })
    .filter(item => item.name.length > 0 && item.phone.length > 0);
}

function parseGuideContacts(value: unknown): GuideContacts | null {
  if (!isRecord(value)) {
    return null;
  }

  const fullName = typeof value.fullName === 'string' ? value.fullName : null;
  const phone = typeof value.phone === 'string' ? value.phone : null;
  const email = typeof value.email === 'string' ? value.email : undefined;

  if (!fullName || !phone) {
    return null;
  }

  return { fullName, phone, email };
}

function parseGroupCompositionPayload(value: unknown): GroupCompositionItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map(item => {
      const fullName = typeof item.fullName === 'string' ? item.fullName : '';
      const phone = typeof item.phone === 'string' ? item.phone : undefined;
      const role = typeof item.role === 'string' ? item.role : undefined;
      return { fullName, phone, role };
    })
    .filter(item => item.fullName.length > 0);
}

function parseEmergencyContactsPayload(value: unknown): EmergencyContactItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map(item => {
      const name = typeof item.name === 'string' ? item.name : '';
      const phone = typeof item.phone === 'string' ? item.phone : '';
      const relation = typeof item.relation === 'string' ? item.relation : undefined;
      return { name, phone, relation };
    })
    .filter(item => item.name.length > 0 && item.phone.length > 0);
}

function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('ru-RU');
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
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const [registrationDetails, setRegistrationDetails] = useState<RegistrationDetails | null>(null);
  const [summary, setSummary] = useState<RegistrationSummary>({
    total: 0,
    submitted: 0,
    registered: 0,
    rejected: 0,
    failed: 0,
  });

  const parsedGroupComposition = useMemo(
    () => parseGroupComposition(formState.groupCompositionRaw),
    [formState.groupCompositionRaw]
  );
  const parsedEmergencyContacts = useMemo(
    () => parseEmergencyContacts(formState.emergencyContactsRaw),
    [formState.emergencyContactsRaw]
  );

  useEffect(() => {
    void loadRegistrations();
  }, []);

  async function loadRegistrations() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/operator/mchs/register?limit=5');
      const payload = (await response.json()) as RegistrationsApiResponse;

      if (!response.ok || !payload.success || !payload.data) {
        const errorMessage =
          typeof payload.error === 'string' ? payload.error : 'Не удалось загрузить МЧС регистрации';
        throw new Error(errorMessage);
      }

      setRegistrations(
        payload.data.registrations.map(item => ({
          id: item.id,
          bookingId: item.bookingId,
          route: item.route,
          dates: parseDates(item.dates),
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }))
      );
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

  async function loadRegistrationDetails(id: string) {
    try {
      setDetailsLoading(true);
      setDetailsError(null);
      setSelectedRegistrationId(id);

      const response = await fetch(`/api/operator/mchs/${id}`);
      const payload = (await response.json()) as RegistrationDetailsApiResponse;

      if (!response.ok || !payload.success || !payload.data) {
        const errorMessage =
          typeof payload.error === 'string' ? payload.error : 'Не удалось загрузить детали регистрации';
        throw new Error(errorMessage);
      }

      const details = payload.data;
      const parsedGuideContacts = parseGuideContacts(details.guideContacts);

      setRegistrationDetails({
        id: details.id,
        bookingId: details.bookingId,
        bookingStatus: details.bookingStatus,
        bookingDates: parseDates(details.bookingDates),
        tourName: details.tour.name,
        groupComposition: parseGroupCompositionPayload(details.groupComposition),
        route: details.route,
        dates: parseDates(details.dates),
        guideContacts: parsedGuideContacts,
        emergencyContacts: parseEmergencyContactsPayload(details.emergencyContacts),
        status: details.status,
        createdAt: details.createdAt,
        updatedAt: details.updatedAt,
      });
    } catch (loadDetailsError) {
      setDetailsError(loadDetailsError instanceof Error ? loadDetailsError.message : 'Не удалось загрузить детали');
    } finally {
      setDetailsLoading(false);
    }
  }

  async function submitRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    if (parsedGroupComposition.length === 0) {
      setSubmitError('Добавьте состав группы (минимум один участник).');
      return;
    }
    if (parsedEmergencyContacts.length === 0) {
      setSubmitError('Добавьте хотя бы один экстренный контакт.');
      return;
    }

    if (!formState.bookingId.trim()) {
      setSubmitError('Укажите ID бронирования.');
      return;
    }

    const startDate = new Date(formState.startDate);
    const endDate = new Date(formState.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setSubmitError('Укажите корректные даты маршрута.');
      return;
    }
    if (startDate > endDate) {
      setSubmitError('Дата окончания не может быть раньше даты начала.');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/operator/mchs/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: formState.bookingId.trim(),
          groupComposition: parsedGroupComposition,
          route: formState.route,
          dates: {
            startDate: formState.startDate,
            endDate: formState.endDate,
          },
          guideContacts: {
            fullName: formState.guideFullName,
            phone: formState.guidePhone,
            email: formState.guideEmail || undefined,
          },
          emergencyContacts: parsedEmergencyContacts,
        }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        data?: { id: string };
        message?: string;
        error?: string | unknown;
      };

      if (!response.ok || !payload.success) {
        const errorMessage =
          typeof payload.error === 'string' ? payload.error : 'Не удалось отправить регистрацию в МЧС';
        throw new Error(errorMessage);
      }

      setSuccessMessage(payload.message || 'Регистрация отправлена в МЧС');
      setFormState(initialFormState);
      await loadRegistrations();

      if (payload.data?.id) {
        await loadRegistrationDetails(payload.data.id);
      }
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
            <label htmlFor="mchs-booking-id" className="block">
              <span className="text-sm text-white/80">ID бронирования</span>
              <input
                id="mchs-booking-id"
                value={formState.bookingId}
                onChange={e => onFormChange('bookingId', e.target.value)}
                className="mt-1 w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
            </label>

            <label htmlFor="mchs-route" className="block md:col-span-2">
              <span className="text-sm text-white/80">Маршрут</span>
              <textarea
                id="mchs-route"
                value={formState.route}
                onChange={e => onFormChange('route', e.target.value)}
                className="mt-1 w-full min-h-[90px] bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
            </label>

            <label htmlFor="mchs-start-date" className="block">
              <span className="text-sm text-white/80">Дата начала</span>
              <input
                id="mchs-start-date"
                type="date"
                value={formState.startDate}
                onChange={e => onFormChange('startDate', e.target.value)}
                className="mt-1 w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
            </label>

            <label htmlFor="mchs-end-date" className="block">
              <span className="text-sm text-white/80">Дата окончания</span>
              <input
                id="mchs-end-date"
                type="date"
                value={formState.endDate}
                onChange={e => onFormChange('endDate', e.target.value)}
                className="mt-1 w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
            </label>

            <label htmlFor="mchs-guide-name" className="block">
              <span className="text-sm text-white/80">Контакт гида (ФИО)</span>
              <input
                id="mchs-guide-name"
                value={formState.guideFullName}
                onChange={e => onFormChange('guideFullName', e.target.value)}
                className="mt-1 w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
            </label>

            <label htmlFor="mchs-guide-phone" className="block">
              <span className="text-sm text-white/80">Телефон гида</span>
              <input
                id="mchs-guide-phone"
                value={formState.guidePhone}
                onChange={e => onFormChange('guidePhone', e.target.value)}
                className="mt-1 w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
            </label>

            <label htmlFor="mchs-guide-email" className="block">
              <span className="text-sm text-white/80">Email гида</span>
              <input
                id="mchs-guide-email"
                type="email"
                value={formState.guideEmail}
                onChange={e => onFormChange('guideEmail', e.target.value)}
                className="mt-1 w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
              />
            </label>

            <label htmlFor="mchs-group-composition" className="block md:col-span-2">
              <span className="text-sm text-white/80">
                Состав группы (каждая строка: ФИО, телефон, роль)
              </span>
              <textarea
                id="mchs-group-composition"
                value={formState.groupCompositionRaw}
                onChange={e => onFormChange('groupCompositionRaw', e.target.value)}
                className="mt-1 w-full min-h-[90px] bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                required
              />
              <p className="text-xs text-white/50 mt-1">
                Регистрируем участников: {parsedGroupComposition.length}
              </p>
            </label>

            <label htmlFor="mchs-emergency-contacts" className="block md:col-span-2">
              <span className="text-sm text-white/80">
                Экстренные контакты (каждая строка: Имя, телефон, связь)
              </span>
              <textarea
                id="mchs-emergency-contacts"
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
                      <p className="text-white font-medium">Бронирование: {item.bookingId}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusClasses(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </div>
                    <p className="text-white/70 text-sm line-clamp-2">{item.route}</p>
                    <p className="text-xs text-white/50">
                      {item.dates ? `${item.dates.startDate} — ${item.dates.endDate}` : 'Даты не указаны'} ·
                      создано: {formatDateLabel(item.createdAt)}
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={() => loadRegistrationDetails(item.id)}
                        className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm inline-flex items-center gap-2"
                      >
                        {detailsLoading && selectedRegistrationId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        Проверить статус
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detailsError && (
              <div className="px-3 py-2 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm">
                {detailsError}
              </div>
            )}

            {registrationDetails && (
              <div className="bg-white/10 border border-white/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-base font-semibold text-white">Статус регистрации {registrationDetails.id}</h4>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getStatusClasses(registrationDetails.status)}`}
                  >
                    {getStatusLabel(registrationDetails.status)}
                  </span>
                </div>
                <p className="text-sm text-white/80">
                  Бронирование: {registrationDetails.bookingId}
                  {registrationDetails.tourName ? ` · Тур: ${registrationDetails.tourName}` : ''}
                </p>
                <p className="text-xs text-white/60">
                  Статус бронирования: {registrationDetails.bookingStatus}
                  {registrationDetails.bookingDates
                    ? ` · ${registrationDetails.bookingDates.startDate} — ${registrationDetails.bookingDates.endDate}`
                    : ''}
                </p>
                <p className="text-sm text-white/70">{registrationDetails.route}</p>
                <p className="text-xs text-white/60">
                  Даты маршрута:{' '}
                  {registrationDetails.dates
                    ? `${registrationDetails.dates.startDate} — ${registrationDetails.dates.endDate}`
                    : 'не указаны'}
                </p>
                <p className="text-xs text-white/60">
                  Участников: {registrationDetails.groupComposition.length} · Экстренных контактов:{' '}
                  {registrationDetails.emergencyContacts.length}
                </p>
                {registrationDetails.guideContacts && (
                  <p className="text-xs text-white/60">
                    Гид: {registrationDetails.guideContacts.fullName}, {registrationDetails.guideContacts.phone}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
