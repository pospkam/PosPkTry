/**
 * Analytics Pillar Types
 * Comprehensive type definitions for dashboards, reporting, and metrics tracking
 */

// ============================================================================
// METRICS & MEASUREMENTS
// ============================================================================

export enum MetricType {
  REVENUE = 'REVENUE',
  BOOKINGS = 'BOOKINGS',
  USERS = 'USERS',
  CONVERSION = 'CONVERSION',
  ENGAGEMENT = 'ENGAGEMENT',
  CHURN = 'CHURN',
  RETENTION = 'RETENTION',
  LTVAL = 'LTVAL', // Lifetime Value
}

export enum TimePeriod {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export interface Metric {
  id: string
  type: MetricType
  period: TimePeriod
  timestamp: Date
  value: number
  previousValue?: number
  change?: number
  changePercentage?: number
  metadata?: Record<string, any>
  createdAt: Date
}

export interface DashboardMetrics {
  totalRevenue: number
  totalBookings: number
  totalUsers: number
  conversionRate: number
  averageBookingValue: number
  customerAcquisitionCost: number
  customerRetention: number
  netPromoterScore?: number
  activeUsers: number
  newUsers: number
  churnRate: number
  ltv: number
  timestamp: Date
}

// ============================================================================
// REVENUE & SALES ANALYTICS
// ============================================================================

export enum RevenueSource {
  DIRECT_BOOKING = 'DIRECT_BOOKING',
  PARTNER_BOOKING = 'PARTNER_BOOKING',
  AFFILIATE_BOOKING = 'AFFILIATE_BOOKING',
  COMMISSION = 'COMMISSION',
  ADDON_SERVICES = 'ADDON_SERVICES',
}

export interface RevenueAnalytics {
  id: string
  date: Date
  period: TimePeriod
  totalRevenue: number
  totalRefunds: number
  netRevenue: number
  revenueBySource: {
    source: RevenueSource
    amount: number
    percentage: number
  }[]
  revenueByCategory: {
    categoryId: string
    categoryName: string
    amount: number
    percentage: number
  }[]
  revenueByRegion: {
    region: string
    amount: number
    percentage: number
  }[]
  averageTransactionValue: number
  topPerformingProducts: {
    productId: string
    productName: string
    revenue: number
    bookings: number
  }[]
  createdAt: Date
}

// ============================================================================
// BOOKING & CONVERSION ANALYTICS
// ============================================================================

export interface BookingAnalytics {
  id: string
  date: Date
  period: TimePeriod
  totalBookings: number
  totalPendingBookings: number
  totalConfirmedBookings: number
  totalCancelledBookings: number
  bookingsByStatus: {
    status: string
    count: number
    percentage: number
  }[]
  bookingsByCategory: {
    categoryId: string
    categoryName: string
    count: number
    revenue: number
  }[]
  bookingsByRegion: {
    region: string
    count: number
    revenue: number
  }[]
  averageBookingValue: number
  bookingConversionRate: number
  averageTimeToConversion: number
  topConvertingPages: {
    pageUrl: string
    visits: number
    conversions: number
    conversionRate: number
  }[]
  createdAt: Date
}

// ============================================================================
// USER & CUSTOMER ANALYTICS
// ============================================================================

export interface UserAnalytics {
  id: string
  date: Date
  period: TimePeriod
  newUsersCount: number
  activeUsersCount: number
  returningUsersCount: number
  churnedUsersCount: number
  totalUsersCount: number
  usersBySegment: {
    segment: string
    count: number
    percentage: number
  }[]
  usersBySource: {
    source: string
    count: number
    percentage: number
  }[]
  usersByRegion: {
    region: string
    count: number
  }[]
  averageSessionDuration: number
  averageSessionsPerUser: number
  bounceRate: number
  totalSessions: number
  uniqueVisitors: number
  returningVisitorRate: number
  userRetentionByDay: {
    dayNumber: number
    retentionRate: number
  }[]
  createdAt: Date
}

// ============================================================================
// ENGAGEMENT ANALYTICS
// ============================================================================

export interface EngagementAnalytics {
  id: string
  date: Date
  period: TimePeriod
  totalPageViews: number
  totalEvents: number
  avgTimeOnSite: number
  avgPagesPerSession: number
  bounceRate: number
  clickThroughRate: number
  shareCount: number
  reviewCount: number
  averageRating: number
  topPages: {
    pageUrl: string
    views: number
    uniqueUsers: number
    avgTimeOnPage: number
  }[]
  topSearchTerms: {
    term: string
    count: number
    resultCount: number
  }[]
  userActions: {
    actionType: string
    count: number
    users: number
  }[]
  featureUsage: {
    featureId: string
    featureName: string
    usageCount: number
    users: number
  }[]
  createdAt: Date
}

// ============================================================================
// MARKETING & CAMPAIGN ANALYTICS
// ============================================================================

export interface CampaignAnalytics {
  id: string
  campaignId: string
  campaignName: string
  campaignType: 'EMAIL' | 'SMS' | 'PUSH' | 'SOCIAL' | 'PAID_ADS' | 'ORGANIC'
  period: TimePeriod
  date: Date
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
  ctr: number
  cpc: number
  cpa: number
  roi: number
  roas: number
  conversionRate: number
  costPerBooking: number
  topPerformingCreative: {
    creativeId: string
    clicks: number
    conversions: number
    ctr: number
  }
  topAudience: {
    segmentId: string
    segmentName: string
    clicks: number
    conversions: number
  }
  createdAt: Date
}

// ============================================================================
// CUSTOMER QUALITY ANALYTICS
// ============================================================================

export interface CustomerQualityMetrics {
  id: string
  customerId: string
  cumulativeRevenue: number
  totalBookings: number
  averageBookingValue: number
  purchaseFrequency: number
  daySinceLastPurchase: number
  ltv: number
  churnRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  satisfactionScore?: number
  netPromoterScore?: number
  reviewCount: number
  averageRating: number
  returnRate: number
  cancelledBookings: number
  supportTickets: number
  lastActivity: Date
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// OPERATIONAL METRICS
// ============================================================================

export interface OperationalMetrics {
  id: string
  date: Date
  period: TimePeriod
  systemUptime: number
  averageResponseTime: number
  errorRate: number
  databaseQueryTime: number
  cacheHitRate: number
  apiCallCount: number
  slowQueryCount: number
  failedTransactions: number
  supportTicketsCreated: number
  supportTicketsResolved: number
  averageResolutionTime: number
  customerSatisfactionScore: number
  createdAt: Date
}

// ============================================================================
// REPORT TYPES
// ============================================================================

export enum ReportType {
  REVENUE_REPORT = 'REVENUE_REPORT',
  BOOKING_REPORT = 'BOOKING_REPORT',
  USER_REPORT = 'USER_REPORT',
  ENGAGEMENT_REPORT = 'ENGAGEMENT_REPORT',
  CAMPAIGN_REPORT = 'CAMPAIGN_REPORT',
  CUSTOM_REPORT = 'CUSTOM_REPORT',
  EXECUTIVE_SUMMARY = 'EXECUTIVE_SUMMARY',
}

export interface Report {
  id: string
  type: ReportType
  name: string
  description?: string
  period: TimePeriod
  startDate: Date
  endDate: Date
  generatedBy: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  metrics: Metric[]
  summary?: DashboardMetrics
  insights?: string[]
  recommendations?: string[]
  attachments?: {
    fileName: string
    fileUrl: string
    fileType: string
  }[]
  isScheduled?: boolean
  scheduleFrequency?: TimePeriod
  recipients?: string[]
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// ALERTS & THRESHOLDS
// ============================================================================

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export interface MetricAlert {
  id: string
  name: string
  metricType: MetricType
  threshold: number
  operator: '>' | '<' | '=' | '>=' | '<='
  severity: AlertSeverity
  active: boolean
  recipients: string[]
  lastTriggered?: Date
  createdAt: Date
  updatedAt: Date
}

export interface AlertEvent {
  id: string
  alertId: string
  alertName: string
  severity: AlertSeverity
  message: string
  value: number
  threshold: number
  triggeredAt: Date
  acknowledged: boolean
  acknowledgedAt?: Date
  acknowledgedBy?: string
  createdAt: Date
}

// ============================================================================
// DASHBOARD & VISUALIZATION
// ============================================================================

export interface DashboardWidget {
  id: string
  dashboardId: string
  type:
    | 'METRIC_CARD'
    | 'LINE_CHART'
    | 'BAR_CHART'
    | 'PIE_CHART'
    | 'TABLE'
    | 'GAUGE'
    | 'HEATMAP'
  title: string
  description?: string
  metricType?: MetricType
  dataSource: string
  refreshInterval?: number
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  config?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface Dashboard {
  id: string
  name: string
  description?: string
  type: 'EXECUTIVE' | 'OPERATIONAL' | 'MARKETING' | 'FINANCE' | 'CUSTOM'
  owner: string
  widgets: DashboardWidget[]
  refreshInterval: number
  isPublic: boolean
  sharedWith?: string[]
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// DTOs & FILTERS
// ============================================================================

export interface AnalyticsQueryDTO {
  metricType?: MetricType
  period: TimePeriod
  startDate: Date
  endDate: Date
  filters?: Record<string, any>
  groupBy?: string
  orderBy?: string
}

export interface ReportGenerationDTO {
  type: ReportType
  period: TimePeriod
  startDate: Date
  endDate: Date
  filters?: Record<string, any>
  recipients?: string[]
}

export interface MetricFilter {
  type?: MetricType
  period?: TimePeriod
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
  sortBy?: 'value' | 'timestamp'
  sortOrder?: 'ASC' | 'DESC'
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class AnalyticsError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'AnalyticsError'
  }
}

export class MetricNotFoundError extends AnalyticsError {
  constructor(metricId: string) {
    super(`Metric not found: ${metricId}`, 'METRIC_NOT_FOUND')
  }
}

export class DashboardNotFoundError extends AnalyticsError {
  constructor(dashboardId: string) {
    super(`Dashboard not found: ${dashboardId}`, 'DASHBOARD_NOT_FOUND')
  }
}

export class ReportGenerationError extends AnalyticsError {
  constructor(message: string) {
    super(message, 'REPORT_GENERATION_ERROR')
  }
}

export class InvalidMetricPeriodError extends AnalyticsError {
  constructor(period: string) {
    super(`Invalid metric period: ${period}`, 'INVALID_METRIC_PERIOD')
  }
}

export class AlertConfigurationError extends AnalyticsError {
  constructor(message: string) {
    super(message, 'ALERT_CONFIGURATION_ERROR')
  }
}

export class DataAggregationError extends AnalyticsError {
  constructor(message: string) {
    super(message, 'DATA_AGGREGATION_ERROR')
  }
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface MetricsResponse {
  success: boolean
  data: Metric[]
  total: number
  page: number
  limit: number
}

export interface DashboardResponse {
  success: boolean
  data: Dashboard
}

export interface ReportResponse {
  success: boolean
  data: Report
}

export interface AnalyticsDataResponse {
  success: boolean
  data: any
  metadata?: {
    period: TimePeriod
    startDate: Date
    endDate: Date
    generatedAt: Date
  }
}
