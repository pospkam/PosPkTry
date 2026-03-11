/**
 * Typed interfaces for PostgreSQL query results.
 * Usage: await query<UsersRow>('SELECT ...', params)
 *
 * Note: numeric/decimal columns come back as `string` from pg driver.
 * Use Number() / parseFloat() / parseInt() at the call site.
 */

// ──────────────────────────────────────────────────────────
// Generic helpers
// ──────────────────────────────────────────────────────────

/** Simple COUNT(*) result */
export interface CountRow {
  count: string;
}

/** Simple total / revenue aggregation */
export interface TotalRow {
  total: string;
}

export interface RevenueRow {
  revenue: string;
}

// ──────────────────────────────────────────────────────────
// Auth / Users
// ──────────────────────────────────────────────────────────

export interface UsersRow {
  id: string;
  email: string;
  name: string;
  role: string;
  password_hash: string;
  preferences: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface UsersAdminRow extends Omit<UsersRow, 'password_hash'> {
  bookings_count: string;
  total_spent: string;
}

export interface UsersCreateRow {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: Date;
}

// ──────────────────────────────────────────────────────────
// Admin Dashboard
// ──────────────────────────────────────────────────────────

export interface DashboardMetricsRow {
  current_bookings: string;
  previous_bookings: string;
  current_revenue: string;
  previous_revenue: string;
  current_users: string;
  previous_users: string;
  total_users: string;
  users_with_bookings: string;
  conversion_rate: string;
}

export interface RevenueChartRow {
  month: Date;
  revenue: string;
}

export interface CategoryCountRow {
  category: string;
  count: string;
}

export interface UserGrowthRow {
  date: Date;
  count: string;
}

export interface TopTourRow {
  id: string;
  title: string;
  bookings: string;
  revenue: string;
}

export interface ActivityRow {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  user_id: string | null;
  user_name: string | null;
  user_avatar: string | null;
}

// ──────────────────────────────────────────────────────────
// Admin Stats
// ──────────────────────────────────────────────────────────

export interface RoleCountRow {
  role: string;
  count: string;
}

export interface DailyCountRow {
  date: Date;
  count: string;
}

export interface DailyRevenueRow {
  date: Date;
  revenue: string;
}

export interface TopTourStatsRow {
  id: string;
  name: string;
  bookings: string;
}

export interface TopOperatorRow {
  id: string;
  name: string;
  revenue: string;
  bookings: string;
}

// ──────────────────────────────────────────────────────────
// Admin Bookings
// ──────────────────────────────────────────────────────────

export interface BookingAdminRow {
  id: string;
  date: Date;
  participants: number;
  total_price: string;
  status: string;
  payment_status: string;
  special_requests: string | null;
  created_at: Date;
  updated_at: Date;
  tour_name: string;
  user_name: string;
  user_email: string;
}

// ──────────────────────────────────────────────────────────
// Admin Finance
// ──────────────────────────────────────────────────────────

export interface FinanceMetricsRow {
  total_transactions: string;
  total_revenue: string;
  avg_transaction: string;
  unique_customers: string;
}

export interface DailyFinanceRow {
  date: Date;
  transactions: string;
  revenue: string;
}

export interface RevenueByTypeRow {
  booking_type: string;
  transactions: string;
  revenue: string;
}

export interface PendingPayoutsRow {
  pending_count: string;
  pending_amount: string;
}

export interface RecentTransactionRow {
  id: string;
  amount: string;
  currency: string;
  status: string;
  created_at: Date;
  booking_type: string;
  service_name: string | null;
  customer_name: string | null;
}

// ──────────────────────────────────────────────────────────
// Admin Finance Payouts
// ──────────────────────────────────────────────────────────

export interface PayoutAdminRow {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_email: string;
  booking_id: string;
  booking_type: string;
  service_name: string;
  amount: string;
  currency: string;
  status: string;
  created_at: Date;
  completed_at: Date | null;
  failure_reason: string | null;
}

export interface PayoutStatsRow {
  total_payouts: string;
  completed_payouts: string;
  pending_payouts: string;
  total_paid: string;
  pending_amount: string;
}

export interface PayoutCreateRow {
  id: string;
  status: string;
  created_at: Date;
}

// ──────────────────────────────────────────────────────────
// Admin Tours
// ──────────────────────────────────────────────────────────

export interface TourAdminRow {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  duration: number;
  price: string;
  currency: string;
  operator_id: string;
  is_active: boolean;
  rating: string;
  review_count: string;
  created_at: Date;
  updated_at: Date;
  operator_name: string | null;
  images: (string | null)[];
  bookings_count: string;
}

export interface TourUpdateRow {
  id: string;
  name: string;
  is_active: boolean;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────────
// Admin Content: Partners
// ──────────────────────────────────────────────────────────

export interface PartnerAdminRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  contact: Record<string, unknown> | null;
  rating: string;
  review_count: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  logo_url: string | null;
}

// ──────────────────────────────────────────────────────────
// Admin Content: Reviews
// ──────────────────────────────────────────────────────────

export interface ReviewAdminRow {
  id: string;
  user_id: string;
  tour_id: string;
  rating: string;
  comment: string | null;
  is_verified: boolean;
  created_at: Date;
  user_name: string | null;
  tour_name: string | null;
}

// ──────────────────────────────────────────────────────────
// Admin Settings
// ──────────────────────────────────────────────────────────

export interface SystemSettingRow {
  key: string;
  value: string;
  description: string | null;
  category: string;
  updated_at: Date;
}

export interface EmailTemplateRow {
  id: string;
  name: string;
  subject: string;
  type: string;
  html_content: string;
  text_content: string;
  variables: string; // JSON string → parse to string[]
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface EmailTemplateCreateRow {
  id: string;
  created_at: Date;
}

export interface EmailTemplateUpdateRow {
  id: string;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────────
// Admin Operators
// ──────────────────────────────────────────────────────────

export interface OperatorVerifyRow {
  id: string;
  user_id: string;
  company_name: string;
  company_inn: string;
  company_address: string;
  website: string | null;
  description: string | null;
  verification_status: string;
  created_at: Date;
  email: string;
  name: string;
  phone: string | null;
}

export interface OperatorActionRow {
  id: string;
  user_id: string;
  company_name: string;
  verification_status: string;
  email: string;
  name: string;
}

// ──────────────────────────────────────────────────────────
// Admin Users [id]
// ──────────────────────────────────────────────────────────

export interface UserDetailRow {
  id: string;
  email: string;
  name: string;
  role: string;
  preferences: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date | null;
  bookings_count: string;
  total_spent: string;
}

export interface UserCheckRow {
  id: string;
  role: string;
}

export interface UserUpdateRow {
  id: string;
  email: string;
  name: string;
  role: string;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────────
// Bookings (user-facing)
// ──────────────────────────────────────────────────────────

export interface BookingMyRow {
  id: string;
  date: Date;
  participants: number;
  total_price: string;
  status: string;
  payment_status: string;
  special_requests: string | null;
  created_at: Date;
  updated_at: Date;
  tour_id: string;
  tour_name: string;
  tour_description: string | null;
  tour_difficulty: string | null;
  tour_duration: number | null;
  tour_images: (string | null)[] | null;
  operator_name: string | null;
  operator_contact: Record<string, unknown> | null;
  user_id: string;
}

// ──────────────────────────────────────────────────────────
// Payments
// ──────────────────────────────────────────────────────────

export interface PaymentRow {
  id: string;
  booking_id: string;
  booking_type: string;
  user_id: string;
  amount: string;
  currency: string;
  status: string;
  payment_method: string | null;
  transaction_id: string | null;
  failure_reason: string | null;
  payment_data: Record<string, unknown> | null;
  created_at: Date;
  completed_at: Date | null;
  updated_at: Date;
}

export interface BookingForPaymentRow {
  id: string;
  user_id: string;
  total_price: string;
  status: string;
  payment_status: string;
}

/** RETURNING clause from UPDATE payments — only the fields returned by the webhook handler */
export interface PaymentWebhookReturnRow {
  booking_id: string;
  booking_type: string;
  user_id: string;
}

export interface EmailRow {
  email: string;
}
