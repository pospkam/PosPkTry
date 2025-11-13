/**
 * Модуль расчета логистики для планировщика поездок
 * 
 * Функции:
 * - Расчет расстояний между точками (Haversine formula)
 * - Определение оптимального транспорта
 * - Расчет времени в пути
 * - Построение маршрута между локациями
 */

// Координаты ключевых точек Камчатки
export const KAMCHATKA_LOCATIONS = {
  airport: { lat: 53.1679, lng: 158.4536, name: 'Аэропорт Елизово' },
  city_center: { lat: 53.0186, lng: 158.6507, name: 'Центр Петропавловска-Камчатского' },
  avacha_volcano: { lat: 53.2550, lng: 158.8300, name: 'Авачинский вулкан' },
  koryaksky_volcano: { lat: 53.3214, lng: 158.7119, name: 'Корякский вулкан' },
  paratunka: { lat: 52.9667, lng: 158.2500, name: 'Паратунка (термальные источники)' },
  khalaktyrsky_beach: { lat: 52.9167, lng: 158.7167, name: 'Халактырский пляж' },
  vilyuchinsky_pass: { lat: 52.7167, lng: 158.0833, name: 'Вилючинский перевал' },
  petropavlovsk: { lat: 53.0445, lng: 158.6431, name: 'Петропавловск-Камчатский' },
};

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location extends Coordinates {
  name: string;
  address?: string;
}

export interface TransportOption {
  type: 'walk' | 'car' | 'bus' | 'taxi' | 'transfer' | 'helicopter';
  duration_minutes: number;
  distance_km: number;
  cost_estimate?: number;
  feasibility: 'easy' | 'moderate' | 'difficult' | 'not_recommended';
  notes?: string;
}

export interface LogisticsRoute {
  from: Location;
  to: Location;
  distance_km: number;
  recommended_transport: TransportOption;
  alternatives: TransportOption[];
  estimated_cost: number;
  notes: string[];
}

/**
 * Расчет расстояния между двумя точками (формула Haversine)
 * @returns Расстояние в километрах
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371; // Радиус Земли в км
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Округляем до 1 знака
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Определение оптимального транспорта на основе расстояния и условий
 */
export function determineTransport(
  distanceKm: number,
  terrain: 'city' | 'mountain' | 'mixed' = 'mixed',
  hasPublicTransport: boolean = false
): TransportOption[] {
  const options: TransportOption[] = [];
  
  // Пешком (до 2 км в городе, до 5 км в природе)
  if (distanceKm <= 2 && terrain === 'city') {
    options.push({
      type: 'walk',
      duration_minutes: Math.ceil(distanceKm * 15), // 4 км/ч
      distance_km: distanceKm,
      cost_estimate: 0,
      feasibility: 'easy',
      notes: 'Приятная прогулка'
    });
  } else if (distanceKm <= 5 && terrain === 'mountain') {
    options.push({
      type: 'walk',
      duration_minutes: Math.ceil(distanceKm * 20), // 3 км/ч по пересеченной местности
      distance_km: distanceKm,
      cost_estimate: 0,
      feasibility: 'moderate',
      notes: 'Потребуется хорошая физическая подготовка'
    });
  }
  
  // Автобус (только в городе)
  if (terrain === 'city' && hasPublicTransport && distanceKm > 2) {
    options.push({
      type: 'bus',
      duration_minutes: Math.ceil(distanceKm * 5 + 10), // + время ожидания
      distance_km: distanceKm,
      cost_estimate: 30,
      feasibility: 'easy',
      notes: 'Расписание нужно уточнить заранее'
    });
  }
  
  // Такси (везде, от 1 км)
  if (distanceKm >= 1) {
    options.push({
      type: 'taxi',
      duration_minutes: Math.ceil(distanceKm * 2.5), // ~25 км/ч с учетом города
      distance_km: distanceKm,
      cost_estimate: Math.max(200, distanceKm * 50), // Мин 200₽, далее 50₽/км
      feasibility: 'easy',
      notes: 'Удобно, можно вызвать через приложение'
    });
  }
  
  // Трансфер (для туристических маршрутов, от 10 км)
  if (distanceKm >= 10) {
    options.push({
      type: 'transfer',
      duration_minutes: Math.ceil(distanceKm * 2), // ~30 км/ч
      distance_km: distanceKm,
      cost_estimate: distanceKm * 100, // 100₽/км
      feasibility: 'easy',
      notes: 'Комфортабельный транспорт с гидом'
    });
  }
  
  // Личный автомобиль (от 5 км)
  if (distanceKm >= 5) {
    options.push({
      type: 'car',
      duration_minutes: Math.ceil(distanceKm * 2), // ~30 км/ч
      distance_km: distanceKm,
      cost_estimate: distanceKm * 15, // Топливо ~15₽/км
      feasibility: terrain === 'city' ? 'easy' : 'moderate',
      notes: 'Требуется аренда автомобиля'
    });
  }
  
  // Вертолет (для отдаленных мест, от 50 км)
  if (distanceKm >= 50 && terrain === 'mountain') {
    options.push({
      type: 'helicopter',
      duration_minutes: Math.ceil(distanceKm * 0.5), // ~120 км/ч
      distance_km: distanceKm,
      cost_estimate: distanceKm * 1000, // Очень дорого
      feasibility: 'moderate',
      notes: 'Эксклюзивный вариант, погодозависим'
    });
  }
  
  // Сортируем по целесообразности и цене
  return options.sort((a, b) => {
    const feasibilityScore = { easy: 3, moderate: 2, difficult: 1, not_recommended: 0 };
    const scoreA = feasibilityScore[a.feasibility] * 100 - (a.cost_estimate || 0);
    const scoreB = feasibilityScore[b.feasibility] * 100 - (b.cost_estimate || 0);
    return scoreB - scoreA;
  });
}

/**
 * Построение полного маршрута логистики
 */
export function buildLogisticsRoute(
  from: Location,
  to: Location,
  preferences?: {
    maxBudget?: number;
    preferredTransport?: TransportOption['type'];
    terrain?: 'city' | 'mountain' | 'mixed';
  }
): LogisticsRoute {
  
  const distance = calculateDistance(from, to);
  const terrain = preferences?.terrain || 'mixed';
  
  // Определяем наличие общественного транспорта (только в городе)
  const hasPublicTransport = 
    terrain === 'city' || 
    (from.name?.includes('Петропавловск') && to.name?.includes('Петропавловск'));
  
  // Получаем все варианты транспорта
  const transportOptions = determineTransport(distance, terrain, hasPublicTransport);
  
  // Фильтруем по бюджету
  let availableOptions = preferences?.maxBudget 
    ? transportOptions.filter(t => (t.cost_estimate || 0) <= preferences.maxBudget!)
    : transportOptions;
  
  // Если нет вариантов в бюджете, берем самый дешевый
  if (availableOptions.length === 0) {
    availableOptions = [transportOptions[transportOptions.length - 1]];
  }
  
  // Выбираем рекомендуемый вариант
  let recommended = availableOptions[0];
  
  // Если указан предпочтительный транспорт, пробуем его использовать
  if (preferences?.preferredTransport) {
    const preferred = availableOptions.find(t => t.type === preferences.preferredTransport);
    if (preferred) {
      recommended = preferred;
    }
  }
  
  // Формируем заметки
  const notes: string[] = [];
  
  if (distance > 50) {
    notes.push('Дальняя поездка - запаситесь водой и снеками');
  }
  
  if (terrain === 'mountain') {
    notes.push('Горная местность - возможны задержки из-за погоды');
  }
  
  if (from.name?.includes('Аэропорт') || to.name?.includes('Аэропорт')) {
    notes.push('Уточните время прибытия/вылета для планирования трансфера');
  }
  
  if (recommended.type === 'walk' && distance > 3) {
    notes.push('Потребуется хорошая физическая подготовка и удобная обувь');
  }
  
  return {
    from,
    to,
    distance_km: distance,
    recommended_transport: recommended,
    alternatives: availableOptions.slice(1),
    estimated_cost: recommended.cost_estimate || 0,
    notes
  };
}

/**
 * Расчет общей стоимости маршрута
 */
export function calculateRouteCost(routes: LogisticsRoute[]): number {
  return routes.reduce((total, route) => total + route.estimated_cost, 0);
}

/**
 * Расчет общего времени в пути
 */
export function calculateTotalTravelTime(routes: LogisticsRoute[]): number {
  return routes.reduce(
    (total, route) => total + route.recommended_transport.duration_minutes,
    0
  );
}

/**
 * Проверка возможности посещения нескольких точек за день
 */
export function isDayTripFeasible(
  locations: Location[],
  maxTravelTimeMinutes: number = 240 // 4 часа максимум на переезды
): {
  feasible: boolean;
  totalDistance: number;
  totalTravelTime: number;
  routes: LogisticsRoute[];
} {
  
  const routes: LogisticsRoute[] = [];
  let totalDistance = 0;
  let totalTravelTime = 0;
  
  for (let i = 0; i < locations.length - 1; i++) {
    const route = buildLogisticsRoute(locations[i], locations[i + 1]);
    routes.push(route);
    totalDistance += route.distance_km;
    totalTravelTime += route.recommended_transport.duration_minutes;
  }
  
  return {
    feasible: totalTravelTime <= maxTravelTimeMinutes,
    totalDistance,
    totalTravelTime,
    routes
  };
}

/**
 * Получение ближайшей известной локации
 */
export function findNearestKnownLocation(coordinates: Coordinates): {
  location: Location;
  distance: number;
} {
  let nearest: Location = KAMCHATKA_LOCATIONS.city_center;
  let minDistance = Infinity;
  
  for (const [key, location] of Object.entries(KAMCHATKA_LOCATIONS)) {
    const distance = calculateDistance(coordinates, location);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = location;
    }
  }
  
  return {
    location: nearest,
    distance: minDistance
  };
}

/**
 * Форматирование времени в пути
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} минут`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
  }
  
  return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'} ${mins} минут`;
}

/**
 * Форматирование расстояния
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} метров`;
  }
  return `${km.toFixed(1)} км`;
}
