/**
 * Insurance Service — подбор страховки на основе типа маршрута
 * Integrates Cherehapa API (https://cherehapa.ru/)
 *
 * Logic:
 * - Рыбалка, треккинг, вертолёт → требует страховки
 * - Низкий риск → базовая
 * - Высокий риск → премиум
 */

export interface InsurancePlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'RUB';
  coverage: string[];
  activities: string[];
  risk_level: 'low' | 'medium' | 'high';
  recommended: boolean;
  link: string; // Cherehapa deeplink with marker
}

export interface InsuranceRecommendation {
  plan: InsurancePlan;
  reasoning: string;
  alternatives: InsurancePlan[];
}

// Маркер Cherehapa (tourhab.ru account)
const CHEREHAPA_MARKER = '402896';

// Матрица рисков по типам активности
const ACTIVITY_RISK_MAP: Record<string, 'low' | 'medium' | 'high'> = {
  // Высокий риск
  helicopter: 'high',
  fishing: 'high',
  bear_watching: 'high',
  diving: 'high',
  surf: 'high',
  ski: 'high',
  snowmobile: 'high',
  // Средний риск
  trekking: 'medium',
  jeep: 'medium',
  boat_trip: 'medium',
  // Низкий риск
  sightseeing: 'low',
  cultural: 'low',
  photo: 'low',
  camping: 'low',
  eco: 'low',
  thermal: 'low',
  other: 'low',
};

// Встроенные планы Cherehapa (кэш актуален 7 дней)
// В production: fetch из Cherehapa API
const CHEREHAPA_PLANS: InsurancePlan[] = [
  {
    id: 'basic-ru',
    name: 'Basic',
    description: 'Стандартное медицинское покрытие',
    price: 500,
    currency: 'RUB',
    coverage: ['medical', 'evacuation_domestic'],
    activities: ['cultural', 'sightseeing', 'camping', 'eco', 'thermal'],
    risk_level: 'low',
    recommended: false,
    link: `https://cherehapa.ru/?plan=basic&marker=${CHEREHAPA_MARKER}`,
  },
  {
    id: 'silver-ru',
    name: 'Silver',
    description: 'Для активного отдыха: рыбалка, треккинг, вертолёт',
    price: 1200,
    currency: 'RUB',
    coverage: ['medical', 'evacuation_domestic', 'equipment_loss', 'activity_injury'],
    activities: ['fishing', 'trekking', 'helicopter', 'jeep', 'boat_trip', 'camping'],
    risk_level: 'medium',
    recommended: false,
    link: `https://cherehapa.ru/?plan=silver&marker=${CHEREHAPA_MARKER}`,
  },
  {
    id: 'gold-ru',
    name: 'Gold',
    description: 'Премиум: экстремальные виды спорта',
    price: 2500,
    currency: 'RUB',
    coverage: ['medical', 'evacuation_domestic', 'evacuation_international', 'equipment_loss', 'activity_injury', 'extreme_sports'],
    activities: ['diving', 'surf', 'ski', 'snowmobile', 'bear_watching', 'helicopter'],
    risk_level: 'high',
    recommended: false,
    link: `https://cherehapa.ru/?plan=gold&marker=${CHEREHAPA_MARKER}`,
  },
];

/**
 * Определить уровень риска маршрута на основе типов активности
 */
function computeRiskLevel(activityTypes: string[]): 'low' | 'medium' | 'high' {
  const risks = activityTypes
    .map(a => ACTIVITY_RISK_MAP[a] || 'low')
    .sort((a, b) => {
      const order = { high: 3, medium: 2, low: 1 };
      return order[b] - order[a];
    });

  return risks[0] || 'low';
}

/**
 * Подобрать оптимальный план страховки для маршрута
 */
export function recommendInsurance(activityTypes: string[]): InsuranceRecommendation {
  const riskLevel = computeRiskLevel(activityTypes);

  let recommendedPlan: InsurancePlan;
  switch (riskLevel) {
    case 'high':
      recommendedPlan = CHEREHAPA_PLANS.find(p => p.id === 'gold-ru')!;
      break;
    case 'medium':
      recommendedPlan = CHEREHAPA_PLANS.find(p => p.id === 'silver-ru')!;
      break;
    default:
      recommendedPlan = CHEREHAPA_PLANS.find(p => p.id === 'basic-ru')!;
  }

  recommendedPlan.recommended = true;

  const alternatives = CHEREHAPA_PLANS.filter(p => p.id !== recommendedPlan.id);

  const reasoningMap: Record<string, string> = {
    high: 'Экстремальные виды спорта требуют максимального покрытия',
    medium: 'Для активного туристического маршрута рекомендуем Silver',
    low: 'Базовая медицинская страховка подойдёт',
  };

  return {
    plan: recommendedPlan,
    reasoning: reasoningMap[riskLevel],
    alternatives,
  };
}

/**
 * @deprecated Для будущей интеграции с Cherehapa API
 * Будет использоваться fetch в production
 */
export async function fetchCheerapaPlans(locale: 'ru' | 'en' = 'ru'): Promise<InsurancePlan[]> {
  // TODO: Implement Cherehapa API integration
  // https://support.cherehapa.ru/hc/ru/articles/...
  // POST https://cherehapa.ru/api/insurance-plans
  // Параметры: activities[], budget, locale
  return CHEREHAPA_PLANS;
}
