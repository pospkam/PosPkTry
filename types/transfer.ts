// =============================================
// ТИПЫ ДЛЯ СИСТЕМЫ ТРАНСФЕРОВ
// Kamchatour Hub - Transfer System Types
// =============================================

export interface TransferRoute {
  id: string;
  name: string;
  fromLocation: string;
  toLocation: string;
  fromCoordinates: {
    lat: number;
    lng: number;
  };
  toCoordinates: {
    lat: number;
    lng: number;
  };
  distanceKm: number;
  estimatedDurationMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferVehicle {
  id: string;
  operatorId: string;
  vehicleType: 'economy' | 'comfort' | 'business' | 'minibus' | 'bus';
  make: string;
  model: string;
  year: number;
  capacity: number;
  features: string[]; // ['wifi', 'air_conditioning', 'child_seat', 'wheelchair_accessible']
  licensePlate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferDriver {
  id: string;
  operatorId: string;
  name: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  languages: string[]; // ['ru', 'en', 'zh', 'ja']
  rating: number;
  totalTrips: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferSchedule {
  id: string;
  routeId: string;
  vehicleId: string;
  driverId: string;
  departureTime: string; // HH:MM format
  arrivalTime: string; // HH:MM format
  pricePerPerson: number;
  availableSeats: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferBooking {
  id: string;
  userId: string;
  operatorId: string;
  routeId: string;
  vehicleId: string;
  driverId: string;
  scheduleId: string;
  bookingDate: string; // YYYY-MM-DD format
  departureTime: string; // HH:MM format
  passengersCount: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'in_progress';
  specialRequests?: string;
  contactPhone: string;
  contactEmail: string;
  confirmationCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferStop {
  id: string;
  routeId: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address?: string;
  stopOrder: number;
  isPickup: boolean;
  isDropoff: boolean;
  createdAt: Date;
}

export interface TransferReview {
  id: string;
  bookingId: string;
  userId: string;
  driverId: string;
  vehicleId: string;
  rating: number; // 1-5
  comment?: string;
  isVerified: boolean;
  createdAt: Date;
}

export interface TransferNotification {
  id: string;
  bookingId: string;
  userId: string;
  operatorId: string;
  type: 'booking_created' | 'booking_confirmed' | 'booking_cancelled' | 'reminder';
  title: string;
  message: string;
  isRead: boolean;
  sentAt?: Date;
  createdAt: Date;
}

// =============================================
// КОМПЛЕКСНЫЕ ТИПЫ ДЛЯ API
// =============================================

export interface TransferSearchRequest {
  from: string;
  to: string;
  date: string; // YYYY-MM-DD
  passengers: number;
  vehicleType?: 'economy' | 'comfort' | 'business' | 'minibus' | 'bus';
  budgetMin?: number;
  budgetMax?: number;
  features?: string[]; // ['wifi', 'air_conditioning', 'child_seat', 'wheelchair_accessible']
  languages?: string[]; // ['ru', 'en', 'zh', 'ja']
}

export interface TransferSearchResponse {
  success: boolean;
  data?: {
    availableTransfers: TransferOption[];
    totalCount: number;
    searchMetadata: SearchMetadata;
  };
  error?: string;
}

export interface TransferOption {
  scheduleId: string;
  route: TransferRoute;
  vehicle: TransferVehicle;
  driver: TransferDriver;
  departureTime: string;
  arrivalTime: string;
  pricePerPerson: number;
  totalPrice: number;
  availableSeats: number;
  features: string[];
  languages: string[];
  operator: {
    id: string;
    name: string;
    phone: string;
    email: string;
    rating: number;
  };
  stops: TransferStop[];
}

export interface SearchMetadata {
  searchId: string;
  searchTime: Date;
  resultsCount: number;
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
  searchDuration: number; // milliseconds
}

export interface TransferBookingRequest {
  scheduleId: string;
  passengersCount: number;
  contactInfo: {
    phone: string;
    email: string;
    name?: string;
  };
  specialRequests?: string;
  passengerDetails?: {
    name: string;
    phone?: string;
    email?: string;
  }[];
  // Поля для интеллектуального сопоставления
  fromCoordinates?: {
    lat: number;
    lng: number;
  };
  toCoordinates?: {
    lat: number;
    lng: number;
  };
  departureDate?: string;
  vehicleType?: 'economy' | 'comfort' | 'business' | 'minibus' | 'bus';
  budgetMax?: number;
  features?: string[];
  languages?: string[];
}

export interface TransferBookingResponse {
  success: boolean;
  data?: {
    bookingId: string;
    status: string;
    confirmationCode: string;
    totalPrice: number;
    bookingDetails: TransferBooking;
  };
  error?: string;
}

export interface TransferConfirmationRequest {
  bookingId: string;
  action: 'confirm' | 'reject';
  message?: string;
}

export interface TransferConfirmationResponse {
  success: boolean;
  data?: {
    bookingId: string;
    newStatus: string;
    message: string;
  };
  error?: string;
}

// =============================================
// ТИПЫ ДЛЯ ДАШБОРДОВ
// =============================================

export interface TransferOperatorStats {
  totalVehicles: number;
  totalDrivers: number;
  totalRoutes: number;
  totalSchedules: number;
  totalBookings: number;
  totalRevenue: number;
  averageDriverRating: number;
  activeBookings: number;
  pendingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
}

export interface TransferOperatorDashboard {
  stats: TransferOperatorStats;
  activeBookings: TransferBooking[];
  vehicles: TransferVehicle[];
  drivers: TransferDriver[];
  routes: TransferRoute[];
  recentBookings: TransferBooking[];
  upcomingSchedules: TransferSchedule[];
  notifications: TransferNotification[];
}

// =============================================
// ТИПЫ ДЛЯ ФИЛЬТРОВ И СОРТИРОВКИ
// =============================================

export interface TransferFilters {
  vehicleType?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  features?: string[];
  languages?: string[];
  departureTime?: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
  rating?: {
    min: number;
    max: number;
  };
}

export interface TransferSortOptions {
  field: 'price' | 'departureTime' | 'duration' | 'rating' | 'availableSeats';
  direction: 'asc' | 'desc';
}

// =============================================
// ТИПЫ ДЛЯ УВЕДОМЛЕНИЙ
// =============================================

export interface TransferNotificationTemplate {
  type: string;
  title: string;
  message: string;
  smsTemplate?: string;
  emailTemplate?: string;
  telegramTemplate?: string;
}

export interface TransferNotificationRequest {
  bookingId: string;
  userId: string;
  operatorId: string;
  type: string;
  data: Record<string, unknown>;
}

// =============================================
// ТИПЫ ДЛЯ АНАЛИТИКИ
// =============================================

export interface TransferAnalytics {
  period: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  metrics: {
    totalBookings: number;
    totalRevenue: number;
    averageBookingValue: number;
    conversionRate: number;
    cancellationRate: number;
    customerSatisfaction: number;
  };
  trends: {
    bookings: TimeSeriesData[];
    revenue: TimeSeriesData[];
    cancellations: TimeSeriesData[];
  };
  topRoutes: {
    routeId: string;
    routeName: string;
    bookings: number;
    revenue: number;
  }[];
  topVehicles: {
    vehicleId: string;
    vehicleName: string;
    bookings: number;
    revenue: number;
  }[];
  topDrivers: {
    driverId: string;
    driverName: string;
    bookings: number;
    rating: number;
  }[];
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

// =============================================
// ТИПЫ ДЛЯ ИНТЕГРАЦИЙ
// =============================================

export interface TransferIntegration {
  provider: 'yandex_taxi' | 'uber' | 'bolt' | 'local_provider';
  apiKey: string;
  webhookUrl?: string;
  isActive: boolean;
  settings: Record<string, unknown>;
}

export interface TransferWebhookPayload {
  event: 'booking_created' | 'booking_confirmed' | 'booking_cancelled' | 'booking_completed';
  bookingId: string;
  data: TransferBooking;
  timestamp: Date;
  signature: string;
}

// =============================================
// ТИПЫ ДЛЯ МОБИЛЬНОГО ПРИЛОЖЕНИЯ
// =============================================

export interface TransferLocation {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
  timestamp: Date;
}

export interface TransferTracking {
  bookingId: string;
  driverLocation: TransferLocation;
  estimatedArrival: Date;
  status: 'waiting' | 'on_way' | 'arrived' | 'in_progress' | 'completed';
  lastUpdated: Date;
}

export interface TransferEmergency {
  bookingId: string;
  emergencyType: 'accident' | 'breakdown' | 'delay' | 'other';
  description: string;
  location: TransferLocation;
  reportedAt: Date;
  status: 'reported' | 'acknowledged' | 'resolved';
}

// =============================================
// ЭКСПОРТ ВСЕХ ТИПОВ
// =============================================

// Все типы уже экспортированы выше через export interface
// Дополнительные экспорты не нужны