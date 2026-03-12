'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, Mail, Phone, Globe, User, CreditCard, FileText,
  Check, ChevronLeft, ChevronRight, AlertCircle, MapPin,
  Car, Home, Backpack, Users, Eye, EyeOff, Upload
} from 'lucide-react';

import { StepIndicator } from '@/components/partner/registration/StepIndicator';
import { FormInput, FormTextarea, FormCheckbox } from '@/components/partner/registration/FormInput';
import { validateStep } from '@/components/partner/registration/validation';
import { maskPhone, maskINN, maskOGRN, maskKPP, maskBIK, maskAccount } from '@/components/partner/registration/masks';
import {
  PartnerFormData,
  BusinessType,
  PartnerRole,
  BUSINESS_TYPES,
  PARTNER_ROLES,
  initialFormData
} from '@/components/partner/registration/types';

const STEP_NAMES = [
  'Тип бизнеса',
  'Юридические данные',
  'Контактные данные',
  'Банковские реквизиты',
  'Направления деятельности',
  'О компании',
  'Согласия и пароль',
];

const TOTAL_STEPS = 7;

export default function PartnerRegisterPageClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<PartnerFormData>(initialFormData);

  const updateField = <K extends keyof PartnerFormData>(field: K, value: PartnerFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRoleToggle = (roleId: PartnerRole) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter(r => r !== roleId)
        : [...prev.roles, roleId]
    }));
  };

  const handleNextStep = () => {
    const validationError = validateStep(step, formData);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStep(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setError('');
    setStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateStep(step, formData);
    if (validationError) {
      setError(validationError);
      return;
    }

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
      setTimeout(() => {
        router.push('/partner/dashboard');
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-5 lg:p-6 flex items-center justify-center min-h-[400px]">
        <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ background: 'var(--success)' }}>
            <Check className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-3">Заявка отправлена</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            Ваша заявка на регистрацию партнера принята.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Мы проверим данные и свяжемся с вами в течение 1-2 рабочих дней.
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-4">
            Перенаправление в личный кабинет...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:opacity-80 transition-opacity mb-4">
          <ChevronLeft className="w-4 h-4" />
          На главную
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
          Регистрация партнера
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Станьте частью экосистемы KamHub
        </p>
      </div>

      {/* Progress */}
      <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} stepNames={STEP_NAMES} />

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg border flex items-center gap-3"
          style={{ borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)', background: 'color-mix(in srgb, var(--danger) 10%, transparent)', color: 'var(--danger)' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Шаг 1: Тип бизнеса */}
        {step === 1 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-5 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Выберите тип бизнеса
            </h2>

            <div className="space-y-3">
              {BUSINESS_TYPES.map((type) => (
                <label
                  key={type.id}
                  className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.businessType === type.id
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                      : 'border-[var(--border)] hover:border-[var(--accent)]/40 bg-[var(--bg-primary)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="businessType"
                    value={type.id}
                    checked={formData.businessType === type.id}
                    onChange={() => updateField('businessType', type.id as BusinessType)}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">{type.name}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">{type.description}</div>
                    </div>
                    {formData.businessType === type.id && (
                      <Check className="w-5 h-5 text-[var(--accent)]" />
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Шаг 2: Юридические данные */}
        {step === 2 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Юридические данные
            </h2>

            <FormInput
              label={formData.businessType === 'individual' ? 'ФИО' : 'Полное наименование организации'}
              name="companyName"
              value={formData.companyName}
              onChange={(v) => updateField('companyName', v)}
              placeholder={formData.businessType === 'individual' ? 'Иванов Иван Иванович' : 'ООО "Камчатская рыбалка"'}
              required
              icon={Building2}
            />

            <FormInput
              label="Торговое название (бренд)"
              name="tradeName"
              value={formData.tradeName}
              onChange={(v) => updateField('tradeName', v)}
              placeholder="Камчатская рыбалка"
              icon={Globe}
              hint="Название, которое увидят клиенты"
            />

            <div className="grid md:grid-cols-2 gap-4">
              <FormInput
                label="ИНН"
                name="inn"
                value={formData.inn}
                onChange={(v) => updateField('inn', v)}
                placeholder={formData.businessType === 'individual' || formData.businessType === 'ip' ? '123456789012' : '1234567890'}
                required
                mask={maskINN}
                maxLength={12}
                hint={formData.businessType === 'individual' || formData.businessType === 'ip' ? '12 цифр' : '10 цифр'}
              />

              {formData.businessType !== 'individual' && (
                <FormInput
                  label={formData.businessType === 'ip' ? 'ОГРНИП' : 'ОГРН'}
                  name="ogrn"
                  value={formData.ogrn}
                  onChange={(v) => updateField('ogrn', v)}
                  placeholder={formData.businessType === 'ip' ? '123456789012345' : '1234567890123'}
                  required
                  mask={maskOGRN}
                  maxLength={15}
                  hint={formData.businessType === 'ip' ? '15 цифр' : '13 цифр'}
                />
              )}
            </div>

            {(formData.businessType === 'ooo' || formData.businessType === 'other') && (
              <FormInput
                label="КПП"
                name="kpp"
                value={formData.kpp}
                onChange={(v) => updateField('kpp', v)}
                placeholder="123456789"
                required
                mask={maskKPP}
                maxLength={9}
                hint="9 цифр"
              />
            )}

            <FormInput
              label="Юридический адрес"
              name="legalAddress"
              value={formData.legalAddress}
              onChange={(v) => updateField('legalAddress', v)}
              placeholder="683000, Камчатский край, г. Петропавловск-Камчатский, ул. Ленинская, д. 1"
              required
              icon={MapPin}
            />

            <FormInput
              label="Фактический адрес"
              name="actualAddress"
              value={formData.actualAddress}
              onChange={(v) => updateField('actualAddress', v)}
              placeholder="Совпадает с юридическим или укажите другой"
              icon={MapPin}
            />
          </div>
        )}

        {/* Шаг 3: Контактные данные */}
        {step === 3 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <User className="w-5 h-5" />
              Контактные данные
            </h2>

            <FormInput
              label="ФИО контактного лица"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={(v) => updateField('contactPerson', v)}
              placeholder="Иванов Иван Иванович"
              required
              icon={User}
            />

            <FormInput
              label="Должность"
              name="contactPosition"
              value={formData.contactPosition}
              onChange={(v) => updateField('contactPosition', v)}
              placeholder="Директор"
              icon={Building2}
            />

            <div className="grid md:grid-cols-2 gap-4">
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(v) => updateField('email', v)}
                placeholder="info@fishingkam.ru"
                required
                icon={Mail}
              />

              <FormInput
                label="Телефон"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={(v) => updateField('phone', v)}
                placeholder="+7 (999) 299-70-07"
                required
                icon={Phone}
                mask={maskPhone}
              />
            </div>

            <FormInput
              label="Сайт"
              name="website"
              type="url"
              value={formData.website}
              onChange={(v) => updateField('website', v)}
              placeholder="https://fishingkam.ru"
              icon={Globe}
            />
          </div>
        )}

        {/* Шаг 4: Банковские реквизиты */}
        {step === 4 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Банковские реквизиты
            </h2>

            <p className="text-sm text-[var(--text-muted)]">
              Реквизиты необходимы для перечисления оплаты за услуги
            </p>

            <FormInput
              label="Наименование банка"
              name="bankName"
              value={formData.bankName}
              onChange={(v) => updateField('bankName', v)}
              placeholder="ПАО Сбербанк"
              required
              icon={Building2}
            />

            <div className="grid md:grid-cols-2 gap-4">
              <FormInput
                label="БИК"
                name="bik"
                value={formData.bik}
                onChange={(v) => updateField('bik', v)}
                placeholder="044525225"
                required
                mask={maskBIK}
                maxLength={9}
                hint="9 цифр"
              />

              <FormInput
                label="Корреспондентский счет"
                name="correspondentAccount"
                value={formData.correspondentAccount}
                onChange={(v) => updateField('correspondentAccount', v)}
                placeholder="30101810400000000225"
                required
                mask={maskAccount}
                maxLength={20}
                hint="20 цифр"
              />
            </div>

            <FormInput
              label="Расчетный счет"
              name="checkingAccount"
              value={formData.checkingAccount}
              onChange={(v) => updateField('checkingAccount', v)}
              placeholder="40702810938000000001"
              required
              mask={maskAccount}
              maxLength={20}
              hint="20 цифр"
            />
          </div>
        )}

        {/* Шаг 5: Направления деятельности */}
        {step === 5 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Направления деятельности
            </h2>

            <p className="text-sm text-[var(--text-muted)] mb-5">
              Выберите все направления, по которым вы оказываете услуги
            </p>

            <div className="space-y-3">
              {PARTNER_ROLES.map((role) => {
                const icons: Record<PartnerRole, React.ReactNode> = {
                  operator: <MapPin className="w-5 h-5" />,
                  transfer: <Car className="w-5 h-5" />,
                  stay: <Home className="w-5 h-5" />,
                  gear: <Backpack className="w-5 h-5" />,
                  guide: <Users className="w-5 h-5" />,
                };

                return (
                  <label
                    key={role.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.roles.includes(role.id)
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/40 bg-[var(--bg-primary)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.roles.includes(role.id)}
                      onChange={() => handleRoleToggle(role.id)}
                      className="sr-only"
                    />
                    <div className={`p-2 rounded-md ${formData.roles.includes(role.id) ? 'bg-[var(--accent)] text-[var(--bg-card)]' : 'bg-[var(--bg-card)] text-[var(--text-muted)]'}`}>
                      {icons[role.id]}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--text-primary)]">{role.name}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">{role.description}</div>
                    </div>
                    {formData.roles.includes(role.id) && (
                      <Check className="w-5 h-5 text-[var(--accent)]" />
                    )}
                  </label>
                );
              })}
            </div>

            {formData.roles.includes('operator') && (
              <div className="mt-5 p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg space-y-4">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">Дополнительно для туроператоров</h3>

                <FormInput
                  label="Номер в реестре туроператоров"
                  name="tourRegistryNumber"
                  value={formData.tourRegistryNumber}
                  onChange={(v) => updateField('tourRegistryNumber', v)}
                  placeholder="РТО 123456"
                  hint="Если есть"
                />

                <FormCheckbox
                  label="Имеется финансовое обеспечение (страховка/банковская гарантия)"
                  checked={formData.hasFinancialGuarantee}
                  onChange={(v) => updateField('hasFinancialGuarantee', v)}
                />
              </div>
            )}
          </div>
        )}

        {/* Шаг 6: О компании */}
        {step === 6 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="w-5 h-5" />
              О компании
            </h2>

            <FormTextarea
              label="Описание компании"
              name="description"
              value={formData.description}
              onChange={(v) => updateField('description', v)}
              placeholder="Расскажите о вашей компании, опыте работы, особенностях услуг..."
              rows={5}
              hint="Это описание увидят клиенты на вашей странице"
            />

            <div>
              <p className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2">
                <Upload className="w-4 h-4" />
                Логотип компании
              </p>
              <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-6 text-center hover:border-[var(--accent)]/40 transition-colors">
                <Upload className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-muted)]">
                  Перетащите файл или нажмите для выбора
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  PNG, JPG до 5 МБ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Шаг 7: Согласия и пароль */}
        {step === 7 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-6">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Check className="w-5 h-5" />
              Завершение регистрации
            </h2>

            {/* Пароль */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Создайте пароль для входа</h3>

              <div className="relative">
                <FormInput
                  label="Пароль"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(v) => updateField('password', v)}
                  placeholder="Минимум 8 символов"
                  required
                  hint="Заглавные и строчные буквы, цифры"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <FormInput
                  label="Подтверждение пароля"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(v) => updateField('confirmPassword', v)}
                  placeholder="Повторите пароль"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-9 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Комиссия платформы */}
            <div className="p-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Комиссия платформы</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                KamHub взимает комиссию <span className="text-[var(--accent)] font-bold">10%</span> от стоимости каждого бронирования,
                совершенного через платформу. Комиссия автоматически удерживается при выплате.
              </p>
              <ul className="text-xs text-[var(--text-muted)] space-y-1">
                <li>— Комиссия включает: размещение на платформе, обработку платежей, поддержку клиентов</li>
                <li>— Выплаты производятся в течение 3 рабочих дней после оказания услуги</li>
                <li>— Минимальная сумма выплаты: 1000 руб.</li>
              </ul>
            </div>

            {/* Согласия */}
            <div className="space-y-4 pt-4 border-t border-[var(--border)]">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Согласия</h3>

              <FormCheckbox
                label={
                  <span className="text-sm text-[var(--text-secondary)]">
                    Даю согласие на обработку{' '}
                    <Link href="/legal/privacy" className="text-[var(--accent)] hover:underline">
                      персональных данных
                    </Link>{' '}
                    в соответствии с Федеральным законом от 27.07.2006 N 152-ФЗ
                  </span>
                }
                checked={formData.agreePersonalData}
                onChange={(v) => updateField('agreePersonalData', v)}
                required
              />

              <FormCheckbox
                label={
                  <span className="text-sm text-[var(--text-secondary)]">
                    Принимаю условия{' '}
                    <Link href="/legal/terms" className="text-[var(--accent)] hover:underline">
                      Пользовательского соглашения
                    </Link>
                  </span>
                }
                checked={formData.agreeUserAgreement}
                onChange={(v) => updateField('agreeUserAgreement', v)}
                required
              />

              <FormCheckbox
                label={
                  <span className="text-sm text-[var(--text-secondary)]">
                    Принимаю условия{' '}
                    <Link href="/legal/offer" className="text-[var(--accent)] hover:underline">
                      Договора-оферты
                    </Link>{' '}
                    на оказание услуг платформы, включая комиссию 10% от бронирований
                  </span>
                }
                checked={formData.agreeOffer}
                onChange={(v) => updateField('agreeOffer', v)}
                required
              />

              <FormCheckbox
                label={
                  <span className="text-sm text-[var(--text-secondary)]">
                    Согласен с{' '}
                    <Link href="/legal/commission" className="text-[var(--accent)] hover:underline">
                      условиями комиссионного вознаграждения
                    </Link>{' '}
                    (10% от стоимости бронирований)
                  </span>
                }
                checked={formData.agreeCommission}
                onChange={(v) => updateField('agreeCommission', v)}
                required
              />

              <FormCheckbox
                label="Согласен получать уведомления о бронированиях и новостях платформы"
                checked={formData.agreeNotifications}
                onChange={(v) => updateField('agreeNotifications', v)}
              />
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-5 py-2.5 text-sm border border-[var(--border)] text-[var(--text-secondary)] rounded-md hover:bg-[var(--bg-card)] transition-colors flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Назад
            </button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2.5 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              Далее
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-medium rounded-md text-white hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
              style={{ background: 'var(--success)' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Отправить заявку
                </>
              )}
            </button>
          )}
        </div>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-[var(--text-muted)]">
        Уже есть аккаунт?{' '}
        <Link href="/auth/login" className="text-[var(--accent)] hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
