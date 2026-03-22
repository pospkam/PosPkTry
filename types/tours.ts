/**
 * Единая схема данных для туров и маршрутов
 * 
 * Используется:
 * - Парсерами (idilesom, партнёры)
 * - Ручным вводом (админка, опер аторы)
 * - API валидацией
 * - База знаний агентов
 * 
 * @version 1.0
 * @updated 2026-03-07
 */

// ============================================================================
// КОНСТАНТЫ - Допустимые значения
// ============================================================================

/**
 * Уровни сложности тура
 * @constraint tours.difficulty CHECK
 */
export const TOUR_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const;

export type TourDifficulty = (typeof TOUR_DIFFICULTY)[keyof typeof TOUR_DIFFICULTY];

/**
 * Маппинг из русского/вариативных форматов в системный
 */
export const DIFFICULTY_MAP: Record<string, TourDifficulty> = {
  // Русские
  'Лёгкий': TOUR_DIFFICULTY.EASY,
  'Легкий': TOUR_DIFFICULTY.EASY,
  'Средний': TOUR_DIFFICULTY.MEDIUM,
  'Сложный': TOUR_DIFFICULTY.HARD,
  'Очень сложный': TOUR_DIFFICULTY.HARD, // Мапим на hard
  'Экстремальный': TOUR_DIFFICULTY.HARD,
  // Английские
  'Very Easy': TOUR_DIFFICULTY.EASY,
  'Easy': TOUR_DIFFICULTY.EASY,
  'Medium': TOUR_DIFFICULTY.MEDIUM,
  'Moderate': TOUR_DIFFICULTY.MEDIUM,
  'Hard': TOUR_DIFFICULTY.HARD,
  'Very Hard': TOUR_DIFFICULTY.HARD,
  'Extreme': TOUR_DIFFICULTY.HARD,
  // Системные (идемпотентность)
  'easy': TOUR_DIFFICULTY.EASY,
  'medium': TOUR_DIFFICULTY.MEDIUM,
  'hard': TOUR_DIFFICULTY.HARD,
  'very_hard': TOUR_DIFFICULTY.HARD,
};

/**
 * Категории туров (единые русские транслит-слаги)
 */
export const TOUR_CATEGORY = {
  VULKANI: 'vulkani',
  GEYZERY: 'geyzery',
  RYBALKA: 'rybalka',
  TERMALNYE: 'termalnye_istochniki',
  MEDVEDI: 'medvedi',
  MORSKIE: 'morskie_progulki',
  VERTOLETNYE: 'vertoletnye_tury',
  TREKKING: 'trekking',
  SNEGOHOD: 'snegohod',
  DZHIP: 'dzhip',
  OZERA: 'ozera',
  GORY: 'gory',
  REKI: 'reki',
  EKO: 'eko',
  KOMBO: 'kombo',
} as const;

/** Маппинг старых английских слагов → новые русские */
export const CATEGORY_ALIAS: Record<string, TourCategory> = {
  volcanoes: 'vulkani',
  fishing: 'rybalka',
  thermal: 'termalnye_istochniki',
  geysers: 'geyzery',
  wildlife: 'medvedi',
  bears: 'medvedi',
  helicopter: 'vertoletnye_tury',
  snowmobile: 'snegohod',
  jeep: 'dzhip',
  mountains: 'gory',
  rivers: 'reki',
  lakes: 'ozera',
  eco: 'eko',
  combo: 'kombo',
  adventure: 'trekking',
  cultural: 'trekking',
  hunting: 'rybalka',
  family: 'trekking',
};

export type TourCategory = (typeof TOUR_CATEGORY)[keyof typeof TOUR_CATEGORY];

/**
 * Маппинг категорий из парсеров и внешних источников
 */
export const CATEGORY_MAP: Record<string, TourCategory> = {
  // Русские названия
  'Вулканы': TOUR_CATEGORY.VULKANI,
  'Рыбалка': TOUR_CATEGORY.RYBALKA,
  'Термы': TOUR_CATEGORY.TERMALNYE,
  'Горячие источники': TOUR_CATEGORY.TERMALNYE,
  'Гейзеры': TOUR_CATEGORY.GEYZERY,
  'Горы': TOUR_CATEGORY.GORY,
  'Реки': TOUR_CATEGORY.REKI,
  'Озёра': TOUR_CATEGORY.OZERA,
  'Эко': TOUR_CATEGORY.EKO,
  'Комбо': TOUR_CATEGORY.KOMBO,
  'Снегоход': TOUR_CATEGORY.SNEGOHOD,
  'Джип': TOUR_CATEGORY.DZHIP,
  'Медведи': TOUR_CATEGORY.MEDVEDI,
  'Животные': TOUR_CATEGORY.MEDVEDI,
  'Море': TOUR_CATEGORY.MORSKIE,
  'Вертолёт': TOUR_CATEGORY.VERTOLETNYE,
  'Треккинг': TOUR_CATEGORY.TREKKING,
  'Приключения': TOUR_CATEGORY.TREKKING,
  // Английские
  'Volcanoes': TOUR_CATEGORY.VULKANI,
  'Fishing': TOUR_CATEGORY.RYBALKA,
  'Hot Springs': TOUR_CATEGORY.TERMALNYE,
  'Mountains': TOUR_CATEGORY.GORY,
  'Geysers': TOUR_CATEGORY.GEYZERY,
  'Rivers': TOUR_CATEGORY.REKI,
  'Lakes': TOUR_CATEGORY.OZERA,
  'Eco': TOUR_CATEGORY.EKO,
  // Системные (все старые + новые слаги для идемпотентности)
  ...Object.fromEntries(Object.values(TOUR_CATEGORY).map(v => [v, v])),
  // Старые английские слаги
  'volcanoes': TOUR_CATEGORY.VULKANI,
  'fishing': TOUR_CATEGORY.RYBALKA,
  'thermal': TOUR_CATEGORY.TERMALNYE,
  'mountains': TOUR_CATEGORY.GORY,
  'geysers': TOUR_CATEGORY.GEYZERY,
  'rivers': TOUR_CATEGORY.REKI,
  'lakes': TOUR_CATEGORY.OZERA,
  'eco': TOUR_CATEGORY.EKO,
  'adventure': TOUR_CATEGORY.TREKKING,
  'combo': TOUR_CATEGORY.KOMBO,
  'snowmobile': TOUR_CATEGORY.SNEGOHOD,
  'jeep': TOUR_CATEGORY.DZHIP,
  'wildlife': TOUR_CATEGORY.MEDVEDI,
  'bears': TOUR_CATEGORY.MEDVEDI,
  'helicopter': TOUR_CATEGORY.VERTOLETNYE,
  'cultural': TOUR_CATEGORY.TREKKING,
};

/**
 * Валюты
 */
export const CURRENCY = {
  RUB: 'RUB',
  USD: 'USD',
  EUR: 'EUR',
} as const;

export type Currency = (typeof CURRENCY)[keyof typeof CURRENCY];

/**
 * Сезоны
 */
export const SEASON = {
  WINTER: 'winter', // Декабрь-Февраль
  SPRING: 'spring', // Март-Май
  SUMMER: 'summer', // Июнь-Август
  AUTUMN: 'autumn', // Сентябрь-Ноябрь
  ALL_YEAR: 'all_year',
} as const;

export type Season = (typeof SEASON)[keyof typeof SEASON];

/**
 * Статусы тура
 */
export const TOUR_STATUS = {
  ACTIVE: true,
  INACTIVE: false,
} as const;

// ============================================================================
// ТИПЫ ДАННЫХ
// ============================================================================

/**
 * Координаты (lat/lng)
 */
export interface Coordinates {
  lat: number;
  lng: number;
  address?: string;
  name?: string;
}

/**
 * Основной тип для тура (полная схема)
 */
export interface Tour {
  // Обязательные поля
  id?: string; // UUID, генерируется автоматически
  name: string; // Название (макс 255 символов)
  description: string; // Полное описание
  difficulty: TourDifficulty; // Сложность (easy/medium/hard)
  duration: number; // Длительность в часах
  price: number; // Цена (без копеек, в рублях)

  // Необязательные поля
  short_description?: string; // Краткое описание (макс 200 символов)
  category?: TourCategory; // Категория (по умолчанию trekking)
  currency?: Currency; // Валюта (по умолчанию RUB)
  season?: Season[]; // Сезоны (массив)
  coordinates?: Coordinates[]; // Маршрут (массив точек)
  requirements?: string[]; // Требования
  included?: string[]; // Что включено
  not_included?: string[]; // Что не включено
  
  // Группа
  max_group_size?: number; // Максимум человек (по умолчанию 20)
  min_group_size?: number; // Минимум человек (по умолчанию 1)
  
  // Рейтинг
  rating?: number; // 0.0 - 5.0
  review_count?: number; // Количество отзывов
  
  // Связи
  operator_id?: string; // UUID оператора
  guide_id?: string; // UUID гида
  
  // Статус
  is_active?: boolean; // Активен ли тур (по умолчанию true)
  
  // Временные метки
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Минимальный тур (для создания)
 */
export interface MinimalTour {
  name: string;
  description: string;
  difficulty: TourDifficulty;
  duration: number;
  price: number;
}

/**
 * Тур от парсера (может быть в любом формате)
 */
export interface ParsedTour {
  id?: string;
  name: string;
  description?: string;
  category?: string; // Любой строкой (будет маппиться)
  difficulty?: string; // Любой строкой (будет маппиться)
  duration?: number | string;
  price?: number;
  lat?: number | null;
  lng?: number | null;
  district?: string;
  length_km?: number;
  // ... другие поля из парсера
}

// ============================================================================
// ВАЛИДАЦИЯ
// ============================================================================

/**
 * Проверяет валидность difficulty
 */
export function isValidDifficulty(value: unknown): value is TourDifficulty {
  return (
    typeof value === 'string' &&
    Object.values(TOUR_DIFFICULTY).includes(value as TourDifficulty)
  );
}

/**
 * Проверяет валидность category
 */
export function isValidCategory(value: unknown): value is TourCategory {
  return (
    typeof value === 'string' &&
    Object.values(TOUR_CATEGORY).includes(value as TourCategory)
  );
}

/**
 * Нормализует difficulty (из любого формата в системный)
 */
export function normalizeDifficulty(value: string | undefined | null): TourDifficulty {
  if (!value) return TOUR_DIFFICULTY.MEDIUM; // По умолчанию
  
  const normalized = DIFFICULTY_MAP[value] || DIFFICULTY_MAP[value.trim()];
  if (normalized) return normalized;
  
  // Fallback: если не нашли - берём medium
  return TOUR_DIFFICULTY.MEDIUM;
}

/**
 * Нормализует category
 */
export function normalizeCategory(value: string | undefined | null): TourCategory {
  if (!value) return TOUR_CATEGORY.TREKKING;

  const normalized = CATEGORY_MAP[value] || CATEGORY_MAP[value.trim()];
  if (normalized) return normalized;

  // Проверяем alias
  const aliased = CATEGORY_ALIAS[value] || CATEGORY_ALIAS[value.trim()];
  if (aliased) return aliased;

  return TOUR_CATEGORY.TREKKING;
}

/**
 * Нормализует ParsedTour в Tour
 */
export function normalizeParsedTour(parsed: ParsedTour): Partial<Tour> {
  const tour: Partial<Tour> = {
    name: parsed.name,
    description: parsed.description || '',
    difficulty: normalizeDifficulty(parsed.difficulty),
    category: normalizeCategory(parsed.category),
    duration: typeof parsed.duration === 'string' 
      ? parseInt(parsed.duration) 
      : parsed.duration || 1,
    price: parsed.price || 0,
  };

  // Координаты
  if (parsed.lat && parsed.lng) {
    tour.coordinates = [
      {
        lat: parsed.lat,
        lng: parsed.lng,
        name: parsed.district || undefined,
      },
    ];
  }

  return tour;
}

/**
 * Валидирует минимальные требования
 */
export function validateMinimalTour(tour: Partial<Tour>): tour is MinimalTour {
  return !!(
    tour.name &&
    tour.description &&
    tour.difficulty &&
    isValidDifficulty(tour.difficulty) &&
    typeof tour.duration === 'number' &&
    tour.duration > 0 &&
    typeof tour.price === 'number' &&
    tour.price >= 0
  );
}

// ============================================================================
// КОНСТАНТЫ ДЛЯ ОТОБРАЖЕНИЯ
// ============================================================================

/**
 * Человеко-читаемые названия сложности (для UI)
 */
export const DIFFICULTY_LABELS: Record<TourDifficulty, string> = {
  [TOUR_DIFFICULTY.EASY]: 'Л��гкий',
  [TOUR_DIFFICULTY.MEDIUM]: 'Средний',
  [TOUR_DIFFICULTY.HARD]: 'Сложный',
};

/**
 * Человеко-читаемые названия категорий (для UI)
 */
export const CATEGORY_LABELS: Record<TourCategory, string> = {
  [TOUR_CATEGORY.VULKANI]: 'Вулканы',
  [TOUR_CATEGORY.GEYZERY]: 'Гейзеры',
  [TOUR_CATEGORY.RYBALKA]: 'Рыбалка',
  [TOUR_CATEGORY.TERMALNYE]: 'Горячие источники',
  [TOUR_CATEGORY.MEDVEDI]: 'Медведи',
  [TOUR_CATEGORY.MORSKIE]: 'Морские прогулки',
  [TOUR_CATEGORY.VERTOLETNYE]: 'Вертолётные туры',
  [TOUR_CATEGORY.TREKKING]: 'Треккинг',
  [TOUR_CATEGORY.SNEGOHOD]: 'Снегоходы',
  [TOUR_CATEGORY.DZHIP]: 'Джип-туры',
  [TOUR_CATEGORY.OZERA]: 'Озёра',
  [TOUR_CATEGORY.GORY]: 'Горы',
  [TOUR_CATEGORY.REKI]: 'Реки',
  [TOUR_CATEGORY.EKO]: 'Эко-туры',
  [TOUR_CATEGORY.KOMBO]: 'Комбо-туры',
};
