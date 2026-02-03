// Типы для регистрации партнера

export type BusinessType = 'individual' | 'ip' | 'ooo' | 'other';

export type PartnerRole = 'operator' | 'transfer' | 'stay' | 'gear' | 'guide';

export interface PartnerFormData {
  // Шаг 1: Тип бизнеса
  businessType: BusinessType;
  
  // Шаг 2: Юридические данные
  companyName: string;
  tradeName: string; // Торговое название
  inn: string;
  ogrn: string; // ОГРН для ООО, ОГРНИП для ИП
  kpp: string; // Только для ООО
  legalAddress: string;
  actualAddress: string;
  
  // Шаг 3: Контактные данные
  contactPerson: string;
  contactPosition: string;
  email: string;
  phone: string;
  website: string;
  
  // Шаг 4: Банковские реквизиты
  bankName: string;
  bik: string;
  correspondentAccount: string;
  checkingAccount: string;
  
  // Шаг 5: Направления деятельности
  roles: PartnerRole[];
  tourRegistryNumber: string; // Номер в реестре туроператоров
  hasFinancialGuarantee: boolean;
  
  // Шаг 6: Дополнительно
  description: string;
  logoUrl: string;
  
  // Шаг 7: Согласия
  agreePersonalData: boolean;
  agreeUserAgreement: boolean;
  agreeOffer: boolean;
  agreeCommission: boolean;
  agreeNotifications: boolean;
  
  // Пароль
  password: string;
  confirmPassword: string;
}

export const BUSINESS_TYPES: { id: BusinessType; name: string; description: string }[] = [
  { id: 'ip', name: 'Индивидуальный предприниматель', description: 'ИП с ОГРНИП' },
  { id: 'ooo', name: 'Общество с ограниченной ответственностью', description: 'ООО с ОГРН и КПП' },
  { id: 'individual', name: 'Самозанятый', description: 'Физическое лицо, плательщик НПД' },
  { id: 'other', name: 'Другая форма', description: 'АО, НКО и другие' },
];

export const PARTNER_ROLES: { id: PartnerRole; name: string; description: string }[] = [
  { id: 'operator', name: 'Туроператор', description: 'Организация и продажа туров' },
  { id: 'transfer', name: 'Трансфер', description: 'Транспортные услуги' },
  { id: 'stay', name: 'Размещение', description: 'Отели, базы, домики' },
  { id: 'gear', name: 'Аренда снаряжения', description: 'Прокат оборудования' },
  { id: 'guide', name: 'Гид', description: 'Экскурсионные услуги' },
];

export const initialFormData: PartnerFormData = {
  businessType: 'ip',
  companyName: '',
  tradeName: '',
  inn: '',
  ogrn: '',
  kpp: '',
  legalAddress: '',
  actualAddress: '',
  contactPerson: '',
  contactPosition: '',
  email: '',
  phone: '',
  website: '',
  bankName: '',
  bik: '',
  correspondentAccount: '',
  checkingAccount: '',
  roles: [],
  tourRegistryNumber: '',
  hasFinancialGuarantee: false,
  description: '',
  logoUrl: '',
  agreePersonalData: false,
  agreeUserAgreement: false,
  agreeOffer: false,
  agreeCommission: false,
  agreeNotifications: false,
  password: '',
  confirmPassword: '',
};
