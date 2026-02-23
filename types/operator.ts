/**
 * Типы данных для Operator Panel
 */

// Метрики оператора
export interface OperatorMetrics {
  totalTours: number;
  activeTours: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageRating: number;
  totalReviews: number;
}

// Статистика по турам
export interface TourStats {
  id: string;
  tourId: string;
  tourName: string;
  bookingsCount: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
  completionRate: number;
}

// Бронирование (детальное)
export interface OperatorBooking {
  id: string;
  tourId: string;
  tourName: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  date: Date;
  guestsCount: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

// График данных
export interface ChartDataPoint {
  date: string;
  value: number;
  label: string;
  color?: string;
}

// Финансовые данные
export interface FinanceData {
  totalRevenue: number;
  pendingPayouts: number;
  completedPayouts: number;
  commission: number;
  netIncome: number;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  type: 'booking' | 'payout' | 'refund' | 'commission';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  date: Date;
  description: string;
  bookingId?: string;
}

// Календарь доступности
export interface AvailabilitySlot {
  date: Date;
  tourId: string;
  maxCapacity: number;
  bookedCount: number;
  availableSpots: number;
  isBlocked: boolean;
  price?: number;
}

// Клиент
export interface OperatorClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalBookings: number;
  totalSpent: number;
  lastBooking: Date;
  notes?: string;
}

// Отчёт
export interface OperatorReport {
  period: {
    start: Date;
    end: Date;
  };
  metrics: OperatorMetrics;
  topTours: TourStats[];
  revenueByMonth: ChartDataPoint[];
  bookingsByStatus: {
    status: string;
    count: number;
    percentage: number;
  }[];
}

// Dashboard данные
export interface OperatorDashboardData {
  metrics: OperatorMetrics;
  recentBookings: OperatorBooking[];
  topTours: TourStats[];
  revenueChart: ChartDataPoint[];
  bookingsChart: ChartDataPoint[];
  upcomingTours: {
    tourId: string;
    tourName: string;
    date: Date;
    bookingsCount: number;
    capacity: number;
  }[];
}

// Тур оператора (расширенный)
export interface OperatorTour {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  maxGroupSize: number;
  minGroupSize: number;
  price: number;
  currency: string;
  isActive: boolean;
  images: string[];
  includes: string[];
  excludes: string[];
  itinerary: {
    day: number;
    title: string;
    description: string;
    activities: string[];
  }[];
  schedule: {
    startDate: Date;
    endDate?: Date;
    daysOfWeek?: number[];
    timeSlots?: string[];
  };
  rating: number;
  reviewCount: number;
  bookingsCount: number;
  totalRevenue: number;
  createdAt: Date;
  updatedAt: Date;
}

// Форма создания/редактирования тура
export interface TourFormData {
  name: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  maxGroupSize: number;
  minGroupSize: number;
  price: number;
  currency: string;
  includes: string[];
  excludes: string[];
  itinerary: {
    day: number;
    title: string;
    description: string;
    activities: string[];
  }[];
  images: File[] | string[];
}



