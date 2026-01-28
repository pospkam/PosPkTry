/**
 * Engagement Pillar - Messaging Type Definitions
 * Complete type system for direct messaging between users and operators
 */

// ============================================================================
// ENUMS & UNIONS
// ============================================================================

export type MessageType = 'text' | 'image' | 'file' | 'system' | 'review_response'

export type MessageStatus = 'draft' | 'sent' | 'delivered' | 'read' | 'failed'

export type ConversationStatus = 'active' | 'archived' | 'closed' | 'spam'

export type ParticipantRole = 'user' | 'operator' | 'admin' | 'moderator'

// ============================================================================
// MESSAGE INTERFACE
// ============================================================================

export interface Message {
  // Identity
  id: string
  conversationId: string
  senderId: string
  senderRole: ParticipantRole
  senderName: string
  senderAvatar?: string

  // Content
  type: MessageType
  content: string
  contentType?: string // MIME type for files/images
  attachments?: MessageAttachment[]

  // Status
  status: MessageStatus
  deliveredAt?: Date
  readAt?: Date
  readBy?: Array<{ userId: string; readAt: Date }>

  // Reply context
  repliedToMessageId?: string
  repliedToContent?: string

  // Reactions & engagement
  reactions?: Array<{ emoji: string; users: string[] }>
  likes?: number

  // Moderation
  flaggedAsInappropriate: boolean
  flaggedReason?: string
  isVisible: boolean
  editedAt?: Date
  editHistory?: Array<{ content: string; editedAt: Date }>

  // Metadata
  ipAddress?: string
  userAgent?: string
  location?: { latitude: number; longitude: number }

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// MESSAGE ATTACHMENT
// ============================================================================

export interface MessageAttachment {
  id: string
  messageId: string
  fileName: string
  fileSize: number
  fileType: string
  mimeType: string
  url: string
  thumbnail?: string
  uploadedAt: Date
}

// ============================================================================
// CONVERSATION INTERFACE
// ============================================================================

export interface Conversation {
  // Identity
  id: string
  type: 'direct' | 'group' | 'support'
  participantIds: string[]
  participants: ConversationParticipant[]

  // Context
  relatedTourId?: string
  relatedBookingId?: string
  relatedReviewId?: string
  subject?: string
  description?: string

  // Status
  status: ConversationStatus
  isBlocked: boolean
  blockedBy?: string
  blockedReason?: string

  // Metadata
  messageCount: number
  lastMessage?: Message
  lastMessageAt?: Date
  unreadCount: Record<string, number> // { userId: unreadCount }

  // Notification settings
  muteNotifications: Record<string, boolean> // { userId: isMuted }

  // Archiving
  archivedAt?: Date
  archivedBy?: string

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// CONVERSATION PARTICIPANT
// ============================================================================

export interface ConversationParticipant {
  id: string
  conversationId: string
  userId: string
  userName: string
  userAvatar?: string
  role: ParticipantRole

  // Participation status
  joinedAt: Date
  leftAt?: Date
  status: 'active' | 'left' | 'removed'

  // Preferences
  muteNotifications: boolean
  unreadCount: number
  lastReadAt?: Date

  // Permissions
  canDelete: boolean
  canEdit: boolean
  canAddMembers: boolean
}

// ============================================================================
// SUPPORT TICKET (for operator support conversations)
// ============================================================================

export interface SupportTicket {
  id: string
  conversationId: string
  ticketNumber: string
  userId: string
  operatorId?: string

  // Category
  category: 'booking' | 'payment' | 'review' | 'technical' | 'other'
  priority: 'low' | 'normal' | 'high' | 'urgent'

  // Status
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened'

  // Resolution
  resolvedAt?: Date
  resolutionTime?: number // minutes
  satisfactionRating?: number // 1-5
  feedbackComment?: string

  // Escalation
  escalatedAt?: Date
  escalatedReason?: string
  escalatedTo?: string // escalation team ID

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// DTOs
// ============================================================================

export interface MessageCreate {
  conversationId: string
  type?: MessageType
  content: string
  attachments?: Array<{
    fileName: string
    fileSize: number
    fileType: string
    mimeType: string
    url: string
  }>
  repliedToMessageId?: string
}

export interface MessageUpdate {
  content?: string
  status?: MessageStatus
  isVisible?: boolean
  readAt?: Date
}

export interface ConversationCreate {
  type: 'direct' | 'group' | 'support'
  participantIds: string[]
  subject?: string
  description?: string
  relatedTourId?: string
  relatedBookingId?: string
  relatedReviewId?: string
  firstMessage?: {
    type: MessageType
    content: string
  }
}

export interface ConversationUpdate {
  subject?: string
  description?: string
  status?: ConversationStatus
  muteNotifications?: boolean
  archiveConversation?: boolean
}

// ============================================================================
// FILTERS & SEARCH
// ============================================================================

export interface MessageFilters {
  conversationId?: string
  senderId?: string
  type?: MessageType
  status?: MessageStatus
  dateFrom?: Date
  dateTo?: Date
  searchQuery?: string
  hasAttachments?: boolean
  isRead?: boolean
  sortBy?: 'date' | 'sender' | 'status'
  sortOrder?: 'asc' | 'desc'
}

export interface ConversationFilters {
  userId?: string
  status?: ConversationStatus
  type?: 'direct' | 'group' | 'support'
  unreadOnly?: boolean
  archivedOnly?: boolean
  relatedTourId?: string
  relatedBookingId?: string
  searchQuery?: string
  sortBy?: 'date' | 'unread_count' | 'participant_count'
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface MessagingAnalytics {
  period: {
    startDate: Date
    endDate: Date
  }

  // Volume
  totalMessages: number
  totalConversations: number
  messagesByType: Record<MessageType, number>
  conversationsByType: Record<string, number>
  conversationsByStatus: Record<ConversationStatus, number>

  // Engagement
  averageMessagesPerConversation: number
  averageResponseTime: number // minutes
  averageConversationDuration: number // hours

  // Users
  totalActiveUsers: number
  totalOperatorsEngaged: number
  usersWithSupportTickets: number

  // Quality
  averageSatisfactionRating: number
  resolvedTicketsPercentage: number
  averageResolutionTime: number // minutes

  // Performance
  averageMessageDeliveryTime: number // seconds
  messageDeliveryFailureRate: number

  lastUpdated: Date
}

export interface UserMessagingStats {
  userId: string
  totalMessagesReceived: number
  totalMessagesSent: number
  totalConversations: number
  unreadMessageCount: number
  activeConversationCount: number
  archivedConversationCount: number
  averageResponseTime: number // minutes
  lastActivityAt?: Date
}

export interface OperatorMessagingStats {
  operatorId: string
  totalMessagesReceived: number
  totalMessagesSent: number
  totalConversations: number
  supportTicketsHandled: number
  averageResolutionTime: number // minutes
  satisfactionRating: number
  busyHours: Array<{ hour: number; messageCount: number }>
  lastActivityAt?: Date
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class MessageNotFoundError extends Error {
  constructor(messageId: string) {
    super(`Message not found: ${messageId}`)
    this.name = 'MessageNotFoundError'
  }
}

export class ConversationNotFoundError extends Error {
  constructor(conversationId: string) {
    super(`Conversation not found: ${conversationId}`)
    this.name = 'ConversationNotFoundError'
  }
}

export class ConversationBlockedError extends Error {
  constructor(conversationId: string) {
    super(`Conversation is blocked: ${conversationId}`)
    this.name = 'ConversationBlockedError'
  }
}

export class NotAParticipantError extends Error {
  constructor(userId: string, conversationId: string) {
    super(`User ${userId} is not a participant of conversation ${conversationId}`)
    this.name = 'NotAParticipantError'
  }
}

export class InvalidMessageTypeError extends Error {
  constructor(type: string) {
    super(`Invalid message type: ${type}`)
    this.name = 'InvalidMessageTypeError'
  }
}

export class FileUploadFailedError extends Error {
  constructor(fileName: string) {
    super(`Failed to upload file: ${fileName}`)
    this.name = 'FileUploadFailedError'
  }
}

export class InsufficientPermissionsError extends Error {
  constructor(action: string) {
    super(`Insufficient permissions for action: ${action}`)
    this.name = 'InsufficientPermissionsError'
  }
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  Message,
  MessageAttachment,
  Conversation,
  ConversationParticipant,
  SupportTicket,
  MessageCreate,
  MessageUpdate,
  ConversationCreate,
  ConversationUpdate,
  MessageFilters,
  ConversationFilters,
  MessagingAnalytics,
  UserMessagingStats,
  OperatorMessagingStats
}
