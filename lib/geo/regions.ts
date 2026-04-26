/**
 * Регионы Камчатки для офлайн-скачивания.
 * Координаты bbox — приближённые, уточняются по мере сбора геоданных.
 */

export type RegionId =
  | 'avacha-group'       // Авачинский, Корякский, Козельский
  | 'mutnovsky-gorely'   // Мутновский, Горелый, Опала
  | 'nalychevo'          // Налычево парк
  | 'klyuchevskoy'       // Ключевская группа, Толбачик
  | 'south-kamchatka'    // Курильское озеро, Ходутка
  | 'paratunka'          // Паратунка, Малки, термы юг
  | 'esso-bystrinsky'    // Эссо, Быстринский парк, центр
  | 'kronotsky'          // Кроноцкий заповедник, Долина гейзеров
  | 'commander-islands'  // Командорские острова
  | 'central-volcanoes'; // Жупановский, Карымский, Узон

export interface RegionBbox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface Region {
  id: RegionId;
  name: string;
  shortDescription: string;
  bbox: RegionBbox;
  center: { lat: number; lng: number };
  defaultZoom: number;
  /** Приблизительный размер региона при скачивании (тайлы + данные), для отображения ДО скачивания */
  estimatedSizeRange: string;
  /** Приблизительное число маршрутов в регионе, для отображения ДО скачивания */
  estimatedRoutes: number;
}

export const REGIONS: Record<RegionId, Region> = {
  'avacha-group': {
    id: 'avacha-group',
    name: 'Авачинская группа',
    shortDescription: 'Авачинский, Корякский и Козельский вулканы — самый популярный треккинговый район рядом с Петропавловском.',
    bbox: { south: 52.8, west: 158.4, north: 53.6, east: 159.4 },
    center: { lat: 53.26, lng: 158.83 },
    defaultZoom: 10,
    estimatedSizeRange: '5-15 MB',
    estimatedRoutes: 41,
  },

  'mutnovsky-gorely': {
    id: 'mutnovsky-gorely',
    name: 'Мутновский и Горелый',
    shortDescription: 'Вулканы Мутновский (фумаролы, кратеры) и Горелый, Опала — юго-западный вулканический пояс.',
    bbox: { south: 52.2, west: 157.8, north: 53.1, east: 158.8 },
    center: { lat: 52.45, lng: 158.19 },
    defaultZoom: 10,
    estimatedSizeRange: '5-15 MB',
    estimatedRoutes: 85,
  },

  'nalychevo': {
    id: 'nalychevo',
    name: 'Налычево',
    shortDescription: 'Природный парк Налычево — горячие источники, вулканические ландшафты, маршруты от 2 до 7 дней.',
    bbox: { south: 53.1, west: 158.7, north: 53.9, east: 159.9 },
    center: { lat: 53.52, lng: 159.2 },
    defaultZoom: 10,
    estimatedSizeRange: '5-15 MB',
    estimatedRoutes: 95,
  },

  'klyuchevskoy': {
    id: 'klyuchevskoy',
    name: 'Ключевская группа',
    shortDescription: 'Ключевской — самый высокий действующий вулкан Евразии, Безымянный, Толбачик, Камень.',
    bbox: { south: 55.5, west: 159.8, north: 56.8, east: 161.5 },
    center: { lat: 56.07, lng: 160.64 },
    defaultZoom: 9,
    estimatedSizeRange: '10-25 MB',
    estimatedRoutes: 70,
  },

  'south-kamchatka': {
    id: 'south-kamchatka',
    name: 'Южная Камчатка',
    shortDescription: 'Курильское озеро с медведями, вулкан Ильинский, Ходутка — заповедный юг полуострова.',
    bbox: { south: 51.0, west: 156.8, north: 52.4, east: 158.5 },
    center: { lat: 51.5, lng: 157.4 },
    defaultZoom: 9,
    estimatedSizeRange: '10-30 MB',
    estimatedRoutes: 55,
  },

  'paratunka': {
    id: 'paratunka',
    name: 'Паратунка и Малки',
    shortDescription: 'Термальные курорты Паратунки, источники Малки — отдых после маршрутов, спа-зоны.',
    bbox: { south: 52.6, west: 157.8, north: 53.2, east: 158.6 },
    center: { lat: 52.9, lng: 158.17 },
    defaultZoom: 10,
    estimatedSizeRange: '3-10 MB',
    estimatedRoutes: 40,
  },

  'esso-bystrinsky': {
    id: 'esso-bystrinsky',
    name: 'Эссо и Быстринский парк',
    shortDescription: 'Посёлок Эссо, Быстринский природный парк — центральная Камчатка, маршруты к вулканам Ичинский, Хангар.',
    bbox: { south: 55.4, west: 157.5, north: 56.8, east: 159.5 },
    center: { lat: 55.93, lng: 158.7 },
    defaultZoom: 9,
    estimatedSizeRange: '15-40 MB',
    estimatedRoutes: 60,
  },

  'kronotsky': {
    id: 'kronotsky',
    name: 'Кроноцкий заповедник',
    shortDescription: 'Долина гейзеров, Кальдера Узона, Кроноцкое озеро — объект UNESCO, только вертолётный доступ.',
    bbox: { south: 53.8, west: 159.9, north: 55.0, east: 162.0 },
    center: { lat: 54.45, lng: 160.6 },
    defaultZoom: 9,
    estimatedSizeRange: '15-45 MB',
    estimatedRoutes: 45,
  },

  'commander-islands': {
    id: 'commander-islands',
    name: 'Командорские острова',
    shortDescription: 'Остров Беринга, котики, птичьи базары — отдалённый архипелаг в Беринговом море.',
    bbox: { south: 54.5, west: 165.5, north: 56.0, east: 167.5 },
    center: { lat: 55.2, lng: 166.3 },
    defaultZoom: 9,
    estimatedSizeRange: '10-25 MB',
    estimatedRoutes: 20,
  },

  'central-volcanoes': {
    id: 'central-volcanoes',
    name: 'Центральные вулканы',
    shortDescription: 'Жупановский, Карымский, Узон — активные вулканы Восточного хребта, специализированные экспедиции.',
    bbox: { south: 53.9, west: 159.0, north: 55.0, east: 160.8 },
    center: { lat: 54.05, lng: 159.44 },
    defaultZoom: 9,
    estimatedSizeRange: '10-30 MB',
    estimatedRoutes: 35,
  },
};

/** Список всех регионов как массив */
export const REGIONS_LIST: Region[] = Object.values(REGIONS);

/**
 * Возвращает маршруты из массива, координаты которых попадают в bbox региона.
 */
export function getRoutesInBbox<T extends { lat: number; lng: number }>(
  routes: T[],
  bbox: RegionBbox
): T[] {
  return routes.filter(
    (r) =>
      r.lat >= bbox.south &&
      r.lat <= bbox.north &&
      r.lng >= bbox.west &&
      r.lng <= bbox.east
  );
}

/**
 * Определяет, в каком регионе находится точка (первое совпадение).
 */
export function getRegionForPoint(lat: number, lng: number): Region | undefined {
  return REGIONS_LIST.find(
    (r) =>
      lat >= r.bbox.south &&
      lat <= r.bbox.north &&
      lng >= r.bbox.west &&
      lng <= r.bbox.east
  );
}
