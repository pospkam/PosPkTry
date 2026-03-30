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

// ──────────────────────────────────────────────────────────
// Tours (user-facing)
// ──────────────────────────────────────────────────────────

/** SELECT id, name, price, max_group_size, min_group_size, is_active, operator_name, operator_email */
export interface TourBookCheckRow {
  id: string;
  name: string;
  price: string;
  max_group_size: number;
  min_group_size: number;
  is_active: boolean;
  operator_name: string;
  operator_email: string;
}

/** SELECT id, name, max_group_size, tour_type, is_active */
export interface TourTimeslotRow {
  id: string;
  name: string;
  max_group_size: number;
  tour_type: string;
  is_active: boolean;
}

/** tour_dates + booking aggregate for group time-slots */
export interface GroupDateRow {
  id: string;
  tour_date: Date;
  booked_guests: string;
  max_capacity: string;
  spots_left: string;
}

/** SELECT id, name, max_group_size, min_group_size, price, is_active */
export interface TourCheckRow {
  id: string;
  name: string;
  max_group_size: number;
  min_group_size: number;
  price: string;
  is_active: boolean;
}

/** Date-series availability row from CTE query */
export interface AvailabilityDateRow {
  date: string;
  booked: string;
  max_capacity: string;
  spots_left: string;
  status: string;
}

// ──────────────────────────────────────────────────────────
// Tour Departures (заезды — конкретные даты с местами)
// ──────────────────────────────────────────────────────────

/** Full tour_departures row */
export interface TourDepartureRow {
  id: string;
  tour_id: string;
  start_date: string;
  end_date: string | null;
  available_slots: number;
  booked_slots: number;
  price_override: string | null;
  min_group_size: number;
  status: 'active' | 'sold_out' | 'cancelled' | 'archived';
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Departure with joined tour name + base price (for API responses) */
export interface TourDepartureWithTourRow extends TourDepartureRow {
  tour_name: string;
  tour_price: string;
}

// ──────────────────────────────────────────────────────────
// Operator — Analytics Dashboard
// ──────────────────────────────────────────────────────────

export interface OpAnalyticsOverviewRow {
  total_tours: string;
  active_tours: string;
  total_bookings: string;
  pending_bookings: string;
  confirmed_bookings: string;
  completed_bookings: string;
  cancelled_bookings: string;
  total_revenue: string;
  paid_revenue: string;
  pending_revenue: string;
  avg_booking_value: string;
}

export interface OpAnalyticsTrendRow {
  date: Date;
  bookings_count: string;
  revenue: string | null;
  unique_customers: string;
}

export interface OpAnalyticsTopTourRow {
  id: string;
  name: string;
  bookings_count: string;
  revenue: string | null;
  avg_rating: string | null;
  reviews_count: string;
}

export interface OpAnalyticsRecentBookingRow {
  id: string;
  status: string;
  payment_status: string;
  total_price: string;
  created_at: Date;
  start_date: Date | null;
  guests_count: string;
  tour_name: string;
  customer_name: string;
  customer_email: string;
}

export interface OpAnalyticsConversionRow {
  pending: string;
  confirmed: string;
  completed: string;
  cancelled: string;
}

export interface OpAnalyticsCustomersRow {
  total_customers: string;
  repeat_customers: string;
}

export interface OpAnalyticsReviewsRow {
  total_reviews: string;
  avg_rating: string | null;
  five_star: string;
  four_star: string;
  three_star: string;
  two_star: string;
  one_star: string;
  replied_count: string;
}

// ──────────────────────────────────────────────────────────
// Operator — Dashboard
// ──────────────────────────────────────────────────────────

export interface OpDashboardMetricsRow {
  total_tours: string;
  active_tours: string;
  total_bookings: string;
  pending_bookings: string;
  confirmed_bookings: string;
  completed_bookings: string;
  cancelled_bookings: string;
  total_revenue: string;
  monthly_revenue: string;
  avg_rating: string;
  total_reviews: string;
}

export interface OpDashboardBookingRow {
  id: string;
  tour_id: string;
  tour_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  date: Date;
  guests_count: string;
  total_price: string;
  status: string;
  payment_status: string;
  created_at: Date;
  updated_at: Date;
}

export interface OpDashboardTopTourRow {
  tour_id: string;
  tour_name: string;
  bookings_count: string;
  revenue: string;
  avg_rating: string;
  review_count: string;
  completion_rate: string | null;
}

export interface OpDashboardChartRow {
  date: Date;
  value: string;
}

export interface OpDashboardUpcomingTourRow {
  tour_id: string;
  tour_name: string;
  date: Date;
  bookings_count: string;
  capacity: number;
}

// ──────────────────────────────────────────────────────────
// Operator — Reviews Stats
// ──────────────────────────────────────────────────────────

export interface OpReviewsStatsOverallRow {
  total_reviews: string;
  avg_rating: string | null;
  five_star: string;
  four_star: string;
  three_star: string;
  two_star: string;
  one_star: string;
  replied: string;
  pending_reply: string;
  verified: string;
  recent_reviews: string;
}

export interface OpReviewsByTourRow {
  id: string;
  name: string;
  reviews_count: string;
  avg_rating: string | null;
  recent_count: string;
}

export interface OpReviewsTrendRow {
  date: Date;
  reviews_count: string;
  avg_rating: string;
}

export interface OpNegativeReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: Date;
  tour_id: string;
  tour_name: string;
  user_name: string;
}

export interface OpResponseTimeRow {
  avg_response_hours: string | null;
  min_response_hours: string | null;
  max_response_hours: string | null;
}

// ──────────────────────────────────────────────────────────
// Operator — Revenue Report
// ──────────────────────────────────────────────────────────

export interface OpRevenueSummaryRow {
  total_bookings: string;
  total_revenue: string | null;
  paid_revenue: string | null;
  pending_revenue: string | null;
  refunded_revenue: string | null;
  avg_booking_value: string | null;
  min_booking_value: string | null;
  max_booking_value: string | null;
}

export interface OpRevenueTimelineRow {
  period: Date;
  bookings_count: string;
  tours_count: string;
  total_revenue: string;
  paid_revenue: string;
  pending_revenue: string;
  avg_booking_value: string;
}

export interface OpRevenueByTourRow {
  tour_id: string;
  tour_name: string;
  bookings_count: string;
  total_revenue: string;
  paid_revenue: string;
  avg_booking_value: string;
}

export interface OpPaymentStatusRow {
  payment_status: string;
  count: string;
  total: string;
}

// ──────────────────────────────────────────────────────────
// Operator — Bookings Report
// ──────────────────────────────────────────────────────────

export interface OpBookingStatusRow {
  status: string;
  count: string;
  revenue: string | null;
}

export interface OpBookingFunnelRow {
  pending: string;
  confirmed: string;
  completed: string;
  cancelled: string;
  confirmation_rate: string;
  completion_rate: string;
  cancellation_rate: string;
}

export interface OpLeadTimeRow {
  avg_lead_time_days: string | null;
  min_lead_time_days: string | null;
  max_lead_time_days: string | null;
}

export interface OpGuestsDistributionRow {
  group_size: string;
  count: string;
}

export interface OpRepeatCustomersRow {
  total_customers: string;
  repeat_customers: string;
}

// ──────────────────────────────────────────────────────────
// Operator — Tours List
// ──────────────────────────────────────────────────────────

export interface OpTourListRow {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  max_group_size: number;
  min_group_size: number;
  price: string;
  currency: string;
  is_active: boolean;
  rating: string;
  review_count: string;
  created_at: Date;
  updated_at: Date;
  route_id: string | null;
  route_title: string | null;
  route_category: string | null;
  route_lat: string | null;
  route_lng: string | null;
  bookings_count: string;
  total_revenue: string;
  images: string[] | null;
  includes: string[] | null;
  excludes: string[] | null;
  itinerary: unknown[] | null;
}

export interface OpTourCreateRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: Date;
}

// ──────────────────────────────────────────────────────────
// Operator — Stats
// ──────────────────────────────────────────────────────────

export interface OpStatsToursRow {
  total: string;
  active: string;
}

export interface OpStatsBookingsRow {
  total: string;
  pending: string;
  confirmed: string;
  completed: string;
  cancelled: string;
}

export interface OpStatsRevenueRow {
  total_revenue: string;
  pending_revenue: string;
  monthly_revenue: string;
}

export interface OpStatsRecentBookingRow {
  id: string;
  date: Date;
  participants: number;
  total_price: string;
  status: string;
  tour_name: string;
  user_name: string;
}

export interface OpStatsPartnerInfoRow {
  id: string;
  name: string;
  rating: string;
  review_count: string;
}

// ──────────────────────────────────────────────────────────
// Operator — Tours Schedules
// ──────────────────────────────────────────────────────────

export interface OpTourScheduleRow {
  id: string;
  tour_id: string;
  tour_name: string;
  start_date: Date;
  end_date: Date;
  price: string;
  available_spots: number;
  booked_spots: string;
  status: string | null;
  season: string;
}

export interface OpTourOwnerRow {
  id: string;
}

export interface OpTourForScheduleRow {
  id: string;
  name: string;
  operator_id: string;
}

export interface OpScheduleInsertRow {
  id: string;
  start_date: Date;
  end_date: Date;
  price: string;
  max_participants: number;
  status: string;
}

// ──────────────────────────────────────────────────────────
// Operator — Reviews List
// ──────────────────────────────────────────────────────────

export interface OpReviewListRow {
  id: string;
  tour_id: string;
  tour_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  photos: string[];
}

export interface OpReviewStatsRow {
  total_reviews: string;
  avg_rating: string | null;
  five_stars: string;
  four_stars: string;
  three_stars: string;
  two_stars: string;
  one_star: string;
}

// ──────────────────────────────────────────────────────────
// Operator — Profile
// ──────────────────────────────────────────────────────────

export interface OpProfileUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  preferences: Record<string, unknown> | null;
  created_at: Date;
}

export interface OpSettingsRow {
  auto_confirm_bookings: boolean;
  booking_lead_time: number;
  cancellation_policy: string;
  refund_policy: string;
  min_group_size: number;
  max_advance_booking_days: number;
  timezone: string;
  currency: string;
  commission_rate: string;
  settings: Record<string, unknown> | null;
}

export interface OpProfileStatsRow {
  total_tours: string;
  active_tours: string;
  total_bookings: string;
  total_revenue: string;
  avg_rating: string;
  total_reviews: string;
}

// ──────────────────────────────────────────────────────────
// Operator — Finance
// ──────────────────────────────────────────────────────────

export interface OpFinanceRow {
  total_revenue: string;
  pending_payouts: string;
  completed_payouts: string;
  commission: string;
  net_income: string;
}

export interface OpTransactionRow {
  id: string;
  type: string;
  amount: string;
  status: string;
  date: Date;
  description: string;
  booking_id: string;
}

// ──────────────────────────────────────────────────────────
// Operator — Bookings List
// ──────────────────────────────────────────────────────────

export interface OpBookingListRow {
  id: string;
  tour_id: string;
  tour_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  date: Date;
  guests_count: string;
  total_price: string;
  status: string;
  payment_status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────────
// Operator — Calendar
// ──────────────────────────────────────────────────────────

export interface OpCalendarRow {
  id: string;
  tour_id: string;
  tour_name: string;
  max_group_size: number;
  date: Date;
  available_spots: number;
  is_blocked: boolean;
  block_reason: string | null;
  price_override: string | null;
  notes: string | null;
  booked_spots: string;
}

// ──────────────────────────────────────────────────────────
// Operator — Tour Publish / Detail / Photos
// ──────────────────────────────────────────────────────────

export interface OpTourPublishRow {
  id: string;
  name: string;
  description: string;
  price: string;
  is_active: boolean;
  operator_id: string;
}

export interface OpTourDetailRow {
  id: string;
  name: string;
  description: string;
  short_description: string | null;
  category: string | null;
  difficulty: string;
  duration: number;
  price: string;
  currency: string;
  season: string[] | null;
  requirements: string[] | null;
  included: string[] | null;
  not_included: string[] | null;
  coordinates: number[][] | null;
  max_group_size: number;
  min_group_size: number;
  is_active: boolean;
  rating: string;
  review_count: string;
  images: string[];
  image_details: Record<string, unknown>[];
  created_at: Date;
  updated_at: Date;
}

export interface OpPhotoRow {
  id: string;
  url: string;
  mime_type: string;
  size: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  created_at: Date;
}

export interface OpAssetIdRow {
  id: string;
}

export interface OpUnlinkRow {
  asset_id: string;
}

export interface OpAssetUsageRow {
  count: string;
}

// === Guide Routes ===

export interface GuideEarningRow {
  id: string;
  amount: string;
  commission_rate: string;
  commission_amount: string;
  payment_status: string;
  payment_date: Date | null;
  notes: string | null;
  tour_name: string | null;
  tour_date: Date | null;
  created_at: Date;
}

export interface GuideEarningStatsRow {
  total_count: string;
  total_earned: string;
  total_paid: string;
  total_pending: string;
  total_commission: string;
  avg_commission_rate: string;
}

export interface GuideLocationRow {
  name: string;
  longitude: string | null;
  latitude: string | null;
  specializations: string[] | null;
}

export interface GuideScheduleLocationRow {
  id: string;
  title: string;
  start_time: Date;
  location_name: string | null;
  longitude: string;
  latitude: string;
  tour_title: string | null;
}

export interface GuidePopularLocationRow {
  location_name: string | null;
  longitude: string;
  latitude: string;
  bookings_count: string;
  tour_title: string;
}

export interface GuideActivityTrailRow {
  title: string;
  start_time: Date;
  location_name: string | null;
  longitude: string;
  latitude: string;
}

export interface GuideScheduleRow {
  id: string;
  guide_id: string;
  start_time: Date;
  end_time: Date;
  title: string;
  description: string | null;
  tour_id: string | null;
  tour_title: string | null;
  booking_id: string | null;
  booking_status: string | null;
  max_participants: number;
  current_participants: number;
  location_name: string | null;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  latitude: string | null;
  longitude: string | null;
}

export interface GuideScheduleCheckRow {
  guide_id: string;
  start_time: string;
  end_time: string;
  tour_id: string | null;
}

export interface GuideUserRow {
  id: string;
  email: string;
  name: string;
  created_at: Date;
}

export interface GuideReviewStatsRow {
  total_reviews: string;
  avg_rating: string;
  five_star: string;
  four_star: string;
  three_star: string;
  two_star: string;
  one_star: string;
  replied_count: string;
  unreplied_count: string;
  avg_professionalism: string;
  avg_knowledge: string;
  avg_communication: string;
}

// === Tourist Routes ===

export interface TouristAchievementRow {
  id: string;
  tourist_id: string;
  achievement_type: string;
  earned_at: Date;
  metadata: Record<string, unknown> | null;
}

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  total_bookings: number;
  total_spent: string; // pg numeric → string
  last_booking_date: Date | null;
  status: 'vip' | 'active' | 'inactive';
}

// ──────────────────────────────────────────────────────────
// AI-first — Reference Tours & Composite Bookings
// ──────────────────────────────────────────────────────────

export interface ReferenceTour {
  id: string;
  operator_id: string;
  activity_type: string;
  zone: string;
  price_per_person: string;
  duration_hours: string;
  max_participants: number;
  description: string | null;
  created_at: Date;
}

export interface CompositeBooking {
  id: string;
  tourist_id: string;
  reference_tour_ids: number[];
  itinerary: Record<string, unknown>;
  total_cost: string;
  status: string;
  created_at: Date;
}

// ──────────────────────────────────────────────────────────
// Admin — Knowledge Base (agent_route_knowledge)
// ──────────────────────────────────────────────────────────

export interface KnowledgeRouteRow {
  id: string;
  title: string;
  category: string;
  description: string | null;
  source_url: string | null;
  source_name: string | null;
  lat: string | null;
  lng: string | null;
  difficulty: string | null;
  duration: string | null;
  season: string | null;
  price_from: string | null;
  has_embedding: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface KnowledgeCategoryStatsRow {
  category: string;
  count: string;
}

export interface KnowledgeSourceStatsRow {
  source_name: string | null;
  count: string;
}

// ──────────────────────────────────────────────────────────
// Admin — Alerts (anomaly detection)
// ──────────────────────────────────────────────────────────

export interface AlertBookingVolumeRow {
  current_count: string;
  previous_count: string;
}

export interface AlertBadReviewBurstRow {
  tour_name: string;
  bad_reviews: string;
}

export interface AlertCancellationRateRow {
  company_name: string;
  id: string;
  cancelled: string;
  total: string;
}

// ──────────────────────────────────────────────────────────
// Admin — AI Moderation
// ──────────────────────────────────────────────────────────

export interface ReviewForAnalysisRow {
  id: string;
  comment: string | null;
  rating: string;
  user_name: string | null;
  tour_name: string | null;
}

// ──────────────────────────────────────────────────────────
// Chat System (conversations, participants, messages)
// ──────────────────────────────────────────────────────────

export interface ConversationRow {
  id: string;
  type: string;
  subject: string | null;
  booking_id: string | null;
  tour_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipantRow {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  last_read_at: string | null;
  is_muted: boolean;
  consent_given: boolean;
}

export interface ConversationMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  attachments: unknown[];
  is_deleted: boolean;
  created_at: string;
}

/** Used by listConversations with LATERAL join for last message + unread count */
export interface ConversationListRow {
  id: string;
  type: string;
  subject: string | null;
  booking_id: string | null;
  tour_id: string | null;
  created_at: string;
  updated_at: string;
  last_message_content: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  last_message_sender_name: string | null;
  unread_count: string;
  other_participant_name: string | null;
  other_participant_role: string | null;
  other_participant_id: string | null;
}

/** Used by getUnreadCounts — total unread per conversation */
export interface UnreadCountRow {
  conversation_id: string;
  unread_count: string;
}

/** Used by messages query with sender info */
export interface MessageWithSenderRow extends ConversationMessageRow {
  sender_name: string;
  sender_role: string;
}

// ──────────────────────────────────────────────────────────
// Operator Public Profile (partners table)
// ──────────────────────────────────────────────────────────

/** Used by GET /api/operators/[slug] */
export interface OperatorProfileRow {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  short_description: string | null;
  hero_image: string | null;
  gallery: unknown[] | null;
  services: unknown[] | null;
  features: unknown[] | null;
  faq: unknown[] | null;
  season_info: unknown[] | null;
  reviews_data: unknown[] | null;
  contacts: unknown[] | null;
  location: unknown | null;
  legal_info: string | null;
  contact: string | null;
  rating: string;
  review_count: string;
  is_verified: boolean;
  created_at: string;
}

/** Used by GET /api/operators (list) */
export interface OperatorListRow {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  short_description: string | null;
  hero_image: string | null;
  rating: string;
  review_count: string;
  is_verified: boolean;
}

// ──────────────────────────────────────────────────────────
// User Trips (TripBuilder persistence)
// ──────────────────────────────────────────────────────────

/** One day in a saved trip plan — mirrors DayPlan in _PlannerClient */
export interface TripDayPlan {
  day: number;
  zone: 'avachinsky' | 'western' | 'eastern' | 'northern';
  title: string;
  activityType: string;
  priceFrom: number;
  priceTo: number;
  coords: [number, number];
  defaultTransport: 'walking' | 'jeep' | 'helicopter' | 'boat';
}

export interface UserTripRow {
  id: string;
  user_id: string;
  title: string;
  arrival_date: Date | null;
  departure_date: Date | null;
  places: string[];
  activities: string[];
  days: TripDayPlan[];
  transport_by_day: Record<string, string>;
  flight_arrival: string | null;
  flight_departure: string | null;
  flight_arrival_time: string | null;
  flight_departure_time: string | null;
  needs_airport_transfer: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserTripListRow {
  id: string;
  title: string;
  arrival_date: Date | null;
  departure_date: Date | null;
  places: string[];
  activities: string[];
  days_count: string;
  created_at: Date;
  updated_at: Date;
}
