/**
 * Engagement Pillar - Notifications Type Definitions
 * Complete type system for user notifications and alerts
 */

// ============================================================================
// ENUMS & UNIONS
// ============================================================================

export type NotificationType =
  | 'booking_confirmation'
  | 'booking_reminder'
  | 'booking_cancelled'
  | 'payment_success'
  | 'payment_failed'
  | 'refund_processed'
  | 'message_received'
  | 'message_reply'
  | 'review_response'
  | 'tour_published'
  | 'tour_rating_updated'
  | 'operator_new_booking'
  | 'operator_review'
  | 'operator_message'
  | 'special_offer'
  | 'new_feature'
  | 'system_alert'

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app'

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

// ============================================================================
// NOTIFICATION INTERFACE
// ============================================================================

export interface Notification {
  // Identity
  id: string
  userId: string
  notificationType: NotificationType

  // Content
  title: string
  message: string
  description?: string
  icon?: string
  imageUrl?: string

  // Delivery
  channels: NotificationChannel[]
  status: NotificationStatus
  priority: NotificationPriority
  deliveryAttempts: number
  maxRetries: number

  // Targeting
  relatedEntityId?: string // booking ID, tour ID, message ID, etc.
  relatedEntityType?: string // 'booking', 'tour', 'review', etc.
  recipientEmail?: string
  recipientPhone?: string

  // Action
  actionUrl?: string
  actionLabel?: string
  actionType?: 'link' | 'button' | 'deep_link'

  // Metadata
  data?: Record<string, any>
  tags?: string[]

  // Timing
  scheduledFor?: Date
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  expiresAt?: Date

  // User Preferences
  userPreferencesApplied: boolean
  muted: boolean

  // Tracking
  openRate?: number
  clickRate?: number
  bounceRate?: number

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// NOTIFICATION PREFERENCE INTERFACE
// ============================================================================

export interface NotificationPreference {
  id: string
  userId: string

  // Global settings
  notificationsEnabled: boolean
  emailEnabled: boolean
  smsEnabled: boolean
  pushEnabled: boolean
  inAppEnabled: boolean

  // Notification type preferences
  typePreferences: Record<NotificationType, {
    enabled: boolean
    channels: NotificationChannel[]
    frequency?: 'instant' | 'daily' | 'weekly' | 'never'
  }>

  // Quiet hours
  quietHoursEnabled: boolean
  quietHoursStart?: string // HH:MM
  quietHoursEnd?: string // HH:MM
  quietHoursTimezone?: string

  // Frequency limits
  maxEmailsPerDay?: number
  maxSMSPerDay?: number
  maxPushPerDay?: number

  // Unsubscribe
  unsubscribeList?: string[]

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// NOTIFICATION TEMPLATE
// ============================================================================

export interface NotificationTemplate {
  id: string
  type: NotificationType
  channel: NotificationChannel
  name: string
  description?: string

  // Template content
  subject?: string
  titleTemplate: string
  messageTemplate: string
  descriptionTemplate?: string

  // Variables used in template
  variables: string[]

  // Rich content
  htmlTemplate?: string
  jsonTemplate?: Record<string, any>

  // Sender info
  senderName: string
  senderEmail?: string
  senderPhone?: string

  // Settings
  isActive: boolean
  isDefault: boolean
  priority: NotificationPriority

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// NOTIFICATION HISTORY & ANALYTICS
// ============================================================================

export interface NotificationLog {
  id: string
  notificationId: string
  userId: string
  channel: NotificationChannel

  // Delivery info
  recipientAddress: string
  status: NotificationStatus
  statusCode?: number
  errorMessage?: string

  // Timing
  sentAt: Date
  deliveredAt?: Date
  readAt?: Date
  failedAt?: Date

  // Engagement
  opened: boolean
  clicked: boolean
  replied: boolean

  createdAt: Date
}

export interface NotificationAnalytics {
  period: {
    startDate: Date
    endDate: Date
  }

  // Volume
  totalNotifications: number
  notificationsByType: Record<NotificationType, number>
  notificationsByChannel: Record<NotificationChannel, number>
  notificationsByPriority: Record<NotificationPriority, number>

  // Delivery
  totalSent: number
  totalDelivered: number
  totalFailed: number
  totalBounced: number
  deliveryRate: number

  // Engagement
  totalOpened: number
  totalClicked: number
  openRate: number
  clickRate: number
  bounceRate: number

  // User preferences
  preferencesSetCount: number
  unsubscribeCount: number
  muteCount: number

  // Timing
  averageDeliveryTime: number // milliseconds
  peakHours: Array<{ hour: number; count: number }>

  lastUpdated: Date
}

// ============================================================================
// DTOs
// ============================================================================

export interface NotificationCreate {
  userId: string
  notificationType: NotificationType
  title: string
  message: string
  description?: string
  channels?: NotificationChannel[]
  priority?: NotificationPriority
  relatedEntityId?: string
  relatedEntityType?: string
  actionUrl?: string
  actionLabel?: string
  data?: Record<string, any>
  scheduledFor?: Date
  expiresAt?: Date
}

export interface NotificationUpdate {
  status?: NotificationStatus
  muted?: boolean
  readAt?: Date
  data?: Record<string, any>
}

export interface NotificationPreferenceUpdate {
  notificationsEnabled?: boolean
  emailEnabled?: boolean
  smsEnabled?: boolean
  pushEnabled?: boolean
  inAppEnabled?: boolean
  typePreferences?: Record<NotificationType, any>
  quietHoursEnabled?: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  unsubscribeList?: string[]
}

// ============================================================================
// FILTERS & SEARCH
// ============================================================================

export interface NotificationFilters {
  userId?: string
  notificationType?: NotificationType
  status?: NotificationStatus
  priority?: NotificationPriority
  channel?: NotificationChannel
  dateFrom?: Date
  dateTo?: Date
  unread?: boolean
  muted?: boolean
  sortBy?: 'date' | 'priority' | 'status'
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export interface BulkNotificationCreate {
  userIds: string[]
  notificationType: NotificationType
  title: string
  message: string
  description?: string
  channels?: NotificationChannel[]
  priority?: NotificationPriority
  data?: Record<string, any>
  filters?: {
    tourOperators?: boolean
    activeUsers?: boolean
    preferredLanguage?: string
  }
}

export interface BulkNotificationResult {
  totalUsers: number
  successCount: number
  failureCount: number
  skippedCount: number
  notificationIds: string[]
  errors?: Array<{ userId: string; error: string }>
}

// ============================================================================
// DELIVERY TRACKING
// ============================================================================

export interface DeliveryStatus {
  notificationId: string
  channel: NotificationChannel
  status: NotificationStatus
  lastUpdated: Date
  nextRetry?: Date
  retryCount: number
  errorDetails?: {
    code: string
    message: string
    timestamp: Date
  }
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class NotificationNotFoundError extends Error {
  constructor(notificationId: string) {
    super(`Notification not found: ${notificationId}`)
    this.name = 'NotificationNotFoundError'
  }
}

export class NotificationTemplateNotFoundError extends Error {
  constructor(templateId: string) {
    super(`Notification template not found: ${templateId}`)
    this.name = 'NotificationTemplateNotFoundError'
  }
}

export class InvalidNotificationTypeError extends Error {
  constructor(type: string) {
    super(`Invalid notification type: ${type}`)
    this.name = 'InvalidNotificationTypeError'
  }
}

export class InvalidChannelError extends Error {
  constructor(channel: string) {
    super(`Invalid notification channel: ${channel}`)
    this.name = 'InvalidChannelError'
  }
}

export class DeliveryFailedError extends Error {
  constructor(channel: NotificationChannel, reason: string) {
    super(`Delivery failed on ${channel}: ${reason}`)
    this.name = 'DeliveryFailedError'
  }
}

export class NotificationsMutedError extends Error {
  constructor(userId: string) {
    super(`Notifications are muted for user: ${userId}`)
    this.name = 'NotificationsMutedError'
  }
}

export class PreferenceNotFoundError extends Error {
  constructor(userId: string) {
    super(`Notification preference not found for user: ${userId}`)
    this.name = 'PreferenceNotFoundError'
  }
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  Notification,
  NotificationPreference,
  NotificationTemplate,
  NotificationLog,
  NotificationAnalytics,
  NotificationCreate,
  NotificationUpdate,
  NotificationPreferenceUpdate,
  NotificationFilters,
  BulkNotificationCreate,
  BulkNotificationResult,
  DeliveryStatus
}
