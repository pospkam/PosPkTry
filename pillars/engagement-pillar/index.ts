/**
 * Engagement Pillar Index
 * Complete export point for all engagement services and types
 * Stage 5: Notifications, Messaging, Wishlist
 */

// Services
export { notificationService, NotificationService } from './lib/notifications/services'
export { messagingService, MessagingService } from './lib/messaging/services'
export { wishlistService, WishlistService } from './lib/wishlist/services'

// Types - Notifications
export type {
  Notification,
  NotificationCreate,
  NotificationUpdate,
  NotificationPreference,
  NotificationPreferenceUpdate,
  NotificationTemplate,
  NotificationLog,
  NotificationAnalytics,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  BulkNotificationCreate,
  BulkNotificationResult,
} from './lib/notifications/types'

export {
  NotificationNotFoundError,
  InvalidChannelError,
  DeliveryFailedError,
  NotificationsMutedError,
  PreferenceNotFoundError,
  TemplateNotFoundError,
  InvalidNotificationTypeError,
} from './lib/notifications/types'

// Types - Messaging
export type {
  Message,
  MessageCreate,
  MessageAttachment,
  Conversation,
  ConversationCreate,
  ConversationUpdate,
  ConversationParticipant,
  SupportTicket,
  MessageFilters,
  ConversationFilters,
  MessagingAnalytics,
  UserMessagingStats,
  OperatorMessagingStats,
  MessageType,
  MessageStatus,
  ConversationStatus,
  ParticipantRole,
} from './lib/messaging/types'

export {
  MessageNotFoundError,
  ConversationNotFoundError,
  ConversationBlockedError,
  NotAParticipantError,
  FileUploadFailedError,
  InvalidMessageTypeError,
  MessageLimitExceededError,
} from './lib/messaging/types'

// Types - Wishlist
export type {
  Wishlist,
  WishlistItem,
  WishlistCreate,
  WishlistUpdate,
  WishlistItemCreate,
  WishlistItemUpdate,
  WishlistComment,
  PriceWatch,
  WishlistComparison,
  WishlistRecommendation,
  WishlistFilters,
  WishlistItemFilters,
  WishlistAnalytics,
  PopularWishlistItems,
  WishlistItemType,
  WishlistStatus,
} from './lib/wishlist/types'

export {
  WishlistNotFoundError,
  DuplicateWishlistItemError,
  InvalidWishlistAccessError,
  WishlistLimitExceededError,
  InvalidShareTokenError,
  PriceWatchNotFoundError,
} from './lib/wishlist/types'
