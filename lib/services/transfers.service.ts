/**
 * Transfers Service — трансферы из аэропорта и логистика
 * Integrates Kiwitaxi API
 *
 * Main routes:
 * - Airport (PKC) → City center
 * - City center → Tour meeting points
 * - Inter-tour logistics
 *
 * Docs: https://kiwitaxi.ru/
 */

export interface Transfer {
  id: string;
  name: string;
  from: string;
  to: string;
  price_rub: number;
  capacity: number;
  duration_minutes: number;
  notes: string;
  link: string;
}

export interface TransferRecommendation {
  airport_to_city: Transfer;
  city_to_tour: Transfer;
  total_cost: number;
}

const KIWITAXI_MARKER = '402896';

// Типичные трансферы на Камчатке
const TRANSFERS_DB: Transfer[] = [
  {
    id: 'pkc-center',
    name: 'Аэропорт → Центр города',
    from: 'Аэропорт Петропавловска (PKC)',
    to: 'Центр Петропавловска',
    price_rub: 800,
    capacity: 4,
    duration_minutes: 35,
    notes: 'Зарезервируйте заранее. Водитель встретит с табличкой',
    link: `https://kiwitaxi.ru/?aff_id=${KIWITAXI_MARKER}`,
  },
  {
    id: 'center-avacha',
    name: 'Центр → Вулкан Авача',
    from: 'Центр Петропавловска',
    to: 'Вулкан Авача (35 км)',
    price_rub: 2500,
    capacity: 6,
    duration_minutes: 50,
    notes: 'Дороги грунтовые, возможна грязь. Внедорожник или внимание водителя',
    link: `https://kiwitaxi.ru/?aff_id=${KIWITAXI_MARKER}`,
  },
  {
    id: 'center-kurils',
    name: 'Центр → Курильское озеро (медведи)',
    from: 'Центр Петропавловска',
    to: 'Курильское озеро (100 км)',
    price_rub: 5000,
    capacity: 6,
    duration_minutes: 180,
    notes: 'Длинный трансфер. Завтрак в дороге. Обязательна страховка',
    link: `https://kiwitaxi.ru/?aff_id=${KIWITAXI_MARKER}`,
  },
  {
    id: 'center-fishing',
    name: 'Центр → Рыболовные базы',
    from: 'Центр Петропавловска',
    to: 'Рыболовные базы (50-80 км)',
    price_rub: 3500,
    capacity: 4,
    duration_minutes: 90,
    notes: 'Специальное оборудование для рыбалки. Водитель опытен',
    link: `https://kiwitaxi.ru/?aff_id=${KIWITAXI_MARKER}`,
  },
];

/**
 * Рекомендовать трансферы для турпакета
 */
export function recommendTransfers(
  activity_type?: string
): TransferRecommendation {
  // Всегда есть трансфер из аэропорта
  const airport_transfer = TRANSFERS_DB.find(t => t.id === 'pkc-center')!;

  // Подбираем трансфер до тура на основе типа активности
  let tour_transfer: Transfer;
  switch (activity_type) {
    case 'bear_watching':
      tour_transfer = TRANSFERS_DB.find(t => t.id === 'center-kurils')!;
      break;
    case 'fishing':
      tour_transfer = TRANSFERS_DB.find(t => t.id === 'center-fishing')!;
      break;
    case 'helicopter':
    case 'trekking':
      tour_transfer = TRANSFERS_DB.find(t => t.id === 'center-avacha')!;
      break;
    default:
      tour_transfer = TRANSFERS_DB.find(t => t.id === 'center-avacha')!;
  }

  return {
    airport_to_city: airport_transfer,
    city_to_tour: tour_transfer,
    total_cost: airport_transfer.price_rub + tour_transfer.price_rub,
  };
}

/**
 * Получить полную логистику (туда + обратно)
 */
export function estimateLogisticsCost(activity_type?: string): {
  outbound: number;
  return_trip: number;
  total: number;
} {
  const rec = recommendTransfers(activity_type);
  return {
    outbound: rec.airport_to_city.price_rub + rec.city_to_tour.price_rub,
    return_trip: rec.airport_to_city.price_rub + rec.city_to_tour.price_rub,
    total: (rec.airport_to_city.price_rub + rec.city_to_tour.price_rub) * 2,
  };
}
