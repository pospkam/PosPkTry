'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';

// -- Статусы регистрации МЧС --
type MchsStatus = 'pending' | 'submitted' | 'confirmed' | 'rejected';

// -- Участник группы --
interface GroupMember {
  fullName: string;
  phone: string;
  birthDate: string;
}

// -- Экстренный контакт --
interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

// -- Регистрация в списке --
interface RegistrationItem {
  id: string;
  bookingId: string;
  route: string;
  startDate: string;
  endDate: string;
  status: MchsStatus;
  mchsReference: string | null;
  createdAt: string;
}

// -- Сводка по статусам --
interface RegistrationSummary {
  total: number;
  pending: number;
  submitted: number;
  confirmed: number;
  rejected: number;
}

// -- Детали регистрации --
interface RegistrationDetails {
  id: string;
  bookingId: string;
  groupComposition: GroupMember[];
  route: string;
  startDate: string;
  endDate: string;
  guideContacts: { name: string; phone: string } | null;
  emergencyContacts: EmergencyContact[];
  status: MchsStatus;
  mchsReference: string | null;
  createdAt: string;
}

// -- Состояние формы --
interface FormState {
  bookingId: string;
  route: string;
  startDate: string;
  endDate: string;
  members: GroupMember[];
  guideName: string;
  guidePhone: string;
  emergencyContacts: EmergencyContact[];
}

const EMPTY_MEMBER: GroupMember = { fullName: '', phone: '', birthDate: '' };
const EMPTY_CONTACT: EmergencyContact = { name: '', phone: '', relation: '' };

const initialFormState: FormState = {
  bookingId: '',
  route: '',
  startDate: '',
  endDate: '',
  members: [{ ...EMPTY_MEMBER }],
  guideName: '',
  guidePhone: '',
  emergencyContacts: [{ ...EMPTY_CONTACT }],
};

// -- Type guards --

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseGroupMembers(value: unknown): GroupMember[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map(item => ({
    fullName: typeof item.fullName === 'string' ? item.fullName : '',
    phone: typeof item.phone === 'string' ? item.phone : '',
    birthDate: typeof item.birthDate === 'string' ? item.birthDate : '',
  }));
}

function parseEmergencyContacts(value: unknown): EmergencyContact[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map(item => ({
    name: typeof item.name === 'string' ? item.name : '',
    phone: typeof item.phone === 'string' ? item.phone : '',
    relation: typeof item.relation === 'string' ? item.relation : '',
  }));
}

function parseGuideContacts(value: unknown): { name: string; phone: string } | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === 'string' ? value.name : null;
  const phone = typeof value.phone === 'string' ? value.phone : null;
  if (!name || !phone) return null;
  return { name, phone };
}

// -- Цвета статусов по дизайн-системе --
// pending -> volcano, submitted -> ocean, confirmed -> moss, rejected -> red-600

function getStatusLabel(status: MchsStatus): string {
  const labels: Record<MchsStatus, string> = {
    pending: 'Ожидает',
    submitted: 'Отправлено',
    confirmed: 'Подтверждено',
    rejected: 'Отклонено',
  };
  return labels[status] ?? status;
}

function getStatusClasses(status: MchsStatus): string {
  const classes: Record<MchsStatus, string> = {
    pending: 'bg-volcano/20 text-volcano border border-volcano/30',
    submitted: 'bg-ocean/20 text-ocean border border-ocean/30',
    confirmed: 'bg-moss/20 text-moss border border-moss/30',
    rejected: 'bg-red-600/20 text-red-400 border border-red-600/30',
  };
  return classes[status] ?? 'bg-white/10 text-white/70';
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU');
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
    total: 0, pending: 0, submitted: 0, confirmed: 0, rejected: 0,
  });
  const [selectedDetails, setSelectedDetails] = useState<RegistrationDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/operator/mchs/register?limit=20');
      const payload: unknown = await response.json();

      if (!isRecord(payload) || !payload.success || !isRecord(payload.data)) {
        const errorMsg = isRecord(payload) && typeof payload.error === 'string'
          ? payload.error : 'Не удалось загрузить регистрации';
        throw new Error(errorMsg);
      }

      const data = payload.data;

      if (Array.isArray(data.registrations)) {
        setRegistrations(data.registrations.filter(isRecord).map(item => ({
          id: typeof item.id === 'string' ? item.id : '',
          bookingId: typeof item.bookingId === 'string' ? item.bookingId : '',
          route: typeof item.route === 'string' ? item.route : '',
          startDate: typeof item.startDate === 'string' ? item.startDate : '',
          endDate: typeof item.endDate === 'string' ? item.endDate : '',
          status: (typeof item.status === 'string' ? item.status : 'pending') as MchsStatus,
          mchsReference: typeof item.mchsReference === 'string' ? item.mchsReference : null,
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
        })));
      }

      if (isRecord(data.summary)) {
        const s = data.summary;
        setSummary({
          total: typeof s.total === 'number' ? s.total : 0,
          pending: typeof s.pending === 'number' ? s.pending : 0,
          submitted: typeof s.submitted === 'number' ? s.submitted : 0,
          confirmed: typeof s.confirmed === 'number' ? s.confirmed : 0,
          rejected: typeof s.rejected === 'number' ? s.rejected : 0,
        });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

  // -- Загрузка деталей одной регистрации --
  async function loadDetails(id: string) {
    try {
      setDetailsLoading(true);
      const response = await fetch(`/api/operator/mchs/${id}`);
      const payload: unknown = await response.json();

      if (!isRecord(payload) || !payload.success || !isRecord(payload.data)) {
        throw new Error('Не удалось загрузить детали');
      }

      const d = payload.data;
      setSelectedDetails({
        id: typeof d.id === 'string' ? d.id : '',
        bookingId: typeof d.bookingId === 'string' ? d.bookingId : '',
        groupComposition: parseGroupMembers(d.groupComposition),
        route: typeof d.route === 'string' ? d.route : '',
        startDate: typeof d.startDate === 'string' ? d.startDate : '',
        endDate: typeof d.endDate === 'string' ? d.endDate : '',
        guideContacts: parseGuideContacts(d.guideContacts),
        emergencyContacts: parseEmergencyContacts(d.emergencyContacts),
        status: (typeof d.status === 'string' ? d.status : 'pending') as MchsStatus,
        mchsReference: typeof d.mchsReference === 'string' ? d.mchsReference : null,
        createdAt: typeof d.createdAt === 'string' ? d.createdAt : '',
      });
    } catch {
      setSelectedDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  // -- Обработчики формы --

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setFormState(prev => ({ ...prev, [field]: value }));
  }

  function addMember() {
    setFormState(prev => ({
      ...prev,
      members: [...prev.members, { ...EMPTY_MEMBER }],
    }));
  }

  function removeMember(index: number) {
    setFormState(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index),
    }));
  }

  function updateMember(index: number, field: keyof GroupMember, value: string) {
    setFormState(prev => {
      const updated = [...prev.members];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, members: updated };
    });
  }

  function addEmergencyContact() {
    setFormState(prev => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, { ...EMPTY_CONTACT }],
    }));
  }

  function removeEmergencyContact(index: number) {
    setFormState(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index),
    }));
  }

  function updateEmergencyContact(index: number, field: keyof EmergencyContact, value: string) {
    setFormState(prev => {
      const updated = [...prev.emergencyContacts];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, emergencyContacts: updated };
    });
  }

  // Валидные участники для отправки
  const validMembers = useMemo(
    () => formState.members.filter(m => m.fullName.trim().length >= 2),
    [formState.members]
  );

  const validEmergencyContacts = useMemo(
    () => formState.emergencyContacts.filter(c => c.name.trim().length >= 2 && c.phone.trim().length >= 5),
    [formState.emergencyContacts]
  );

  async function submitRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    if (!formState.bookingId.trim()) {
      setSubmitError('Укажите ID бронирования');
      return;
    }
    if (validMembers.length === 0) {
      setSubmitError('Добавьте хотя бы одного участника группы');
      return;
    }
    if (validEmergencyContacts.length === 0) {
      setSubmitError('Добавьте хотя бы один экстренный контакт');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/operator/mchs/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: formState.bookingId.trim(),
          groupComposition: validMembers,
          route: formState.route,
          startDate: formState.startDate,
          endDate: formState.endDate,
          guideContacts: {
            name: formState.guideName,
            phone: formState.guidePhone,
          },
          emergencyContacts: validEmergencyContacts,
        }),
      });

      const payload: unknown = await response.json();

      if (!isRecord(payload) || !payload.success) {
        const errorMsg = isRecord(payload) && typeof payload.error === 'string'
          ? payload.error : 'Не удалось создать регистрацию';
        throw new Error(errorMsg);
      }

      const message = typeof payload.message === 'string'
        ? payload.message : 'Регистрация создана';
      setSuccessMessage(message);
      setFormState(initialFormState);
      setShowForm(false);
      await loadRegistrations();
    } catch (submitErr) {
      setSubmitError(submitErr instanceof Error ? submitErr.message : 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  }

  // -- Стиль input-полей --
  const inputClasses = 'mt-1 w-full min-h-[44px] bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-ocean/50';

  return (
    <section className="bg-white/15 border border-white/15 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Регистрация групп в МЧС</h2>
          <p className="text-white/70 mt-1">
            Подача данных о группе и маршруте в МЧС перед стартом тура.
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
          {/* Сводка по статусам */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-white/60">Всего</p>
              <p className="text-xl font-semibold text-white">{summary.total}</p>
            </div>
            <div className="bg-volcano/15 rounded-xl p-3">
              <p className="text-xs text-white/60">Ожидает</p>
              <p className="text-xl font-semibold text-volcano">{summary.pending}</p>
            </div>
            <div className="bg-ocean/15 rounded-xl p-3">
              <p className="text-xs text-white/60">Отправлено</p>
              <p className="text-xl font-semibold text-ocean">{summary.submitted}</p>
            </div>
            <div className="bg-moss/15 rounded-xl p-3">
              <p className="text-xs text-white/60">Подтверждено</p>
              <p className="text-xl font-semibold text-moss">{summary.confirmed}</p>
            </div>
            <div className="bg-red-600/15 rounded-xl p-3">
              <p className="text-xs text-white/60">Отклонено</p>
              <p className="text-xl font-semibold text-red-400">{summary.rejected}</p>
            </div>
          </div>

          {/* Кнопка создания */}
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl bg-ocean text-white font-medium inline-flex items-center gap-2 hover:bg-ocean/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Новая регистрация
            </button>
          )}

          {/* Форма создания регистрации */}
          {showForm && (
            <form onSubmit={submitRegistration} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Новая регистрация МЧС</h3>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label htmlFor="mchs-booking-id" className="block">
                  <span className="text-sm text-white/80">ID бронирования</span>
                  <input
                    id="mchs-booking-id"
                    value={formState.bookingId}
                    onChange={e => updateField('bookingId', e.target.value)}
                    placeholder="UUID бронирования"
                    className={inputClasses}
                    required
                  />
                </label>

                <label htmlFor="mchs-route" className="block md:col-span-2">
                  <span className="text-sm text-white/80">Маршрут</span>
                  <textarea
                    id="mchs-route"
                    value={formState.route}
                    onChange={e => updateField('route', e.target.value)}
                    placeholder="Описание маршрута группы"
                    className={`${inputClasses} min-h-[80px]`}
                    required
                  />
                </label>

                <label htmlFor="mchs-start-date" className="block">
                  <span className="text-sm text-white/80">Дата начала</span>
                  <input
                    id="mchs-start-date"
                    type="date"
                    value={formState.startDate}
                    onChange={e => updateField('startDate', e.target.value)}
                    className={inputClasses}
                    required
                  />
                </label>

                <label htmlFor="mchs-end-date" className="block">
                  <span className="text-sm text-white/80">Дата окончания</span>
                  <input
                    id="mchs-end-date"
                    type="date"
                    value={formState.endDate}
                    onChange={e => updateField('endDate', e.target.value)}
                    className={inputClasses}
                    required
                  />
                </label>

                <label htmlFor="mchs-guide-name" className="block">
                  <span className="text-sm text-white/80">Контакт гида (ФИО)</span>
                  <input
                    id="mchs-guide-name"
                    value={formState.guideName}
                    onChange={e => updateField('guideName', e.target.value)}
                    className={inputClasses}
                    required
                  />
                </label>

                <label htmlFor="mchs-guide-phone" className="block">
                  <span className="text-sm text-white/80">Телефон гида</span>
                  <input
                    id="mchs-guide-phone"
                    value={formState.guidePhone}
                    onChange={e => updateField('guidePhone', e.target.value)}
                    placeholder="+7 ..."
                    className={inputClasses}
                    required
                  />
                </label>
              </div>

              {/* Динамический список участников группы */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white/80">
                    Состав группы ({validMembers.length} участников)
                  </h4>
                  <button
                    type="button"
                    onClick={addMember}
                    className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm inline-flex items-center gap-1 hover:bg-white/15 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить
                  </button>
                </div>
                {formState.members.map((member, idx) => (
                  <div key={`member-${idx}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                    <input
                      value={member.fullName}
                      onChange={e => updateMember(idx, 'fullName', e.target.value)}
                      placeholder="ФИО"
                      className={inputClasses}
                      required
                    />
                    <input
                      value={member.phone}
                      onChange={e => updateMember(idx, 'phone', e.target.value)}
                      placeholder="Телефон"
                      className={inputClasses}
                    />
                    <input
                      value={member.birthDate}
                      onChange={e => updateMember(idx, 'birthDate', e.target.value)}
                      placeholder="Дата рождения"
                      type="date"
                      className={inputClasses}
                    />
                    {formState.members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMember(idx)}
                        className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-red-400 hover:bg-red-600/20 transition-colors self-end"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Динамический список экстренных контактов */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white/80">
                    Экстренные контакты ({validEmergencyContacts.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addEmergencyContact}
                    className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm inline-flex items-center gap-1 hover:bg-white/15 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить
                  </button>
                </div>
                {formState.emergencyContacts.map((contact, idx) => (
                  <div key={`ec-${idx}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                    <input
                      value={contact.name}
                      onChange={e => updateEmergencyContact(idx, 'name', e.target.value)}
                      placeholder="Имя"
                      className={inputClasses}
                      required
                    />
                    <input
                      value={contact.phone}
                      onChange={e => updateEmergencyContact(idx, 'phone', e.target.value)}
                      placeholder="Телефон"
                      className={inputClasses}
                      required
                    />
                    <input
                      value={contact.relation}
                      onChange={e => updateEmergencyContact(idx, 'relation', e.target.value)}
                      placeholder="Кем приходится"
                      className={inputClasses}
                    />
                    {formState.emergencyContacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEmergencyContact(idx)}
                        className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-red-400 hover:bg-red-600/20 transition-colors self-end"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Ошибки и успех */}
              {submitError && (
                <div className="px-3 py-2 rounded-xl bg-red-600/20 border border-red-600/30 text-red-200 text-sm">
                  {submitError}
                </div>
              )}
              {successMessage && (
                <div className="px-3 py-2 rounded-xl bg-moss/20 border border-moss/30 text-moss text-sm inline-flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl bg-ocean text-white font-medium inline-flex items-center gap-2 disabled:opacity-60 hover:bg-ocean/80 transition-colors"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Отправить в МЧС
              </button>
            </form>
          )}

          {/* Список регистраций */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white inline-flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Регистрации
            </h3>

            {error && (
              <div className="px-3 py-2 rounded-xl bg-red-600/20 border border-red-600/30 text-red-200 text-sm">
                {error}
              </div>
            )}

            {registrations.length === 0 ? (
              <p className="text-white/60 text-sm">Пока нет регистраций.</p>
            ) : (
              <div className="space-y-2">
                {registrations.map(item => (
                  <div
                    key={item.id}
                    className="bg-white/10 border border-white/15 rounded-xl p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-white font-medium truncate">
                        Бронирование: {item.bookingId.slice(0, 8)}...
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getStatusClasses(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </div>
                    <p className="text-white/70 text-sm line-clamp-2">{item.route}</p>
                    <p className="text-xs text-white/50">
                      {formatDate(item.startDate)} -- {formatDate(item.endDate)} | создано: {formatDate(item.createdAt)}
                    </p>
                    {item.mchsReference && (
                      <p className="text-xs text-ocean">Ref: {item.mchsReference}</p>
                    )}
                    <div>
                      <button
                        type="button"
                        onClick={() => loadDetails(item.id)}
                        className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm inline-flex items-center gap-2 hover:bg-white/15 transition-colors"
                      >
                        {detailsLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        Подробнее
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Панель деталей */}
            {selectedDetails && (
              <div className="bg-white/10 border border-white/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-base font-semibold text-white">
                    Детали регистрации
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusClasses(selectedDetails.status)}`}>
                    {getStatusLabel(selectedDetails.status)}
                  </span>
                </div>
                <p className="text-sm text-white/80">
                  Бронирование: {selectedDetails.bookingId}
                </p>
                <p className="text-sm text-white/70">{selectedDetails.route}</p>
                <p className="text-xs text-white/60">
                  {formatDate(selectedDetails.startDate)} -- {formatDate(selectedDetails.endDate)}
                </p>
                <p className="text-xs text-white/60">
                  Участников: {selectedDetails.groupComposition.length} |
                  Экстренных контактов: {selectedDetails.emergencyContacts.length}
                </p>
                {selectedDetails.guideContacts && (
                  <p className="text-xs text-white/60">
                    Гид: {selectedDetails.guideContacts.name}, {selectedDetails.guideContacts.phone}
                  </p>
                )}
                {selectedDetails.mchsReference && (
                  <p className="text-xs text-ocean">
                    МЧС Ref: {selectedDetails.mchsReference}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedDetails(null)}
                  className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm inline-flex items-center gap-2 hover:bg-white/15 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Закрыть
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
