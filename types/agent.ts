/**
 * Agent types for Kamchatour Hub
 */

export interface AgentClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  totalBookings?: number;
  totalSpent?: number;
  lastBooking?: unknown;
  status: 'prospect' | 'active' | 'inactive';
  notes?: string;
  tags: string[];
  source: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'prospect' | 'active' | 'inactive';
  notes: string;
  tags: string[];
  source: string;
}

export interface AgentBooking {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  tourId: string;
  tourName: string;
  tourOperator: string;
  bookingDate: unknown;
  tourDate: unknown;
  guestsCount: unknown;
  totalPrice: number;
  agentCommission: number;
  commissionStatus: unknown;
  status: unknown;
  paymentStatus: unknown;
  notes: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface AgentBookingFormData {
  clientId: string;
  tourId: string;
  tourDate: string;
  guestsCount: number;
  specialRequests?: string;
  voucherCode?: string;
  notes?: string;
}

export interface AgentCommission {
  id: string;
  agentId: string;
  bookingId: string;
  amount: number;
  rate: number;
  status: string;
  paidAt: unknown;
  payoutReference: unknown;
  notes?: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface CommissionPayout {
  id: string;
  agentId: string;
  agentName: string;
  totalAmount: number;
  commissions: AgentCommission[];
  status: string;
  paymentMethod: unknown;
  payoutDate: unknown;
  completedAt: unknown;
  failureReason?: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface AgentDashboardData {
  metrics: {
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
  };
  recentBookings: AgentBooking[];
  recentClients: AgentClient[];
  upcomingBookings: {
    id: string;
    clientName: string;
    tourName: string;
    tourDate: unknown;
    totalPrice: number;
    commission: number;
  }[];
  revenueChart: { date: unknown; revenue: number; commission: number }[];
  commissionChart: { date: unknown; amount: number }[];
  pendingCommissions: CommissionPayout[];
}

export interface Voucher {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: string;
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  validFrom: unknown;
  validTo: unknown;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  applicableTours: string[];
  applicableClients: string[];
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface VoucherFormData {
  name: string;
  description?: string;
  code: string;
  discountType: string;
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  validFrom: string;
  validTo: string;
  usageLimit?: number;
  applicableTours?: string[];
  applicableClients?: string[];
}
