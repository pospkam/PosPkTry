/**
 * Booking Pillar - Availability Type Definitions
 * Complete type system for tour availability and calendar management
 */

// ============================================================================
// ENUMS & UNIONS
// ============================================================================

export type AvailabilityStatus = 'available' | 'booked' | 'unavailable' | 'maintenance'

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

// ============================================================================
// AVAILABILITY SLOT INTERFACE
// ============================================================================

export interface AvailabilitySlot {
  id: string
  tourId: string
  date: Date
  startTime: string // HH:MM format
  endTime: string // HH:MM format

  // Capacity Management
  totalCapacity: number
  bookedSpaces: number
  availableSpaces: number
  reservedSpaces: number // Reserved but not paid
  blockingReason?: string

  // Status
  status: AvailabilityStatus
  isClosed: boolean

  // Pricing
  basePrice: number
  dynamicPrice?: number
  priceMultiplier: number

  // Settings
  minParticipants: number
  maxParticipants: number
  bookingDeadlineHours: number
  cancellationDeadlineHours: number

  // Metadata
  guideAssigned?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// AVAILABILITY PERIOD (Multi-day tours)
// ============================================================================

export interface AvailabilityPeriod {
  id: string
  tourId: string
  startDate: Date
  endDate: Date
  startTime: string
  endTime: string
  durationDays: number

  // Capacity
  totalCapacity: number
  bookedSpaces: number
  availableSpaces: number

  // Status
  status: AvailabilityStatus
  isClosed: boolean

  // Pricing
  basePrice: number
  dynamicPrice?: number

  // Settings
  minParticipants: number
  maxParticipants: number
  accommodationIncluded: boolean

  // Metadata
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// RECURRING AVAILABILITY
// ============================================================================

export interface RecurringAvailability {
  id: string
  tourId: string
  recurrenceType: RecurrenceType
  startDate: Date
  endDate?: Date

  // Weekly Recurrence
  daysOfWeek?: DayOfWeek[]

  // Monthly Recurrence
  dayOfMonth?: number
  weekOfMonth?: number

  // Time
  startTime: string
  endTime: string

  // Capacity
  totalCapacity: number
  pricePerPerson: number

  // Exceptions
  exceptions?: AvailabilityException[]

  // Status
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// AVAILABILITY EXCEPTION
// ============================================================================

export interface AvailabilityException {
  id: string
  recurringAvailabilityId: string
  date: Date
  status: 'available' | 'booked' | 'unavailable' | 'maintenance'
  capacityOverride?: number
  priceOverride?: number
  reason?: string
  createdAt: Date
}

// ============================================================================
// BLOCKING & MAINTENANCE
// ============================================================================

export interface AvailabilityBlock {
  id: string
  tourId: string
  startDate: Date
  endDate: Date
  reason: 'maintenance' | 'guide_unavailable' | 'weather' | 'other'
  description: string
  blockType: 'full' | 'partial'
  capacity?: number // For partial blocks
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// DYNAMIC PRICING
// ============================================================================

export interface DynamicPricingRule {
  id: string
  tourId: string
  name: string
  description?: string

  // Trigger Conditions
  daysUntilTour?: number
  occupancyPercentage?: number
  daysOfWeek?: DayOfWeek[]
  seasonType?: 'peak' | 'shoulder' | 'low'

  // Pricing
  basePrice: number
  multiplier: number // 0.5 = 50% off, 1.5 = 50% markup
  fixedPrice?: number

  // Applicability
  minGroupSize?: number
  maxGroupSize?: number
  applicableOnWeekends?: boolean
  applicableOnHolidays?: boolean

  // Status
  isActive: boolean
  validFrom: Date
  validUntil?: Date

  // Priority
  priority: number // Higher = applied first

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// PRICING TIER
// ============================================================================

export interface PricingTier {
  id: string
  tourId: string
  name: string
  participantCountFrom: number
  participantCountTo?: number
  pricePerPerson: number
  discount: number
  createdAt: Date
}

// ============================================================================
// CAPACITY SETTINGS
// ============================================================================

export interface CapacitySettings {
  id: string
  tourId: string

  // Hard Limits
  absoluteMaxCapacity: number
  absoluteMinCapacity: number

  // Soft Limits
  recommendedMaxCapacity: number
  recommendedMinCapacity: number

  // Booking Buffer
  overbookingAllowed: boolean
  overbookingPercentage?: number // e.g., 10% for 10% overbooking

  // Cancellation Buffer
  cancellationBuffer: number // Min hours before tour to accept cancellations

  // Group Settings
  minGroupSize: number
  maxGroupSize: number

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// DTOs
// ============================================================================

export interface AvailabilitySlotCreate {
  tourId: string
  date: Date
  startTime: string
  endTime: string
  totalCapacity: number
  basePrice: number
  minParticipants: number
  maxParticipants: number
  bookingDeadlineHours?: number
  cancellationDeadlineHours?: number
  notes?: string
}

export interface AvailabilitySlotUpdate {
  totalCapacity?: number
  basePrice?: number
  minParticipants?: number
  maxParticipants?: number
  status?: AvailabilityStatus
  isClosed?: boolean
  notes?: string
}

export interface RecurringAvailabilityCreate {
  tourId: string
  recurrenceType: RecurrenceType
  startDate: Date
  endDate?: Date
  daysOfWeek?: DayOfWeek[]
  dayOfMonth?: number
  startTime: string
  endTime: string
  totalCapacity: number
  pricePerPerson: number
}

export interface AvailabilityBlockCreate {
  tourId: string
  startDate: Date
  endDate: Date
  reason: 'maintenance' | 'guide_unavailable' | 'weather' | 'other'
  description: string
  blockType: 'full' | 'partial'
  capacity?: number
}

export interface DynamicPricingRuleCreate {
  tourId: string
  name: string
  description?: string
  daysUntilTour?: number
  occupancyPercentage?: number
  basePrice: number
  multiplier: number
  minGroupSize?: number
  maxGroupSize?: number
  isActive?: boolean
  validFrom?: Date
  validUntil?: Date
  priority?: number
}

// ============================================================================
// AVAILABILITY FILTERS & SEARCH
// ============================================================================

export interface AvailabilitySearch {
  tourId?: string
  dateFrom?: Date
  dateTo?: Date
  minAvailableSpaces?: number
  maxPrice?: number
  minPrice?: number
  status?: AvailabilityStatus
  sortBy?: 'date' | 'price' | 'available_spaces'
  sortOrder?: 'asc' | 'desc'
}

export interface AvailabilityCalendar {
  tourId: string
  startDate: Date
  endDate: Date
  slots: AvailabilitySlot[]
  periods: AvailabilityPeriod[]
  blocks: AvailabilityBlock[]
  recurring: RecurringAvailability[]
}

// ============================================================================
// CALENDAR EXPORT
// ============================================================================

export interface CalendarExport {
  tourId: string
  format: 'ics' | 'csv' | 'json'
  startDate: Date
  endDate: Date
  includeBlocked: boolean
  data: string // Actual calendar data
}

// ============================================================================
// AVAILABILITY STATISTICS
// ============================================================================

export interface AvailabilityStats {
  tourId: string
  totalSlots: number
  availableSlots: number
  fullyBookedSlots: number
  unavailableSlots: number
  maintenanceSlots: number
  totalCapacity: number
  totalBooked: number
  totalAvailable: number
  occupancyRate: number
  avgPricePerSlot: number
  priceRange: { min: number; max: number }
  busiestsMonths: Array<{ month: string; bookingPercentage: number }>
  lastUpdated: Date
}

export interface AvailabilityForecast {
  tourId: string
  forecastDate: Date
  predictedOccupancy: number
  predictedPrice: number
  recommendedActions: string[]
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class AvailabilitySlotNotFoundError extends Error {
  constructor(slotId: string) {
    super(`Availability slot not found: ${slotId}`)
    this.name = 'AvailabilitySlotNotFoundError'
  }
}

export class NoAvailableSpacesError extends Error {
  constructor(tourId: string, date: Date) {
    super(`No available spaces for tour ${tourId} on ${date.toISOString().split('T')[0]}`)
    this.name = 'NoAvailableSpacesError'
  }
}

export class AvailabilityConflictError extends Error {
  constructor(tourId: string, date: string) {
    super(`Availability conflict for tour ${tourId} on ${date}`)
    this.name = 'AvailabilityConflictError'
  }
}

export class InvalidRecurrenceError extends Error {
  constructor(message: string) {
    super(`Invalid recurrence: ${message}`)
    this.name = 'InvalidRecurrenceError'
  }
}

export class CapacityExceededError extends Error {
  constructor(tourId: string, requested: number, maxCapacity: number) {
    super(
      `Capacity exceeded: requested ${requested}, max capacity ${maxCapacity} for tour ${tourId}`
    )
    this.name = 'CapacityExceededError'
  }
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  AvailabilitySlot,
  AvailabilityPeriod,
  RecurringAvailability,
  AvailabilityException,
  AvailabilityBlock,
  DynamicPricingRule,
  PricingTier,
  CapacitySettings,
  AvailabilitySlotCreate,
  AvailabilitySlotUpdate,
  RecurringAvailabilityCreate,
  AvailabilityBlockCreate,
  DynamicPricingRuleCreate,
  AvailabilitySearch,
  AvailabilityCalendar,
  CalendarExport,
  AvailabilityStats,
  AvailabilityForecast
}
