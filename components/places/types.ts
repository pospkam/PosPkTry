export interface PlaceSafety {
  difficultyLevel: number | null;
  altitudeM: number | null;
  altitudeDiffM: number | null;
  distanceKm: number | null;
  terrainType: string | null;
  roadType: string | null;
  roadAccessibility: number | null;
  nearestMedicalKm: number | null;
  emergencyAccess: string | null;
  phoneRangerMches: string | null;
  satCommunicatorRequired: boolean | null;
  rulesRequired: string | null;
  weatherThreshold: Record<string, unknown> | null;
  hazardTypes: string[];
  capacityPerDay: number | null;
  optimalGroupSize: number | null;
  openFromDate: string | null;
  openToDate: string | null;
  requiredGear: string[];
  connectivity: Record<string, unknown> | null;
  registrationRequired: boolean;
  medicalInfo: string | null;
}

export interface PlaceRealtime {
  isOpen: boolean | null;
  currentCrowds: number | null;
  currentWeather: Record<string, unknown> | null;
  activeAlerts: string[] | null;
  alertSeverity: number | null;
  alertMessage: string | null;
  touristsToday: number | null;
  touristsHour: number | null;
  updatedAt: string | null;
}

export interface PlaceRoute {
  id: string;
  title: string;
  activityType: string | null;
  difficulty: string | null;
  distanceKm: number | null;
  durationHours: number | null;
}

export interface NearbyPlace {
  id: string;
  name: string;
  locationType: string | null;
  lat: number;
  lng: number;
  distanceKm: number;
  thumbUrl: string | null;
}

export interface PlaceData {
  id: string;
  name: string;
  description: string | null;
  essence: string | null;
  category: string | null;
  locationType: string | null;
  lat: number;
  lng: number;
  zone: string | null;
  district: string | null;
  photoUrl: string | null;
  images: unknown[];
  photoCount: number;
  bestSeason: string | null;
  seasonalNotes: Record<string, string> | null;
  accessInfo: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  updatedAt: string | null;
  safety: PlaceSafety;
  realtime: PlaceRealtime | null;
  routes: PlaceRoute[];
  nearby: NearbyPlace[];
}

export const LOCATION_TYPE_LABELS: Record<string, string> = {
  volcano: 'Вулкан',
  geyser: 'Гейзерное поле',
  hot_spring: 'Термальный источник',
  lake: 'Озеро',
  mountain: 'Горный массив',
  river: 'Река',
  bay: 'Бухта',
  cape: 'Мыс',
  island: 'Остров',
  forest: 'Природный парк',
  beach: 'Пляж',
  waterfall: 'Водопад',
  rock: 'Скала',
  viewpoint: 'Смотровая площадка',
  settlement: 'Населённый пункт',
  museum: 'Музей',
  historical: 'Историческое место',
  glacier: 'Ледник',
  thermal: 'Термальная зона',
  other: 'Место',
};

export const HAZARD_LABELS: Record<string, { label: string; icon: string }> = {
  bears: { label: 'Медведи', icon: '🐻' },
  wildlife: { label: 'Дикие животные', icon: '🦊' },
  avalanche: { label: 'Лавины', icon: '🏔' },
  rockfall: { label: 'Камнепад', icon: '🪨' },
  thermal: { label: 'Термальные зоны', icon: '♨️' },
  volcanic_gas: { label: 'Вулканические газы', icon: '💨' },
  altitude: { label: 'Высота', icon: '⛰' },
  river_crossing: { label: 'Переправы', icon: '🌊' },
  fog: { label: 'Туман', icon: '🌫' },
  ice: { label: 'Лёд', icon: '🧊' },
  no_signal: { label: 'Нет связи', icon: '📵' },
  weather: { label: 'Резкая погода', icon: '⛈' },
};

export const DIFFICULTY_LABELS = ['', 'Лёгкий', 'Ниже среднего', 'Средний', 'Сложный', 'Экстремальный'];
