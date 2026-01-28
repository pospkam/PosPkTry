/**
 * Booking Pillar - Payment Type Definitions
 * Complete type system for payment processing and gateways
 */

// ============================================================================
// ENUMS & UNIONS
// ============================================================================

export type PaymentGateway = 'yandex_kassa' | 'stripe' | 'sberbank' | 'paypal' | 'crypto'

export type TransactionType = 'payment' | 'refund' | 'dispute' | 'chargeback'

export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'

export type CurrencyCode = 'RUB' | 'USD' | 'EUR' | 'GBP' | 'CNY'

export type WebhookStatus = 'pending' | 'delivered' | 'failed' | 'retrying'

// ============================================================================
// PAYMENT GATEWAY INTERFACE
// ============================================================================

export interface PaymentGatewayConfig {
  gateway: PaymentGateway
  isProduction: boolean
  isActive: boolean
  priority: number
  settings: Record<string, string | number | boolean>
  credentials: {
    apiKey?: string
    secretKey?: string
    merchantId?: string
    storeId?: string
  }
  webhookUrl: string
  successUrl: string
  failureUrl: string
  notificationEmail?: string
  supportedCurrencies: CurrencyCode[]
  supportedMethods: string[]
  commissionRate: number // percentage
  minAmount: number
  maxAmount: number
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// PAYMENT TRANSACTION
// ============================================================================

export interface PaymentTransaction {
  id: string
  bookingId: string
  paymentGateway: PaymentGateway
  externalTransactionId: string

  // Amount
  amount: number
  currency: CurrencyCode
  commission: number
  netAmount: number

  // Transaction Details
  type: TransactionType
  status: TransactionStatus
  description: string

  // Payer Information
  payerName: string
  payerEmail: string
  payerPhone: string
  payerCountry?: string

  // Payment Method Details
  paymentMethod: {
    type: 'card' | 'bank_transfer' | 'digital_wallet' | 'crypto'
    lastFourDigits?: string
    brand?: string
    country?: string
  }

  // Timing
  initiatedAt: Date
  processingStartedAt?: Date
  completedAt?: Date
  failureReason?: string

  // Metadata
  ipAddress: string
  userAgent: string
  refSource?: string

  // Receipts & Documentation
  receiptUrl?: string
  invoiceUrl?: string

  // Reconciliation
  reconciled: boolean
  reconciledAt?: Date

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// REFUND TRANSACTION
// ============================================================================

export interface RefundTransaction {
  id: string
  originalTransactionId: string
  bookingId: string
  paymentGateway: PaymentGateway
  externalRefundId: string

  // Amount
  refundAmount: number
  currency: CurrencyCode
  originalAmount: number

  // Status
  status: TransactionStatus
  reason: string
  description?: string

  // Timing
  initiatedAt: Date
  completedAt?: Date
  failureReason?: string

  // Metadata
  initiatedBy: string // User ID or admin ID
  approvedBy?: string

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// WEBHOOK & NOTIFICATION
// ============================================================================

export interface WebhookEvent {
  id: string
  gateway: PaymentGateway
  eventType: string
  eventId: string
  status: WebhookStatus
  data: Record<string, any>

  // Delivery
  deliveryAttempts: number
  lastAttemptAt?: Date
  nextRetryAt?: Date

  createdAt: Date
  updatedAt: Date
}

export interface PaymentNotification {
  id: string
  transactionId: string
  notificationType: 'payment_success' | 'payment_failed' | 'refund_success' | 'refund_failed' | 'dispute'
  recipientEmail: string
  recipientPhone?: string
  notificationData: Record<string, any>
  sentAt?: Date
  readAt?: Date
  createdAt: Date
}

// ============================================================================
// PAYMENT REQUEST & RESPONSE
// ============================================================================

export interface PaymentRequest {
  bookingId: string
  amount: number
  currency: CurrencyCode
  gateway: PaymentGateway
  returnUrl: string
  notificationUrl: string
  description: string
  payer: {
    name: string
    email: string
    phone: string
    ipAddress: string
  }
  metadata?: Record<string, any>
}

export interface PaymentResponse {
  transactionId: string
  externalTransactionId: string
  status: TransactionStatus
  paymentUrl?: string // For redirect-based gateways
  amount: number
  currency: CurrencyCode
  createdAt: Date
}

export interface PaymentVerification {
  transactionId: string
  externalTransactionId: string
  status: TransactionStatus
  amount: number
  currency: CurrencyCode
  paidAt?: Date
  failureReason?: string
}

// ============================================================================
// SETTLEMENT & RECONCILIATION
// ============================================================================

export interface Settlement {
  id: string
  operatorId: string
  gateway: PaymentGateway
  periodStart: Date
  periodEnd: Date

  // Totals
  totalTransactions: number
  totalAmount: number
  totalCommission: number
  netAmount: number

  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed'
  settledAt?: Date
  failureReason?: string

  // Details
  transactions: PaymentTransaction[]
  bankAccount?: {
    bankName: string
    accountNumber: string
    routingNumber?: string
  }

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// FRAUD & RISK
// ============================================================================

export interface FraudCheckResult {
  transactionId: string
  riskLevel: 'low' | 'medium' | 'high'
  riskFactors: string[]
  ipGeolocation?: {
    country: string
    city: string
  }
  deviceFingerprint?: string
  addressVerification?: 'match' | 'mismatch' | 'unavailable'
  cvvVerification?: 'match' | 'mismatch' | 'unavailable'
  recommendations: string[]
  checkedAt: Date
}

// ============================================================================
// PAYMENT ANALYTICS
// ============================================================================

export interface PaymentMetrics {
  period: {
    startDate: Date
    endDate: Date
  }

  // Volume Metrics
  totalTransactions: number
  successfulTransactions: number
  failedTransactions: number
  successRate: number

  // Amount Metrics
  totalAmount: number
  averageTransaction: number
  minTransaction: number
  maxTransaction: number

  // Gateway Performance
  gatewayPerformance: Array<{
    gateway: PaymentGateway
    transactions: number
    amount: number
    successRate: number
  }>

  // Currency Distribution
  currencyDistribution: Record<CurrencyCode, number>

  // Time Analysis
  peakHours: Array<{ hour: number; transactions: number }>
  peakDays: Array<{ day: string; transactions: number }>

  // Refund Analysis
  totalRefunds: number
  refundAmount: number
  refundRate: number

  lastUpdated: Date
}

// ============================================================================
// DTOs
// ============================================================================

export interface PaymentCreate {
  bookingId: string
  amount: number
  currency: CurrencyCode
  gateway: PaymentGateway
  payerName: string
  payerEmail: string
  payerPhone: string
  returnUrl: string
  notificationUrl: string
  description?: string
  metadata?: Record<string, any>
}

export interface RefundCreate {
  transactionId: string
  refundAmount?: number
  reason: string
  description?: string
}

export interface PaymentGatewayConfigCreate {
  gateway: PaymentGateway
  isProduction: boolean
  isActive: boolean
  priority: number
  settings: Record<string, string | number | boolean>
  credentials: {
    apiKey?: string
    secretKey?: string
    merchantId?: string
    storeId?: string
  }
  webhookUrl: string
  successUrl: string
  failureUrl: string
  supportedCurrencies: CurrencyCode[]
  commissionRate: number
  minAmount: number
  maxAmount: number
}

// ============================================================================
// PAYMENT FILTERS
// ============================================================================

export interface PaymentTransactionFilters {
  bookingId?: string
  operatorId?: string
  gateway?: PaymentGateway
  status?: TransactionStatus
  type?: TransactionType
  currency?: CurrencyCode
  dateFrom?: Date
  dateTo?: Date
  minAmount?: number
  maxAmount?: number
  sortBy?: 'date' | 'amount' | 'status'
  sortOrder?: 'asc' | 'desc'
}

export interface SettlementFilters {
  operatorId?: string
  gateway?: PaymentGateway
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  dateFrom?: Date
  dateTo?: Date
  sortBy?: 'date' | 'amount'
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class PaymentTransactionNotFoundError extends Error {
  constructor(transactionId: string) {
    super(`Payment transaction not found: ${transactionId}`)
    this.name = 'PaymentTransactionNotFoundError'
  }
}

export class PaymentGatewayError extends Error {
  constructor(gateway: PaymentGateway, message: string) {
    super(`Payment gateway error (${gateway}): ${message}`)
    this.name = 'PaymentGatewayError'
  }
}

export class PaymentVerificationFailedError extends Error {
  constructor(transactionId: string) {
    super(`Payment verification failed: ${transactionId}`)
    this.name = 'PaymentVerificationFailedError'
  }
}

export class RefundNotAllowedError extends Error {
  constructor(reason: string) {
    super(`Refund not allowed: ${reason}`)
    this.name = 'RefundNotAllowedError'
  }
}

export class InsufficientFundsError extends Error {
  constructor() {
    super('Insufficient funds for refund')
    this.name = 'InsufficientFundsError'
  }
}

export class FraudDetectedError extends Error {
  constructor(riskLevel: string) {
    super(`Fraud detected: risk level ${riskLevel}`)
    this.name = 'FraudDetectedError'
  }
}

export class PaymentGatewayNotConfiguredError extends Error {
  constructor(gateway: PaymentGateway) {
    super(`Payment gateway not configured: ${gateway}`)
    this.name = 'PaymentGatewayNotConfiguredError'
  }
}

export class WebhookVerificationFailedError extends Error {
  constructor(webhookId: string) {
    super(`Webhook verification failed: ${webhookId}`)
    this.name = 'WebhookVerificationFailedError'
  }
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  PaymentGatewayConfig,
  PaymentTransaction,
  RefundTransaction,
  WebhookEvent,
  PaymentNotification,
  PaymentRequest,
  PaymentResponse,
  PaymentVerification,
  Settlement,
  FraudCheckResult,
  PaymentMetrics,
  PaymentCreate,
  RefundCreate,
  PaymentGatewayConfigCreate,
  PaymentTransactionFilters,
  SettlementFilters
}
