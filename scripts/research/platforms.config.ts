/**
 * scripts/research/platforms.config.ts
 *
 * Конфигурация платформ для marketplace audit.
 * Каждая платформа — оператор fishingkam изнутри.
 */

export interface PlatformConfig {
  id: string;
  name: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'broken' | 'skip';
  loginUrl: string;
  dashboardUrl?: string;
  addTourUrl?: string;
  credentials: {
    emailField?: string;
    passwordField?: string;
    email: string;
    password: string;
  };
  notes?: string;
}

export const PLATFORMS: PlatformConfig[] = [
  // ── БЛОК 1 — российские туры (главный приоритет) ──────────────────────────────

  {
    id: 'tripster',
    name: 'Tripster',
    priority: 'high',
    status: 'active',
    loginUrl: 'https://experience.tripster.ru/accounts/login/',
    dashboardUrl: 'https://experience.tripster.ru/guide/dashboard/',
    addTourUrl: 'https://experience.tripster.ru/guide/experiences/new/',
    credentials: {
      email: 'fishingkam@yandex.ru',
      password: 'zgWwVn9!nmdQGxK',
    },
    notes: 'Уже интегрирован (lib/channels/tripster.ts). Проверить поля тура.',
  },
  {
    id: 'sputnik8',
    name: 'Sputnik8',
    priority: 'high',
    status: 'active',
    loginUrl: 'https://www.sputnik8.com/ru/sign_in',
    dashboardUrl: 'https://www.sputnik8.com/ru/partner',
    credentials: {
      email: 'fishingkam@yandex.ru',
      password: 'Si25LtnpDO13Q$',
    },
    notes: 'Уже интегрирован в channel sync. Изучить структуру тура.',
  },
  {
    id: 'russpass',
    name: 'Russpass',
    priority: 'high',
    status: 'active',
    loginUrl: 'https://russpass.ru/partners',
    credentials: {
      email: 'fishingkam@yandex.ru',
      password: '',
    },
    notes: 'Гос. платформа, бесплатно. Пароль пустой — нужна регистрация.',
  },
  {
    id: 'tourister',
    name: 'Tourister',
    priority: 'medium',
    status: 'active',
    loginUrl: 'https://www.tourister.ru/login',
    credentials: {
      email: 'fishingkam@yandex.ru',
      password: 'Si25LtnpDO13Q$j0%yIkH',
    },
    notes: 'Объявления туров. Проверить формат карточки.',
  },
  {
    id: 'zoon',
    name: 'Zoon',
    priority: 'medium',
    status: 'active',
    loginUrl: 'https://b.zoon.ru/login/',
    credentials: {
      email: 'fishingkam@yandex.ru',
      password: 'zgWwVn9!n13Q$j0%yIkHQGxK',
    },
    notes: 'Услуги и отзывы.',
  },

  // ── БЛОК 2 — агрегаторы ───────────────────────────────────────────────────────

  {
    id: 'level_travel',
    name: 'LevelTravel',
    priority: 'medium',
    status: 'active',
    loginUrl: 'https://partners.level.travel/login',
    credentials: {
      email: 'fishingkam@yandex.ru',
      password: 'GR!n13Q$j0%yIkHQGxKzgWwVn9',
    },
    notes: 'Попадаешь в Яндекс.Путешествия. СМС не приходит — возможно нужна живая авторизация.',
  },
  {
    id: 'travelpayouts',
    name: 'Travelpayouts',
    priority: 'low',
    status: 'active',
    loginUrl: 'https://travelpayouts.com/login',
    credentials: {
      email: 'fishingkam@yandex.ru',
      password: '$j0%yIkHQGxKzgWwVn9p67@2',
    },
    notes: 'Партнёрская сеть (Sputnik8 + все).',
  },

  // ── БЛОК 3 — международные (низкий приоритет) ────────────────────────────────

  {
    id: 'fishingbooker',
    name: 'FishingBooker',
    priority: 'low',
    status: 'active',
    loginUrl: 'https://fishingbooker.com/guides/sign_in',
    credentials: {
      email: 'fishingkam@yandex.ru',
      password: '',
    },
    notes: 'Международная рыбалка. Пароль неизвестен.',
  },

  // ── ПРОПУСТИТЬ (сайты не работают) ───────────────────────────────────────────

  {
    id: 'rybinka',
    name: 'Рыбинка',
    priority: 'low',
    status: 'broken',
    loginUrl: 'https://rybinka.ru',
    credentials: { email: '', password: '' },
    notes: 'Домен продаётся.',
  },
  {
    id: 'rybalka_ru',
    name: 'Рыбалка.ру',
    priority: 'low',
    status: 'broken',
    loginUrl: 'https://rybalka.ru',
    credentials: { email: '', password: '' },
    notes: 'Сайт не действителен.',
  },
  {
    id: 'tinkoff_travel',
    name: 'Tinkoff Путешествия',
    priority: 'low',
    status: 'broken',
    loginUrl: 'https://travel.tinkoff.ru/partners',
    credentials: { email: '', password: '' },
    notes: 'Сайт не грузится даже c VPN.',
  },
];

export const ACTIVE_PLATFORMS = PLATFORMS.filter(p => p.status === 'active');
export const HIGH_PRIORITY = PLATFORMS.filter(p => p.priority === 'high' && p.status === 'active');
