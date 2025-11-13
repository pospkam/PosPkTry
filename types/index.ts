// Основные типы для Kamchatour Hub

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'tourist' | 'operator' | 'guide' | 'transfer' | 'agent' | 'admin';
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  interests: string[];
  budget: {
    min: number;
    max: number;
  };
  difficulty: 'easy' | 'medium' | 'hard';
  season: Season[];
  groupSize: number;
}

export interface Tour {
  id: string;
  title: string;
  description: string;
  activity: string;
  duration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  priceFrom: number;
  priceTo: number;
  maxParticipants: number;
  minParticipants: number;
  weatherRequirements?: string;
  safetyRequirements?: string;
  equipmentIncluded: string[];
  equipmentRequired: string[];
  meetingPoint?: string;
  meetingTime?: string;
  images: string[];
  rating: number;
  reviewsCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  operator: {
    id: string;
    name: string;
    rating: number;
    phone: string;
    email: string;
  };
}

export interface Partner {
  id: string;
  name: string;
  category: 'operator' | 'guide' | 'transfer' | 'stay' | 'souvenir' | 'gear' | 'cars' | 'restaurant';
  description: string;
  contact: ContactInfo;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  logo?: Asset;
  images: Asset[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactInfo {
  phone: string;
  email: string;
  website?: string;
  telegram?: string;
  whatsapp?: string;
  address?: string;
}

export interface Asset {
  id: string;
  url: string;
  mimeType: string;
  sha256: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  createdAt: Date;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  address?: string;
  name?: string;
}

export interface Booking {
  id: string;
  userId: string;
  tourId: string;
  tour: Tour;
  date: Date;
  participants: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  specialRequests?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  userId: string;
  tourId: string;
  rating: number;
  comment: string;
  images: Asset[];
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Weather {
  location: string;
  temperature: number;
  feelsLike: number; // Ощущается как
  condition: string;
  conditionText: string; // Описание на русском
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGust?: number; // Порывы ветра
  pressure: number;
  visibility: number;
  uvIndex: number;
  cloudCover: number; // Облачность %
  dewPoint?: number; // Точка росы
  sunrise?: string; // Время восхода
  sunset?: string; // Время заката
  moonPhase?: string; // Фаза луны
  forecast: WeatherForecast[];
  hourlyForecast?: WeatherHourly[]; // Почасовой прогноз
  alerts?: WeatherAlert[]; // Метеоалерты
  lastUpdated: Date;
  safetyLevel: 'excellent' | 'good' | 'moderate' | 'difficult' | 'dangerous';
  recommendations: string[];
  clothingAdvice: string[]; // Рекомендации по одежде
  tourAdvice: string; // Совет для туристов
  comfortIndex: number; // Индекс комфорта 0-100
}

export interface WeatherForecast {
  date: Date;
  temperature: {
    min: number;
    max: number;
  };
  condition: string;
  conditionText: string;
  precipitation: number;
  precipitationProbability: number; // Вероятность осадков %
  windSpeed: number;
  humidity: number;
  sunrise?: string;
  sunset?: string;
}

export interface WeatherHourly {
  time: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
  humidity: number;
}

export interface WeatherAlert {
  event: string; // Тип события
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  urgency: 'immediate' | 'expected' | 'future';
  description: string;
  start: Date;
  end: Date;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface EcoPoint {
  id: string;
  name: string;
  description: string;
  coordinates: GeoPoint;
  category: 'recycling' | 'cleaning' | 'conservation' | 'education';
  points: number;
  isActive: boolean;
  createdAt: Date;
}

export interface UserEcoPoints {
  userId: string;
  totalPoints: number;
  level: number;
  achievements: EcoAchievement[];
  lastActivity: Date;
}

export interface EcoAchievement {
  id: string;
  name: string;
  description: string;
  points: number;
  unlockedAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// AI Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context: {
    location?: GeoPoint;
    preferences?: UserPreferences;
    currentTour?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// GUIDE TYPES
export interface GuideSchedule {
  id: string;
  guideId: string;
  tourId: string;
  tourDate: Date;
  startTime: string;
  endTime?: string;
  meetingPoint?: string;
  participantsCount: number;
  maxParticipants?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  weatherConditions?: any;
  safetyNotes?: string;
  specialRequirements?: string;
  createdAt: Date;
  updatedAt: Date;
  tour?: Tour;
  group?: GuideGroup;
}

export interface GuideGroup {
  id: string;
  scheduleId: string;
  groupName?: string;
  participants: any[];
  emergencyContacts: any[];
  experienceLevels: any;
  specialNeeds?: string;
  equipmentChecklist: any[];
  status: 'forming' | 'ready' | 'departed' | 'returned';
  createdAt: Date;
  updatedAt: Date;
}

export interface GuideEarnings {
  id: string;
  guideId: string;
  scheduleId?: string;
  tourId?: string;
  amount: number;
  commissionRate: number;
  commissionAmount?: number;
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  paymentDate?: Date;
  notes?: string;
  createdAt: Date;
}

// Импорт типов для трансферов
export * from './transfer';