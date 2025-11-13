/**
 * Типы данных для Agent Panel
 * Агенты - посредники, продающие туры за комиссию
 */

// Метрики агента
export interface AgentMetrics {
  totalClients: number;
  activeClients: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalCommission: number;
  pendingCommission: number;
  averageBookingValue: number;
  conversionRate: number;
}

// Клиент агента
export interface AgentClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  totalBookings: number;
  totalSpent: number;
  lastBooking: Date;
  status: 'active' | 'inactive' | 'prospect';
  notes?: string;
  tags: string[];
  source: 'direct' | 'referral' | 'social' | 'advertising' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

// Бронирование через агента
export interface AgentBooking {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  tourId: string;
  tourName: string;
  tourOperator: string;
  bookingDate: Date;
  tourDate: Date;
  guestsCount: number;
  totalPrice: number;
  agentCommission: number;
  commissionStatus: 'pending' | 'paid' | 'cancelled';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Ваучер (скидочный купон)
export interface Voucher {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  validFrom: Date;
  validTo: Date;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  applicableTours: string[]; // tour IDs или ['all']
  applicableClients: string[]; // client IDs или ['all']
  createdBy: string; // agent ID
  createdAt: Date;
  updatedAt: Date;
}

// Использование ваучера
export interface VoucherUsage {
  id: string;
  voucherId: string;
  voucherCode: string;
  bookingId: string;
  clientId: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  usedAt: Date;
}

// Комиссионные агента
export interface AgentCommission {
  id: string;
  agentId: string;
  bookingId: string;
  amount: number;
  rate: number; // процент комиссии
  status: 'pending' | 'paid' | 'cancelled';
  paidAt?: Date;
  payoutReference?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Платеж комиссионных
export interface CommissionPayout {
  id: string;
  agentId: string;
  agentName: string;
  totalAmount: number;
  commissions: AgentCommission[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod: 'bank_transfer' | 'card' | 'cash';
  payoutDate?: Date;
  completedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Отчёт агента
export interface AgentReport {
  period: {
    start: Date;
    end: Date;
  };
  metrics: AgentMetrics;
  topClients: {
    clientId: string;
    clientName: string;
    bookingsCount: number;
    revenue: number;
    commission: number;
  }[];
  revenueByMonth: {
    date: string;
    revenue: number;
    commission: number;
  }[];
  bookingsByStatus: {
    status: string;
    count: number;
    percentage: number;
  }[];
  commissionByStatus: {
    status: string;
    amount: number;
    count: number;
  }[];
  voucherPerformance: {
    voucherId: string;
    voucherName: string;
    usedCount: number;
    totalDiscount: number;
    revenueGenerated: number;
  }[];
}

// Dashboard данные агента
export interface AgentDashboardData {
  metrics: AgentMetrics;
  recentBookings: AgentBooking[];
  recentClients: AgentClient[];
  upcomingBookings: {
    id: string;
    clientName: string;
    tourName: string;
    tourDate: Date;
    totalPrice: number;
    commission: number;
  }[];
  revenueChart: {
    date: string;
    revenue: number;
    commission: number;
  }[];
  commissionChart: {
    date: string;
    amount: number;
  }[];
  pendingCommissions: CommissionPayout[];
}

// Форма создания клиента
export interface ClientFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'active' | 'inactive' | 'prospect';
  notes?: string;
  tags: string[];
  source: 'direct' | 'referral' | 'social' | 'advertising' | 'other';
}

// Форма создания ваучера
export interface VoucherFormData {
  name: string;
  description: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  validFrom: Date;
  validTo: Date;
  usageLimit?: number;
  applicableTours: string[];
  applicableClients: string[];
}

// Форма создания бронирования
export interface AgentBookingFormData {
  clientId: string;
  tourId: string;
  tourDate: Date;
  guestsCount: number;
  specialRequests?: string;
  voucherCode?: string;
  notes?: string;
}

// Статистика по турам для агента
export interface AgentTourStats {
  tourId: string;
  tourName: string;
  tourOperator: string;
  bookingsCount: number;
  revenue: number;
  commission: number;
  averageBookingValue: number;
  conversionRate: number;
}

// Настройки агента
export interface AgentSettings {
  id: string;
  agentId: string;
  defaultCommissionRate: number;
  notificationPreferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    bookingConfirmations: boolean;
    paymentReminders: boolean;
    commissionAlerts: boolean;
  };
  autoAssignVouchers: boolean;
  defaultVoucherSettings: {
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    validDays: number;
  };
  updatedAt: Date;
}

