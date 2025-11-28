// Admin Panel Types
// Типы для админ-панели

export interface DashboardMetrics {
  totalRevenue: {
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  totalBookings: {
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  activeUsers: {
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  conversionRate: {
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  averageOrderValue: {
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  growthRate: {
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface DashboardCharts {
  revenueByMonth: ChartDataPoint[];
  bookingsByCategory: {
    category: string;
    value: number;
    color: string;
  }[];
  userGrowth: ChartDataPoint[];
  topTours: {
    id: string;
    title: string;
    bookings: number;
    revenue: number;
  }[];
}

export interface RecentActivity {
  id: string;
  type: 'booking' | 'user' | 'review' | 'payment' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: Record<string, any>;
}

export interface AdminAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  charts: DashboardCharts;
  recentActivities: RecentActivity[];
  alerts: AdminAlert[];
  summary?: {
    period: number;
    lastUpdated: Date;
  };
  pendingPartners?: number;
  pendingTours?: number;
}

// User Management Types
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive' | 'blocked';
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  bookingsCount: number;
  totalSpent: number;
  avatar?: string;
}

export interface UserFilters {
  role?: string;
  status?: 'active' | 'inactive' | 'blocked';
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// Content Management Types
export interface ContentStats {
  tours: {
    total: number;
    published: number;
    draft: number;
    pending: number;
  };
  accommodations: {
    total: number;
    verified: number;
    pending: number;
  };
  partners: {
    total: number;
    verified: number;
    pending: number;
  };
  reviews: {
    total: number;
    pending: number;
    flagged: number;
  };
}

// Finance Types
export interface Transaction {
  id: string;
  type: 'booking' | 'refund' | 'payout' | 'fee';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  userId?: string;
  userName?: string;
  bookingId?: string;
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface PayoutRequest {
  id: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  processedAt?: Date;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
}

export interface FinanceReport {
  period: {
    start: Date;
    end: Date;
  };
  revenue: {
    total: number;
    byCategory: Record<string, number>;
    byMonth: ChartDataPoint[];
  };
  expenses: {
    total: number;
    payouts: number;
    fees: number;
    refunds: number;
  };
  profit: number;
  profitMargin: number;
}



