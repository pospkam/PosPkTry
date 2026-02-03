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

export default function PartnerRegisterPage() {
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
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setError('');
    setStep(step - 1);
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
      <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Заявка отправлена</h1>
          <p className="text-white/70 mb-2">
            Ваша заявка на регистрацию партнера принята.
          </p>
          <p className="text-sm text-white/50">
            Мы проверим данные и свяжемся с вами в течение 1-2 рабочих дней.
          </p>
          <p className="text-xs text-white/40 mt-4">
            Перенаправление в личный кабинет...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-transparent text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4 text-premium-gold hover:text-premium-gold/80 transition-colors">
            <ChevronLeft className="w-5 h-5 inline mr-1" />
            На главную
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">
            Регистрация партнера
          </h1>
          <p className="text-white/60">
            Станьте частью экосистемы KamHub
          </p>
        </div>

        {/* Progress */}
        <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} stepNames={STEP_NAMES} />

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Шаг 1: Тип бизнеса */}
          {step === 1 && (
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Building2 className="w-6 h-6" />
                Выберите тип бизнеса
              </h2>
              
              <div className="space-y-3">
                {BUSINESS_TYPES.map((type) => (
                  <label
                    key={type.id}
                    className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.businessType === type.id
                        ? 'border-premium-gold bg-premium-gold/10'
                        : 'border-white/20 hover:border-white/40 bg-white/5'
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
                        <div className="font-medium text-white">{type.name}</div>
                        <div className="text-sm text-white/60">{type.description}</div>
                      </div>
                      {formData.businessType === type.id && (
                        <Check className="w-5 h-5 text-premium-gold" />
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Шаг 2: Юридические данные */}
          {step === 2 && (
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 md:p-8 space-y-5">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <FileText className="w-6 h-6" />
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
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 md:p-8 space-y-5">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <User className="w-6 h-6" />
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
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 md:p-8 space-y-5">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <CreditCard className="w-6 h-6" />
                Банковские реквизиты
              </h2>

              <p className="text-sm text-white/60 mb-4">
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
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <MapPin className="w-6 h-6" />
                Направления деятельности
              </h2>

              <p className="text-sm text-white/60 mb-4">
                Выберите все направления, по которым вы оказываете услуги
              </p>

              <div className="space-y-3">
                {PARTNER_ROLES.map((role) => {
                  const icons: Record<PartnerRole, React.ReactNode> = {
                    operator: <MapPin className="w-6 h-6" />,
                    transfer: <Car className="w-6 h-6" />,
                    stay: <Home className="w-6 h-6" />,
                    gear: <Backpack className="w-6 h-6" />,
                    guide: <Users className="w-6 h-6" />,
                  };

                  return (
                    <label
                      key={role.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.roles.includes(role.id)
                          ? 'border-premium-gold bg-premium-gold/10'
                          : 'border-white/20 hover:border-white/40 bg-white/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.roles.includes(role.id)}
                        onChange={() => handleRoleToggle(role.id)}
                        className="sr-only"
                      />
                      <div className={`p-2 rounded-lg ${formData.roles.includes(role.id) ? 'bg-premium-gold text-premium-black' : 'bg-white/10 text-white/70'}`}>
                        {icons[role.id]}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white">{role.name}</div>
                        <div className="text-sm text-white/60">{role.description}</div>
                      </div>
                      {formData.roles.includes(role.id) && (
                        <Check className="w-5 h-5 text-premium-gold" />
                      )}
                    </label>
                  );
                })}
              </div>

              {formData.roles.includes('operator') && (
                <div className="mt-6 p-4 bg-white/5 rounded-xl space-y-4">
                  <h3 className="font-medium text-white">Дополнительно для туроператоров</h3>
                  
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
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 md:p-8 space-y-5">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <FileText className="w-6 h-6" />
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
                <label className="block text-sm font-medium mb-2 text-white/90 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Логотип компании
                </label>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-white/40 transition-colors">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-white/40" />
                  <p className="text-sm text-white/60">
                    Перетащите файл или нажмите для выбора
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    PNG, JPG до 5 МБ
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Шаг 7: Согласия и пароль */}
          {step === 7 && (
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 md:p-8 space-y-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Check className="w-6 h-6" />
                Завершение регистрации
              </h2>

              {/* Пароль */}
              <div className="space-y-4">
                <h3 className="font-medium text-white">Создайте пароль для входа</h3>
                
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
                    className="absolute right-3 top-9 text-white/50 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                    className="absolute right-3 top-9 text-white/50 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Комиссия платформы */}
              <div className="p-4 bg-premium-gold/10 border border-premium-gold/30 rounded-xl">
                <h3 className="font-medium text-white mb-2">Комиссия платформы</h3>
                <p className="text-sm text-white/70 mb-3">
                  KamHub взимает комиссию <span className="text-premium-gold font-bold">10%</span> от стоимости каждого бронирования, 
                  совершенного через платформу. Комиссия автоматически удерживается при выплате.
                </p>
                <ul className="text-xs text-white/60 space-y-1">
                  <li>- Комиссия включает: размещение на платформе, обработку платежей, поддержку клиентов</li>
                  <li>- Выплаты производятся в течение 3 рабочих дней после оказания услуги</li>
                  <li>- Минимальная сумма выплаты: 1000 руб.</li>
                </ul>
              </div>

              {/* Согласия */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="font-medium text-white">Согласия</h3>

                <FormCheckbox
                  label={
                    <span>
                      Даю согласие на обработку{' '}
                      <Link href="/legal/privacy" className="text-premium-gold hover:underline">
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
                    <span>
                      Принимаю условия{' '}
                      <Link href="/legal/terms" className="text-premium-gold hover:underline">
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
                    <span>
                      Принимаю условия{' '}
                      <Link href="/legal/offer" className="text-premium-gold hover:underline">
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
                    <span>
                      Согласен с{' '}
                      <Link href="/legal/commission" className="text-premium-gold hover:underline">
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
          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Назад
              </button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                Далее
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Отправить заявку
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-white/40 mt-8">
          Уже есть аккаунт?{' '}
          <Link href="/auth/login" className="text-premium-gold hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </main>
  );
}
