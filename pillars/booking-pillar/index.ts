/**
 * Booking Pillar - Main Index
 * Complete exports for all booking, availability, and payment services
 */

// Services
export { BookingService, bookingService } from './booking/services'
export { AvailabilityService, availabilityService } from './availability/services'
export { PaymentService, paymentService } from './payment/services'

// Types
export type {
  // Booking Types
  Booking,
  BookingParticipant,
  BookingCreate,
  BookingParticipantCreate,
  BookingUpdate,
  BookingFilters,
  BookingStats,
  BookingAnalytics,
  BookingConfirmation,
  BookingNotification,
  // Availability Types
  AvailabilitySlot,
  AvailabilityPeriod,
  RecurringAvailability,
  AvailabilityBlock,
  DynamicPricingRule,
  AvailabilityStats,
  AvailabilityCalendar,
  // Payment Types
  PaymentTransaction,
  PaymentGatewayConfig,
  PaymentCreate,
  PaymentMetrics,
  Settlement,
  FraudCheckResult,
} from './booking/types'

export type {
  AvailabilitySlot as AvailabilitySlotType,
  AvailabilityPeriod as AvailabilityPeriodType,
} from './availability/types'

export type {
  PaymentTransaction as PaymentTransactionType,
  PaymentGatewayConfig as PaymentGatewayConfigType,
} from './payment/types'

// Enums
export type {
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  CancellationReason,
  ParticipantStatus,
} from './booking/types'

export type {
  AvailabilityStatus,
  RecurrenceType,
  DayOfWeek,
} from './availability/types'

export type {
  PaymentGateway,
  TransactionType,
  TransactionStatus,
  CurrencyCode,
} from './payment/types'

// Custom Errors
export {
  BookingNotFoundError,
  BookingValidationError,
  BookingAlreadyConfirmedError,
  BookingAlreadyCancelledError,
  InsufficientSpaceError,
  TourUnavailableError,
  InvalidDiscountCodeError,
  RefundNotAllowedError,
  DuplicateBookingError,
} from './booking/types'

export {
  AvailabilitySlotNotFoundError,
  NoAvailableSpacesError,
  AvailabilityConflictError,
  InvalidRecurrenceError,
  CapacityExceededError,
} from './availability/types'

export {
  PaymentTransactionNotFoundError,
  PaymentGatewayError,
  PaymentVerificationFailedError,
  FraudDetectedError,
  PaymentGatewayNotConfiguredError,
} from './payment/types'
