/**
 * Partner Pillar Types
 * Comprehensive type definitions for affiliate management, partnerships, and commission tracking
 */

// ============================================================================
// PARTNER ENTITY
// ============================================================================

export enum PartnerStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

export enum PartnerType {
  INDIVIDUAL = 'INDIVIDUAL',
  AGENCY = 'AGENCY',
  CORPORATION = 'CORPORATION',
  RESELLER = 'RESELLER',
  AFFILIATE = 'AFFILIATE',
}

export enum PartnerTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

export interface BankDetails {
  bankName: string
  accountHolder: string
  accountNumber: string
  routingNumber?: string
  swiftCode?: string
  ibanCode?: string
  currency: 'USD' | 'EUR' | 'RUB' | 'KZT'
  verified: boolean
  verificationDate?: Date
}

export interface Partner {
  id: string
  companyName: string
  contactEmail: string
  contactPhone: string
  contactName: string
  legalName?: string
  registrationNumber?: string
  taxId?: string
  status: PartnerStatus
  type: PartnerType
  tier: PartnerTier
  website?: string
  description?: string
  logoUrl?: string
  coverImageUrl?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  bankDetails?: BankDetails
  commissionPercentage: number
  customCommissionRules?: CommissionRule[]
  minPayoutAmount: number
  payoutFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
  lastPayoutDate?: Date
  totalCommissionEarned: number
  totalCommissionPaid: number
  totalBookings: number
  totalRevenue: number
  partnerSince: Date
  lastActiveDate: Date
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// COMMISSION & PAYMENT
// ============================================================================

export enum CommissionType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  TIERED = 'TIERED',
  DYNAMIC = 'DYNAMIC',
}

export enum CommissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DISPUTED = 'DISPUTED',
}

export interface CommissionRule {
  id: string
  partnerId: string
  type: CommissionType
  rate: number
  minBookingAmount?: number
  maxBookingAmount?: number
  tourCategoryId?: string
  active: boolean
  effectiveFrom: Date
  effectiveUntil?: Date
  createdAt: Date
}

export interface Commission {
  id: string
  partnerId: string
  bookingId: string
  amount: number
  percentage: number
  currency: 'USD' | 'EUR' | 'RUB' | 'KZT'
  status: CommissionStatus
  approvedBy?: string
  approvalDate?: Date
  reason?: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export interface Payout {
  id: string
  partnerId: string
  amount: number
  currency: 'USD' | 'EUR' | 'RUB' | 'KZT'
  status: PayoutStatus
  paymentMethod: 'BANK_TRANSFER' | 'PAYPAL' | 'STRIPE' | 'CRYPTO' | 'CHECK'
  transactionId?: string
  processedAt?: Date
  completedAt?: Date
  failureReason?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// PARTNERSHIP & COLLABORATION
// ============================================================================

export enum PartnershipStatus {
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export interface Partnership {
  id: string
  partnerId: string
  targetPartnerId?: string
  type: 'COLLABORATION' | 'RESELLER' | 'AFFILIATE' | 'EXCLUSIVE' | 'JOINT_VENTURE'
  status: PartnershipStatus
  terms?: string
  exclusivity?: boolean
  exclusive_regions?: string[]
  exclusive_tour_categories?: string[]
  commissionOverride?: number
  contractDocument?: string
  startDate: Date
  endDate?: Date
  createdBy: string
  approvedBy?: string
  approvalDate?: Date
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// REFERRAL & TRACKING
// ============================================================================

export enum ReferralStatus {
  INITIATED = 'INITIATED',
  CONVERTED = 'CONVERTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface Referral {
  id: string
  partnerId: string
  referralCode: string
  referralLink: string
  referredEmail: string
  referredName?: string
  status: ReferralStatus
  convertedBookingId?: string
  bonusAmount?: number
  expiresAt: Date
  convertedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// PERFORMANCE & ANALYTICS
// ============================================================================

export interface PartnerMetrics {
  partnerId: string
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  periodDate: Date
  totalBookings: number
  totalRevenue: number
  totalCommission: number
  totalPaidCommission: number
  averageBookingValue: number
  conversionRate: number
  customerAcquisitionCost?: number
  topTourCategories: { category: string; count: number }[]
  topCustomers: { customerId: string; bookingCount: number }[]
  clickCount: number
  impressionCount: number
  clickThroughRate: number
  newCustomers: number
  repeatCustomers: number
  customerRetentionRate: number
  averageCustomerLifetimeValue: number
  createdAt: Date
}

export interface PartnerPerformance {
  partnerId: string
  month: Date
  bookings: number
  revenue: number
  commission: number
  growth: number
  tier: PartnerTier
  tierEligibility: {
    current: PartnerTier
    nextTier?: PartnerTier
    requirementsMet: number
    totalRequirements: number
  }
  topPerformingTour?: {
    tourId: string
    bookings: number
    revenue: number
  }
}

// ============================================================================
// COMMUNICATION & SUPPORT
// ============================================================================

export interface PartnerMessage {
  id: string
  partnerId: string
  senderId: string
  senderRole: 'PARTNER' | 'ADMIN' | 'SUPPORT'
  subject: string
  message: string
  attachments?: string[]
  isRead: boolean
  readAt?: Date
  repliedAt?: Date
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  createdAt: Date
  updatedAt: Date
}

export interface PartnerNotification {
  id: string
  partnerId: string
  type: 'PAYOUT' | 'COMMISSION' | 'PARTNERSHIP' | 'PERFORMANCE' | 'SYSTEM'
  title: string
  message: string
  actionUrl?: string
  isRead: boolean
  readAt?: Date
  importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// DTOs
// ============================================================================

export interface CreatePartnerDTO {
  companyName: string
  contactEmail: string
  contactPhone: string
  contactName: string
  type: PartnerType
  tier?: PartnerTier
  website?: string
  description?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  minPayoutAmount?: number
  payoutFrequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
}

export interface UpdatePartnerDTO {
  companyName?: string
  contactEmail?: string
  contactPhone?: string
  contactName?: string
  website?: string
  description?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  status?: PartnerStatus
  tier?: PartnerTier
  minPayoutAmount?: number
  payoutFrequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
  metadata?: Record<string, any>
}

export interface CreateCommissionDTO {
  bookingId: string
  partnerId: string
  amount: number
  percentage: number
}

export interface CreatePayoutDTO {
  partnerId: string
  amount: number
  currency: 'USD' | 'EUR' | 'RUB' | 'KZT'
  paymentMethod: 'BANK_TRANSFER' | 'PAYPAL' | 'STRIPE' | 'CRYPTO' | 'CHECK'
  notes?: string
}

export interface CreateReferralDTO {
  partnerId: string
  referredEmail: string
  referredName?: string
}

export interface CreatePartnershipDTO {
  partnerId: string
  targetPartnerId?: string
  type: 'COLLABORATION' | 'RESELLER' | 'AFFILIATE' | 'EXCLUSIVE' | 'JOINT_VENTURE'
  terms?: string
  exclusivity?: boolean
  exclusive_regions?: string[]
  exclusive_tour_categories?: string[]
  commissionOverride?: number
}

// ============================================================================
// FILTER INTERFACES
// ============================================================================

export interface PartnerFilter {
  status?: PartnerStatus
  type?: PartnerType
  tier?: PartnerTier
  country?: string
  minRevenue?: number
  maxRevenue?: number
  minBookings?: number
  maxBookings?: number
  search?: string
  page?: number
  limit?: number
  sortBy?: 'revenue' | 'bookings' | 'commission' | 'createdAt'
  sortOrder?: 'ASC' | 'DESC'
}

export interface CommissionFilter {
  partnerId?: string
  status?: CommissionStatus
  fromDate?: Date
  toDate?: Date
  minAmount?: number
  maxAmount?: number
  page?: number
  limit?: number
  sortBy?: 'amount' | 'createdAt'
  sortOrder?: 'ASC' | 'DESC'
}

export interface PayoutFilter {
  partnerId?: string
  status?: PayoutStatus
  fromDate?: Date
  toDate?: Date
  minAmount?: number
  maxAmount?: number
  page?: number
  limit?: number
  sortBy?: 'amount' | 'createdAt'
  sortOrder?: 'ASC' | 'DESC'
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class PartnerError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'PartnerError'
  }
}

export class PartnerNotFoundError extends PartnerError {
  constructor(partnerId: string) {
    super(`Partner not found: ${partnerId}`, 'PARTNER_NOT_FOUND')
  }
}

export class InvalidPartnerStatusError extends PartnerError {
  constructor(currentStatus: string, targetStatus: string) {
    super(
      `Cannot transition from ${currentStatus} to ${targetStatus}`,
      'INVALID_PARTNER_STATUS'
    )
  }
}

export class InsufficientCommissionError extends PartnerError {
  constructor(required: number, available: number) {
    super(
      `Insufficient commission balance. Required: ${required}, Available: ${available}`,
      'INSUFFICIENT_COMMISSION'
    )
  }
}

export class PayoutProcessingError extends PartnerError {
  constructor(message: string) {
    super(message, 'PAYOUT_PROCESSING_ERROR')
  }
}

export class CommissionCalculationError extends PartnerError {
  constructor(message: string) {
    super(message, 'COMMISSION_CALCULATION_ERROR')
  }
}

export class ReferralExpiredError extends PartnerError {
  constructor(referralId: string) {
    super(`Referral has expired: ${referralId}`, 'REFERRAL_EXPIRED')
  }
}

export class DuplicatePartnershipError extends PartnerError {
  constructor(partnerId: string, targetId: string) {
    super(
      `Partnership already exists between ${partnerId} and ${targetId}`,
      'DUPLICATE_PARTNERSHIP'
    )
  }
}

export class PartnerTierError extends PartnerError {
  constructor(message: string) {
    super(message, 'PARTNER_TIER_ERROR')
  }
}

export class BankDetailsError extends PartnerError {
  constructor(message: string) {
    super(message, 'BANK_DETAILS_ERROR')
  }
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface PartnerListResponse {
  success: boolean
  data: Partner[]
  total: number
  page: number
  limit: number
}

export interface CommissionListResponse {
  success: boolean
  data: Commission[]
  total: number
  page: number
  limit: number
}

export interface PayoutListResponse {
  success: boolean
  data: Payout[]
  total: number
  page: number
  limit: number
}

export interface PartnerMetricsResponse {
  success: boolean
  data: PartnerMetrics
}

export interface PartnerPerformanceResponse {
  success: boolean
  data: PartnerPerformance[]
}
