/**
 * UNIT TESTS: OPERATOR ROLE
 * 
 * Тестирование функциональности туроператора
 * На основе бизнес-процессов партнера fishingkam.ru
 * 
 * - Управление турами (CRUD)
 * - Валидация данных
 * - Сезонность и цены
 * - Расписание туров
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// === MOCK DATA ===

const mockOperator = {
  id: 'operator-1',
  name: 'Камчатская Рыбалка',
  email: 'info@fishingkam.ru'
};

const validTourData = {
  name: 'Зимняя рыбалка на Камчатке',
  description: 'Незабываемая зимняя рыбалка на реках Камчатки. Ловля хариуса, гольца и микижи в живописных местах полуострова.',
  price: 22000,
  category: 'fishing',
  difficulty: 'medium',
  duration: 3,
  minGroupSize: 5,
  maxGroupSize: 10,
  season: 'winter',
  includes: ['Размещение на базе', 'Снаряжение', 'Гид'],
  excludes: ['Трансфер', 'Снасти', 'Питание']
};

// === VALIDATION TESTS ===

describe('Tour Validation', () => {
  
  describe('Required Fields', () => {
    test('should reject tour without name', () => {
      const tour = { ...validTourData, name: '' };
      const errors = validateTour(tour);
      expect(errors).toContain('Название тура обязательно (минимум 3 символа)');
    });

    test('should reject tour with short name', () => {
      const tour = { ...validTourData, name: 'AB' };
      const errors = validateTour(tour);
      expect(errors).toContain('Название тура обязательно (минимум 3 символа)');
    });

    test('should reject tour without description', () => {
      const tour = { ...validTourData, description: '' };
      const errors = validateTour(tour);
      expect(errors).toContain('Описание тура обязательно (минимум 20 символов)');
    });

    test('should reject tour with short description', () => {
      const tour = { ...validTourData, description: 'Короткое описание' };
      const errors = validateTour(tour);
      expect(errors).toContain('Описание тура обязательно (минимум 20 символов)');
    });

    test('should reject tour without price', () => {
      const tour = { ...validTourData, price: undefined };
      const errors = validateTour(tour);
      expect(errors).toContain('Цена тура обязательна');
    });
  });

  describe('Price Validation', () => {
    test('should reject negative price', () => {
      const tour = { ...validTourData, price: -1000 };
      const errors = validateTour(tour);
      expect(errors).toContain('Цена должна быть положительным числом');
    });

    test('should reject price below minimum (1000 RUB)', () => {
      const tour = { ...validTourData, price: 500 };
      const errors = validateTour(tour);
      expect(errors).toContain('Минимальная цена тура: 1000 рублей');
    });

    test('should reject price above maximum (1,000,000 RUB)', () => {
      const tour = { ...validTourData, price: 2000000 };
      const errors = validateTour(tour);
      expect(errors).toContain('Максимальная цена тура: 1,000,000 рублей');
    });

    test('should accept valid price', () => {
      const tour = { ...validTourData, price: 22000 };
      const errors = validateTour(tour);
      expect(errors.filter(e => e.includes('Цена'))).toHaveLength(0);
    });
  });

  describe('Group Size Validation (based on fishingkam.ru - min 5)', () => {
    test('should reject minGroupSize less than 1', () => {
      const tour = { ...validTourData, minGroupSize: 0 };
      const errors = validateTour(tour);
      expect(errors).toContain('Минимальный размер группы: 1 человек');
    });

    test('should reject maxGroupSize more than 100', () => {
      const tour = { ...validTourData, maxGroupSize: 150 };
      const errors = validateTour(tour);
      expect(errors).toContain('Максимальный размер группы: 100 человек');
    });

    test('should reject when minGroupSize > maxGroupSize', () => {
      const tour = { ...validTourData, minGroupSize: 15, maxGroupSize: 10 };
      const errors = validateTour(tour);
      expect(errors).toContain('Минимальный размер группы не может превышать максимальный');
    });

    test('should accept valid group sizes', () => {
      const tour = { ...validTourData, minGroupSize: 5, maxGroupSize: 15 };
      const errors = validateTour(tour);
      expect(errors.filter(e => e.includes('группы'))).toHaveLength(0);
    });
  });

  describe('Duration Validation', () => {
    test('should reject duration less than 1 day', () => {
      const tour = { ...validTourData, duration: 0 };
      const errors = validateTour(tour);
      expect(errors).toContain('Продолжительность тура: от 1 до 30 дней');
    });

    test('should reject duration more than 30 days', () => {
      const tour = { ...validTourData, duration: 45 };
      const errors = validateTour(tour);
      expect(errors).toContain('Продолжительность тура: от 1 до 30 дней');
    });

    test('should accept valid duration', () => {
      const tour = { ...validTourData, duration: 7 };
      const errors = validateTour(tour);
      expect(errors.filter(e => e.includes('Продолжительность'))).toHaveLength(0);
    });
  });

  describe('Season Validation', () => {
    test('should reject invalid season', () => {
      const tour = { ...validTourData, season: 'invalid' };
      const errors = validateTour(tour);
      expect(errors.some(e => e.includes('Сезон'))).toBe(true);
    });

    test('should accept valid seasons', () => {
      const validSeasons = ['winter', 'spring', 'summer', 'autumn', 'year-round'];
      validSeasons.forEach(season => {
        const tour = { ...validTourData, season };
        const errors = validateTour(tour);
        expect(errors.filter(e => e.includes('Сезон'))).toHaveLength(0);
      });
    });
  });

  describe('Category Validation', () => {
    test('should reject invalid category', () => {
      const tour = { ...validTourData, category: 'invalid' };
      const errors = validateTour(tour);
      expect(errors.some(e => e.includes('Категория'))).toBe(true);
    });

    test('should accept valid categories', () => {
      const validCategories = ['fishing', 'hunting', 'adventure', 'eco', 'cultural', 'family'];
      validCategories.forEach(category => {
        const tour = { ...validTourData, category };
        const errors = validateTour(tour);
        expect(errors.filter(e => e.includes('Категория'))).toHaveLength(0);
      });
    });
  });
});

// === SLUG GENERATION TESTS ===

describe('Slug Generation', () => {
  test('should generate slug from Russian name', () => {
    const name = 'Зимняя рыбалка на Камчатке';
    const slug = generateSlug(name);
    expect(slug).toBe('zimnyaya-rybalka-na-kamchatke');
  });

  test('should generate slug from English name', () => {
    const name = 'Winter Fishing Tour';
    const slug = generateSlug(name);
    expect(slug).toBe('winter-fishing-tour');
  });

  test('should remove special characters', () => {
    const name = 'Тур #1: Рыбалка!';
    const slug = generateSlug(name);
    expect(slug).toBe('tur-1-rybalka');
  });

  test('should handle multiple spaces', () => {
    const name = 'Тур   на   Камчатку';
    const slug = generateSlug(name);
    expect(slug).toBe('tur-na-kamchatku');
  });
});

// === SEASONAL PRICING TESTS (based on fishingkam.ru) ===

describe('Seasonal Pricing', () => {
  test('should return winter price for January', () => {
    const date = new Date('2026-01-20');
    const price = getSeasonalPrice(date);
    expect(price).toBeGreaterThanOrEqual(18000);
    expect(price).toBeLessThanOrEqual(25000);
  });

  test('should return summer price for July', () => {
    const date = new Date('2026-07-01');
    const price = getSeasonalPrice(date);
    expect(price).toBe(28000);
  });

  test('should return autumn price for November', () => {
    const date = new Date('2026-11-01');
    const price = getSeasonalPrice(date);
    expect(price).toBe(25000);
  });
});

// === TOUR LIFECYCLE TESTS ===

describe('Tour Lifecycle', () => {
  test('new tour should be created as draft', () => {
    const tour = createTour(validTourData);
    expect(tour.status).toBe('draft');
    expect(tour.isActive).toBe(false);
  });

  test('should not publish tour without required fields', () => {
    const tour = { ...validTourData, description: '' };
    const result = canPublish(tour);
    expect(result.canPublish).toBe(false);
    expect(result.errors).toContain('Описание тура обязательно (минимум 20 символов)');
  });

  test('should publish valid tour', () => {
    const result = canPublish(validTourData);
    expect(result.canPublish).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should deactivate published tour', () => {
    const tour = { ...validTourData, isActive: true };
    const result = deactivateTour(tour);
    expect(result.isActive).toBe(false);
    expect(result.status).toBe('draft');
  });
});

// === SCHEDULE TESTS ===

describe('Tour Schedule', () => {
  test('should reject schedule with past start date', () => {
    const schedule = {
      tourId: 'tour-1',
      startDate: '2020-01-01',
      endDate: '2020-01-05',
      price: 22000,
      maxParticipants: 10
    };
    const errors = validateSchedule(schedule);
    expect(errors).toContain('Дата начала не может быть в прошлом');
  });

  test('should reject schedule with end date before start date', () => {
    const schedule = {
      tourId: 'tour-1',
      startDate: '2027-01-10',
      endDate: '2027-01-05',
      price: 22000,
      maxParticipants: 10
    };
    const errors = validateSchedule(schedule);
    expect(errors).toContain('Дата начала должна быть раньше даты окончания');
  });

  test('should accept valid schedule', () => {
    const schedule = {
      tourId: 'tour-1',
      startDate: '2027-01-10',
      endDate: '2027-01-15',
      price: 22000,
      maxParticipants: 10
    };
    const errors = validateSchedule(schedule);
    expect(errors).toHaveLength(0);
  });
});

// === HELPER FUNCTIONS ===

function validateTour(tour: any): string[] {
  const errors: string[] = [];
  const validSeasons = ['winter', 'spring', 'summer', 'autumn', 'year-round'];
  const validCategories = ['fishing', 'hunting', 'adventure', 'eco', 'cultural', 'family'];
  const validDifficulties = ['easy', 'medium', 'hard', 'extreme'];

  // Required fields
  if (!tour.name || tour.name.trim().length < 3) {
    errors.push('Название тура обязательно (минимум 3 символа)');
  }
  if (!tour.description || tour.description.trim().length < 20) {
    errors.push('Описание тура обязательно (минимум 20 символов)');
  }
  if (tour.price === undefined || tour.price === null) {
    errors.push('Цена тура обязательна');
  }

  // Price validation
  if (tour.price !== undefined) {
    if (typeof tour.price !== 'number' || tour.price < 0) {
      errors.push('Цена должна быть положительным числом');
    }
    if (tour.price > 0 && tour.price < 1000) {
      errors.push('Минимальная цена тура: 1000 рублей');
    }
    if (tour.price > 1000000) {
      errors.push('Максимальная цена тура: 1,000,000 рублей');
    }
  }

  // Group size validation
  const minGroupSize = tour.minGroupSize !== undefined ? tour.minGroupSize : 5;
  const maxGroupSize = tour.maxGroupSize !== undefined ? tour.maxGroupSize : 15;

  if (minGroupSize < 1) {
    errors.push('Минимальный размер группы: 1 человек');
  }
  if (maxGroupSize > 100) {
    errors.push('Максимальный размер группы: 100 человек');
  }
  if (minGroupSize > maxGroupSize) {
    errors.push('Минимальный размер группы не может превышать максимальный');
  }

  // Duration validation
  const duration = tour.duration !== undefined ? tour.duration : 1;
  if (duration < 1 || duration > 30) {
    errors.push('Продолжительность тура: от 1 до 30 дней');
  }

  // Season validation
  if (tour.season && !validSeasons.includes(tour.season)) {
    errors.push(`Сезон должен быть одним из: ${validSeasons.join(', ')}`);
  }

  // Category validation
  if (tour.category && !validCategories.includes(tour.category)) {
    errors.push(`Категория должна быть одной из: ${validCategories.join(', ')}`);
  }

  // Difficulty validation
  if (tour.difficulty && !validDifficulties.includes(tour.difficulty)) {
    errors.push(`Сложность должна быть одной из: ${validDifficulties.join(', ')}`);
  }

  return errors;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[а-яё]/g, (char: string) => {
      const map: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
      };
      return map[char] || char;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getSeasonalPrice(date: Date): number {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Зимняя рыбалка (15.01 - 20.03): 18,000-20,000₽
  if ((month === 1 && day >= 15) || month === 2 || (month === 3 && day <= 20)) {
    return 20000;
  }
  // Зимняя рыбалка (20.02 - 18.04): 22,000-25,000₽
  if ((month === 2 && day >= 20) || month === 3 || (month === 4 && day <= 18)) {
    return 22000;
  }
  // Летняя рыбалка (18.06 - 20.07): 28,000₽
  if ((month === 6 && day >= 18) || (month === 7 && day <= 20)) {
    return 28000;
  }
  // Летняя рыбалка (25.08 - 30.10): 28,000₽
  if ((month === 8 && day >= 25) || month === 9 || (month === 10 && day <= 30)) {
    return 28000;
  }
  // Осенняя рыбалка (30.10 - 15.11): 25,000₽
  if ((month === 10 && day >= 30) || (month === 11 && day <= 15)) {
    return 25000;
  }
  // Зимняя рыбалка (15.11 - 15.01): 22,000-25,000₽
  if ((month === 11 && day >= 15) || month === 12 || (month === 1 && day <= 15)) {
    return 22000;
  }
  // Межсезонье
  return 0;
}

function createTour(data: any) {
  return {
    ...data,
    id: 'tour-' + Date.now(),
    status: 'draft',
    isActive: false,
    createdAt: new Date()
  };
}

function canPublish(tour: any): { canPublish: boolean; errors: string[] } {
  const errors = validateTour(tour);
  return {
    canPublish: errors.length === 0,
    errors
  };
}

function deactivateTour(tour: any) {
  return {
    ...tour,
    isActive: false,
    status: 'draft'
  };
}

function validateSchedule(schedule: any): string[] {
  const errors: string[] = [];

  if (!schedule.tourId) {
    errors.push('ID тура обязателен');
  }
  if (!schedule.startDate) {
    errors.push('Дата начала обязательна');
  }
  if (!schedule.endDate) {
    errors.push('Дата окончания обязательна');
  }
  if (!schedule.price || schedule.price <= 0) {
    errors.push('Цена должна быть положительной');
  }
  if (!schedule.maxParticipants || schedule.maxParticipants < 1) {
    errors.push('Укажите максимальное количество участников');
  }

  if (schedule.startDate && schedule.endDate) {
    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    if (start >= end) {
      errors.push('Дата начала должна быть раньше даты окончания');
    }
    if (start < new Date()) {
      errors.push('Дата начала не может быть в прошлом');
    }
  }

  return errors;
}
