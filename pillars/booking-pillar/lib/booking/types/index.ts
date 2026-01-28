/**
 * Booking Pillar - Type Definitions
 * Complete type system for tour bookings, payments, and reservations
 */

// ============================================================================
// ENUMS & UNIONS
// ============================================================================

export type BookingStatus =
  | 'draft'
  | 'pending_payment'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'no_show'

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'disputed'

export type PaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'yandex_kassa'
  | 'sberbank'
  | 'transfer'
  | 'crypto'

export type CancellationReason =
  | 'user_requested'
  | 'operator_cancelled'
  | 'payment_failed'
  | 'tour_cancelled'
  | 'force_majeure'
  | 'other'

export type ParticipantStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'no_show'
  | 'completed'

// ============================================================================
// MAIN BOOKING INTERFACE
// ============================================================================

export interface Booking {
  // Identity
  id: string
  userId: string
  tourId: string
  operatorId: string

  // Status
  status: BookingStatus
  paymentStatus: PaymentStatus

  // Booking Details
  bookingNumber: string // Format: BK-YYYY-MM-DD-XXXX
  bookingDate: Date
  tourDate: Date
  participantCount: number
  participants: BookingParticipant[]

  // Pricing
  pricePerPerson: number
  totalPrice: number
  currencyCode: 'RUB' | 'USD' | 'EUR'
  discountAmount: number
  discountCode?: string
  taxAmount: number
  finalPrice: number

  // Payment
  paymentMethod?: PaymentMethod
  paymentDetails?: PaymentDetails
  paymentDeadline: Date

  // Confirmation
  confirmationSentAt?: Date
  reminderSentAt?: Date
  confirmationCode: string

  // Cancellation
  cancelledAt?: Date
  cancellationReason?: CancellationReason
  cancellationDetails?: string
  refundAmount?: number
  refundStatus?: PaymentStatus

  // Contact
  primaryContact: {
    name: string
    phone: string
    email: string
  }

  // Special Requests
  specialRequests?: string
  dietaryRequirements?: string[]
  mobilityRequirements?: string

  // Insurance
  insuranceIncluded: boolean
  insuranceAmount?: number

  // Metadata
  ipAddress?: string
  userAgent?: string
  source: 'web' | 'mobile' | 'admin' | 'api'
  refSource?: string

  // Timestamps
  createdAt: Date
  updatedAt: Date
  expiredAt?: Date
}

// ============================================================================
// PARTICIPANT INTERFACE
// ============================================================================

export interface BookingParticipant {
  id: string
  bookingId: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: 'male' | 'female' | 'other'
  nationality: string
  passportNumber?: string
  email: string
  phone: string
  status: ParticipantStatus
  specialNeeds?: string
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
  createdAt: Date
}

// ============================================================================
// PAYMENT INTERFACE
// ============================================================================

export interface Payment {
  id: string
  bookingId: string
  externalPaymentId?: string
  amount: number
  currency: 'RUB' | 'USD' | 'EUR'
  status: PaymentStatus
  method: PaymentMethod
  processedAt?: Date
  completedAt?: Date
  failureReason?: string
  receiptUrl?: string
  refundId?: string
  refundedAt?: Date
  refundAmount?: number
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// PAYMENT DETAILS INTERFACE
// ============================================================================

export interface PaymentDetails {
  method: PaymentMethod
  lastFourDigits?: string
  cardBrand?: string
  holderName?: string
  expiryMonth?: number
  expiryYear?: number
  bankCode?: string
}

// ============================================================================
// DTOs - BOOKING
// ============================================================================

export interface BookingCreate {
  tourId: string
  tourDate: Date
  participantCount: number
  participants: BookingParticipantCreate[]
  primaryContact: {
    name: string
    phone: string
    email: string
  }
  specialRequests?: string
  dietaryRequirements?: string[]
  mobilityRequirements?: string
  insuranceIncluded?: boolean
  discountCode?: string
  source?: 'web' | 'mobile' | 'admin' | 'api'
  refSource?: string
}

export interface BookingParticipantCreate {
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: 'male' | 'female' | 'other'
  nationality: string
  passportNumber?: string
  email: string
  phone: string
  specialNeeds?: string
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
}

export interface BookingUpdate {
  participantCount?: number
  participants?: BookingParticipantCreate[]
  primaryContact?: {
    name: string
    phone: string
    email: string
  }
  specialRequests?: string
  dietaryRequirements?: string[]
  mobilityRequirements?: string
  status?: BookingStatus
}

// ============================================================================
// DTOs - PAYMENT
// ============================================================================

export interface PaymentCreate {
  bookingId: string
  amount: number
  currency?: 'RUB' | 'USD' | 'EUR'
  method: PaymentMethod
  returnUrl?: string
  notificationUrl?: string
}

export interface PaymentUpdate {
  status: PaymentStatus
  externalPaymentId?: string
  failureReason?: string
  receiptUrl?: string
}

// ============================================================================
// FILTERS & SEARCH
// ============================================================================

export interface BookingFilters {
  userId?: string
  operatorId?: string
  tourId?: string
  status?: BookingStatus
  paymentStatus?: PaymentStatus
  dateFrom?: Date
  dateTo?: Date
  minPrice?: number
  maxPrice?: number
  source?: 'web' | 'mobile' | 'admin' | 'api'
  sortBy?: 'date' | 'price' | 'created' | 'status'
  sortOrder?: 'asc' | 'desc'
}

export interface PaymentFilters {
  bookingId?: string
  status?: PaymentStatus
  method?: PaymentMethod
  dateFrom?: Date
  dateTo?: Date
  minAmount?: number
  maxAmount?: number
}

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

export interface BookingStats {
  bookingId: string
  totalBookings: number
  confirmedBookings: number
  cancelledBookings: number
  totalRevenue: number
  averagePrice: number
  cancellationRate: number
  totalParticipants: number
  lastUpdated: Date
}

export interface BookingAnalytics {
  tourId: string
  operatorId: string
  bookingsByStatus: Record<BookingStatus, number>
  bookingsByPaymentStatus: Record<PaymentStatus, number>
  bookingsBySource: Record<'web' | 'mobile' | 'admin' | 'api', number>
  revenueByMonth: Array<{ month: string; revenue: number }>
  topBookingDates: Array<{ date: Date; count: number }>
  participantDemographics: {
    totalParticipants: number
    averageAge: number
    genderDistribution: Record<string, number>
    topNationalities: Array<{ nationality: string; count: number }>
  }
  lastUpdated: Date
}

export interface PaymentAnalytics {
  operatorId: string
  totalPayments: number
  successfulPayments: number
  failedPayments: number
  totalAmount: number
  averageAmount: number
  successRate: number
  paymentsByMethod: Record<PaymentMethod, number>
  paymentsByStatus: Record<PaymentStatus, number>
  refundedAmount: number
  disputedAmount: number
  lastUpdated: Date
}

// ============================================================================
// CANCELLATION & REFUND
// ============================================================================

export interface CancellationRequest {
  bookingId: string
  reason: CancellationReason
  details?: string
  requestedAt: Date
}

export interface RefundPolicy {
  daysBeforeTour: number
  refundPercentage: number
  minAmount: number
}

export interface Refund {
  id: string
  bookingId: string
  paymentId: string
  amount: number
  currency: 'RUB' | 'USD' | 'EUR'
  reason: CancellationReason
  status: PaymentStatus
  processedAt?: Date
  completedAt?: Date
  failureReason?: string
  createdAt: Date
}

// ============================================================================
// PROMO & DISCOUNT
// ============================================================================

export interface DiscountCode {
  id: string
  code: string
  description: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  maxUses: number
  usedCount: number
  minBookingAmount?: number
  applicableTours?: string[]
  applicableOperators?: string[]
  validFrom: Date
  validUntil: Date
  isActive: boolean
  createdAt: Date
}

export interface DiscountValidation {
  isValid: boolean
  code: string
  discountAmount: number
  applicableTours?: string[]
  message?: string
}

// ============================================================================
// INVOICE
// ============================================================================

export interface Invoice {
  id: string
  bookingId: string
  invoiceNumber: string
  issueDate: Date
  dueDate: Date
  items: InvoiceItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  currency: 'RUB' | 'USD' | 'EUR'
  status: 'draft' | 'issued' | 'paid' | 'cancelled'
  paidAt?: Date
  createdAt: Date
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  itemType: 'tour' | 'insurance' | 'extra_service' | 'discount'
}

// ============================================================================
// CONFIRMATION & DOCUMENTS
// ============================================================================

export interface BookingConfirmation {
  id: string
  bookingId: string
  confirmationCode: string
  confirmationDocument: string // PDF URL
  voucherDocument?: string // PDF URL
  itinerary?: string // PDF URL
  confirmationEmail: string
  confirmationSentAt: Date
  expiresAt: Date
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class BookingNotFoundError extends Error {
  constructor(bookingId: string) {
    super(`Booking not found: ${bookingId}`)
    this.name = 'BookingNotFoundError'
  }
}

export class BookingValidationError extends Error {
  constructor(message: string) {
    super(`Booking validation error: ${message}`)
    this.name = 'BookingValidationError'
  }
}

export class BookingAlreadyConfirmedError extends Error {
  constructor(bookingId: string) {
    super(`Booking already confirmed: ${bookingId}`)
    this.name = 'BookingAlreadyConfirmedError'
  }
}

export class BookingAlreadyCancelledError extends Error {
  constructor(bookingId: string) {
    super(`Booking already cancelled: ${bookingId}`)
    this.name = 'BookingAlreadyCancelledError'
  }
}

export class PaymentNotFoundError extends Error {
  constructor(paymentId: string) {
    super(`Payment not found: ${paymentId}`)
    this.name = 'PaymentNotFoundError'
  }
}

export class PaymentValidationError extends Error {
  constructor(message: string) {
    super(`Payment validation error: ${message}`)
    this.name = 'PaymentValidationError'
  }
}

export class InsufficientSpaceError extends Error {
  constructor(tourId: string, requested: number, available: number) {
    super(
      `Insufficient space: requested ${requested}, available ${available} for tour ${tourId}`
    )
    this.name = 'InsufficientSpaceError'
  }
}

export class TourUnavailableError extends Error {
  constructor(tourId: string, date: Date) {
    super(`Tour unavailable: ${tourId} on ${date.toISOString().split('T')[0]}`)
    this.name = 'TourUnavailableError'
  }
}

export class InvalidDiscountCodeError extends Error {
  constructor(code: string) {
    super(`Invalid discount code: ${code}`)
    this.name = 'InvalidDiscountCodeError'
  }
}

export class RefundNotAllowedError extends Error {
  constructor(reason: string) {
    super(`Refund not allowed: ${reason}`)
    this.name = 'RefundNotAllowedError'
  }
}

export class PaymentGatewayError extends Error {
  constructor(message: string) {
    super(`Payment gateway error: ${message}`)
    this.name = 'PaymentGatewayError'
  }
}

export class DuplicateBookingError extends Error {
  constructor(userId: string, tourId: string, date: Date) {
    super(`Duplicate booking: user ${userId} already booked tour ${tourId} for ${date}`)
    this.name = 'DuplicateBookingError'
  }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export interface BookingNotification {
  type: 'confirmation' | 'reminder' | 'cancellation' | 'refund'
  bookingId: string
  userId: string
  operatorId: string
  email: string
  phone?: string
  data: Record<string, any>
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  Booking,
  BookingParticipant,
  Payment,
  PaymentDetails,
  BookingCreate,
  BookingParticipantCreate,
  BookingUpdate,
  PaymentCreate,
  PaymentUpdate,
  BookingFilters,
  PaymentFilters,
  BookingStats,
  BookingAnalytics,
  PaymentAnalytics,
  CancellationRequest,
  RefundPolicy,
  Refund,
  DiscountCode,
  DiscountValidation,
  Invoice,
  InvoiceItem,
  BookingConfirmation,
  BookingNotification
}
