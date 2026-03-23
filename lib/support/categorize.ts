/**
 * Support Ticket Categorization
 *
 * Быстрая классификация текста обращения без AI:
 * сначала ключевые слова → если неоднозначно → AI уточнение
 *
 * Категории соответствуют Резидентам Совета:
 *   billing   → Planning (финансы, выплаты, комиссии)
 *   booking   → Quality  (споры по брони, оператор не отвечает)
 *   safety    → Rescue   (ЧС, травмы, безопасность)
 *   refund    → Admin    (возвраты нестандартные)
 *   content   → Content  (описания туров, фото)
 *   technical → Admin    (баги, не работает сайт/бот)
 *   operator  → Quality  (жалобы на оператора)
 *   other     → Admin    (всё остальное)
 */

export type SupportCategory =
  | 'billing'
  | 'booking'
  | 'safety'
  | 'refund'
  | 'content'
  | 'technical'
  | 'operator'
  | 'other';

export interface CategoryResult {
  category: SupportCategory;
  resident: string;
  confidence: 'high' | 'medium' | 'low';
}

const CATEGORY_MAP: Array<{ category: SupportCategory; resident: string; keywords: string[] }> = [
  {
    category: 'safety',
    resident: 'Rescue',
    keywords: ['чс', 'травм', 'опасн', 'спасат', 'sos', 'сос', 'экстренн', 'несчастн', 'потерял', 'заблудил', 'медицин', 'скорую'],
  },
  {
    category: 'billing',
    resident: 'Planning',
    keywords: ['выплат', 'начислен', 'комисс', 'деньг', 'оплат', 'не пришли деньги', 'счёт', 'баланс', 'финанс'],
  },
  {
    category: 'refund',
    resident: 'Admin',
    keywords: ['возврат', 'верните', 'вернуть деньги', 'отмен', 'отказ от тура'],
  },
  {
    category: 'booking',
    resident: 'Quality',
    keywords: ['бронь', 'бронирован', 'не подтвердил', 'оператор не отвечает', 'заявка', 'тур не состоял'],
  },
  {
    category: 'operator',
    resident: 'Quality',
    keywords: ['жалоба на оператора', 'оператор обманул', 'некачественн', 'плохой тур', 'отзыв'],
  },
  {
    category: 'technical',
    resident: 'Admin',
    keywords: ['не работает', 'ошибка', 'баг', 'сайт', 'приложение', 'не могу войти', 'не загружается', 'сломалось'],
  },
  {
    category: 'content',
    resident: 'Content',
    keywords: ['описан', 'фото', 'информац', 'неверн', 'ложн', 'неправильн', 'маршрут'],
  },
];

/**
 * Категоризирует текст обращения по ключевым словам.
 * Возвращает категорию и назначенного Резидента.
 */
export function categorizeSupport(text: string): CategoryResult {
  const lower = text.toLowerCase();

  let bestMatch: typeof CATEGORY_MAP[0] | null = null;
  let bestScore = 0;

  for (const entry of CATEGORY_MAP) {
    const score = entry.keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (!bestMatch || bestScore === 0) {
    return { category: 'other', resident: 'Admin', confidence: 'low' };
  }

  return {
    category: bestMatch.category,
    resident: bestMatch.resident,
    confidence: bestScore >= 2 ? 'high' : 'medium',
  };
}

export const CATEGORY_LABELS: Record<SupportCategory, string> = {
  billing:   'Финансы и выплаты',
  booking:   'Бронирование',
  safety:    'Безопасность',
  refund:    'Возврат средств',
  content:   'Контент туров',
  technical: 'Технические проблемы',
  operator:  'Жалоба на оператора',
  other:     'Другое',
};

export const RESIDENT_INTRO: Record<string, string> = {
  Rescue:  'Принял Резидент Rescue — отдел безопасности.',
  Planning:'Принял Резидент Planning — финансы и выплаты.',
  Quality: 'Принял Резидент Quality — контроль качества.',
  Content: 'Принял Резидент Content — команда контента.',
  Admin:   'Принял Резидент Admin — операционный отдел.',
};
