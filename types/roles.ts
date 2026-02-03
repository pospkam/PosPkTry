/**
 * Единый источник правды для ролей пользователей
 * Используется во всем приложении
 */

export type UserRole = 
  | 'tourist'   // Турист - ищет и бронирует услуги
  | 'operator'  // Туроператор - создает и продает туры
  | 'guide'     // Гид - проводит туры
  | 'transfer'  // Трансфер - транспортные услуги
  | 'stay'      // Размещение - отели, базы, домики
  | 'gear'      // Снаряжение - прокат оборудования
  | 'agent'     // Агент - продает за комиссию
  | 'admin';    // Администратор платформы

export type PartnerRole = Exclude<UserRole, 'tourist' | 'admin'>;

export const ROLE_LABELS: Record<UserRole, string> = {
  tourist: 'Турист',
  operator: 'Туроператор',
  guide: 'Гид',
  transfer: 'Трансфер',
  stay: 'Размещение',
  gear: 'Снаряжение',
  agent: 'Агент',
  admin: 'Администратор',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  tourist: 'Поиск и бронирование туров, трансферов, жилья',
  operator: 'Создание и продажа туров, управление бронированиями',
  guide: 'Проведение туров, работа с группами',
  transfer: 'Транспортные услуги, трансферы',
  stay: 'Размещение гостей - отели, базы, домики',
  gear: 'Аренда туристического снаряжения',
  agent: 'Продажа туров за комиссию',
  admin: 'Управление платформой',
};

export const PARTNER_ROLES: PartnerRole[] = ['operator', 'guide', 'transfer', 'stay', 'gear', 'agent'];

export const ALL_ROLES: UserRole[] = ['tourist', 'operator', 'guide', 'transfer', 'stay', 'gear', 'agent', 'admin'];

// Роли которые могут иметь несколько одновременно (партнер может быть и оператором и трансфером)
export const MULTI_ROLE_ALLOWED: UserRole[] = ['operator', 'guide', 'transfer', 'stay', 'gear'];

// Маппинг ролей на dashboard пути
export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  tourist: '/hub/tourist',
  operator: '/hub/operator',
  guide: '/hub/guide',
  transfer: '/hub/transfer-operator',
  stay: '/hub/stay-provider',
  gear: '/hub/gear-provider',
  agent: '/hub/agent',
  admin: '/hub/admin',
};
