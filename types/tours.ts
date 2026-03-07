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
 * Категории туров
 */
export const TOUR_CATEGORY = {
  // Основные
  VOLCANOES: 'volcanoes',
  FISHING: 'fishing',
  THERMAL: 'thermal',
  MOUNTAINS: 'mountains',
  GEYSERS: 'geysers',
  RIVERS: 'rivers',
  LAKES: 'lakes',
  ECO: 'eco',
  // Дополнительные
  ADVENTURE: 'adventure',
  COMBO: 'combo',
  SNOWMOBILE: 'snowmobile',
  JEEP: 'jeep',
  WILDLIFE: 'wildlife',
  CULTURAL: 'cultural',
} as const;

export type TourCategory = (typeof TOUR_CATEGORY)[keyof typeof TOUR_CATEGORY];

/**
 * Маппинг категорий из парсеров
 */
export const CATEGORY_MAP: Record<string, TourCategory> = {
  // Русские
  'Вулканы': TOUR_CATEGORY.VOLCANOES,
  'Рыбалка': TOUR_CATEGORY.FISHING,
  'Термы': TOUR_CATEGORY.THERMAL,
  'Горячие источники': TOUR_CATEGORY.THERMAL,
  'Горы': TOUR_CATEGORY.MOUNTAINS,
  'Гейзеры': TOUR_CATEGORY.GEYSERS,
  'Реки': TOUR_CATEGORY.RIVERS,
  'Озёра': TOUR_CATEGORY.LAKES,
  'Эко': TOUR_CATEGORY.ECO,
  'Приключения': TOUR_CATEGORY.ADVENTURE,
  'Комбо': TOUR_CATEGORY.COMBO,
  'Снегоход': TOUR_CATEGORY.SNOWMOBILE,
  'Джип': TOUR_CATEGORY.JEEP,
  'Животные': TOUR_CATEGORY.WILDLIFE,
  // Английские
  'Volcanoes': TOUR_CATEGORY.VOLCANOES,
  'Fishing': TOUR_CATEGORY.FISHING,
  'Hot Springs': TOUR_CATEGORY.THERMAL,
  'Mountains': TOUR_CATEGORY.MOUNTAINS,
  'Geysers': TOUR_CATEGORY.GEYSERS,
  'Rivers': TOUR_CATEGORY.RIVERS,
  'Lakes': TOUR_CATEGORY.LAKES,
  'Eco': TOUR_CATEGORY.ECO,
  // Системные
  'volcanoes': TOUR_CATEGORY.VOLCANOES,
  'fishing': TOUR_CATEGORY.FISHING,
  'thermal': TOUR_CATEGORY.THERMAL,
  'mountains': TOUR_CATEGORY.MOUNTAINS,
  'geysers': TOUR_CATEGORY.GEYSERS,
  'rivers': TOUR_CATEGORY.RIVERS,
  'lakes': TOUR_CATEGORY.LAKES,
  'eco': TOUR_CATEGORY.ECO,
  'adventure': TOUR_CATEGORY.ADVENTURE,
  'combo': TOUR_CATEGORY.COMBO,
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
  category?: TourCategory; // Категория (по умолчанию adventure)
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
  console.warn(`[TOUR_SCHEMA] Unknown difficulty: "${value}", using medium`);
  return TOUR_DIFFICULTY.MEDIUM;
}

/**
 * Нормализует category
 */
export function normalizeCategory(value: string | undefined | null): TourCategory {
  if (!value) return TOUR_CATEGORY.ADVENTURE; // По умолчанию
  
  const normalized = CATEGORY_MAP[value] || CATEGORY_MAP[value.trim()];
  if (normalized) return normalized;
  
  // Fallback
  console.warn(`[TOUR_SCHEMA] Unknown category: "${value}", using adventure`);
  return TOUR_CATEGORY.ADVENTURE;
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
  [TOUR_CATEGORY.VOLCANOES]: 'Вулканы',
  [TOUR_CATEGORY.FISHING]: 'Рыбалка',
  [TOUR_CATEGORY.THERMAL]: 'Горячие источники',
  [TOUR_CATEGORY.MOUNTAINS]: 'Горы',
  [TOUR_CATEGORY.GEYSERS]: 'Гейзеры',
  [TOUR_CATEGORY.RIVERS]: 'Реки',
  [TOUR_CATEGORY.LAKES]: 'Озёра',
  [TOUR_CATEGORY.ECO]: 'Эко-туры',
  [TOUR_CATEGORY.ADVENTURE]: 'Приключения',
  [TOUR_CATEGORY.COMBO]: 'Комбо-туры',
  [TOUR_CATEGORY.SNOWMOBILE]: 'Снегоходы',
  [TOUR_CATEGORY.JEEP]: 'Джип-туры',
  [TOUR_CATEGORY.WILDLIFE]: 'Дикая природа',
  [TOUR_CATEGORY.CULTURAL]: 'Культурные',
};
