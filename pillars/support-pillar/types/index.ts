/**
 * Support Pillar Types
 * Comprehensive type definitions for customer support, ticketing, and help desk
 */

// ============================================================================
// SUPPORT TICKET
// ============================================================================

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
  ON_HOLD = 'ON_HOLD',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

export enum TicketCategory {
  BILLING = 'BILLING',
  TECHNICAL = 'TECHNICAL',
  BOOKING = 'BOOKING',
  CANCELLATION = 'CANCELLATION',
  REFUND = 'REFUND',
  FEEDBACK = 'FEEDBACK',
  BUG_REPORT = 'BUG_REPORT',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  OTHER = 'OTHER',
}

export interface Ticket {
  id: string
  ticketNumber: string
  customerId: string
  customerName: string
  customerEmail: string
  agentId?: string
  agentName?: string
  category: TicketCategory
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  tags?: string[]
  assignedTo?: string
  assignedToTeam?: string
  relatedBookingId?: string
  relatedOrderId?: string
  attachments?: {
    fileName: string
    fileUrl: string
    fileType: string
    uploadedAt: Date
  }[]
  messages?: TicketMessage[]
  resolution?: string
  resolutionTime?: number // in minutes
  firstResponseTime?: number // in minutes
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  closedAt?: Date
}

// ============================================================================
// TICKET MESSAGES & COMMUNICATION
// ============================================================================

export interface TicketMessage {
  id: string
  ticketId: string
  senderId: string
  senderName: string
  senderType: 'CUSTOMER' | 'AGENT' | 'SYSTEM'
  message: string
  attachments?: {
    fileName: string
    fileUrl: string
    fileType: string
  }[]
  isInternal: boolean
  rating?: number // 1-5 star rating by customer
  ratingComment?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// SUPPORT AGENT
// ============================================================================

export enum AgentStatus {
  ONLINE = 'ONLINE',
  AWAY = 'AWAY',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
}

export interface SupportAgent {
  id: string
  userId: string
  email: string
  name: string
  status: AgentStatus
  team?: string
  specialization?: TicketCategory[]
  activeTickets: number
  totalTicketsResolved: number
  averageResolutionTime?: number
  customerSatisfactionScore?: number
  availability: {
    timezone: string
    workingHours?: {
      start: string
      end: string
    }[]
    maxConcurrentTickets: number
  }
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// KNOWLEDGE BASE & FAQ
// ============================================================================

export interface KnowledgeBaseArticle {
  id: string
  title: string
  slug: string
  content: string
  category: string
  tags?: string[]
  author: string
  views: number
  helpful: number
  unhelpful: number
  relatedArticles?: string[]
  attachments?: {
    fileName: string
    fileUrl: string
  }[]
  isPublished: boolean
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  priority: number
  views: number
  helpful: number
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// FEEDBACK & SURVEY
// ============================================================================

export interface SupportFeedback {
  id: string
  ticketId: string
  customerId: string
  agentId: string
  rating: number // 1-5
  comment?: string
  categories?: {
    responseTime: number
    resolution: number
    professionalism: number
    knowledge: number
  }
  wouldRecommend: boolean
  followUpRequired: boolean
  createdAt: Date
}

export interface SurveySatisfaction {
  id: string
  customerId: string
  overallRating: number // 1-5
  supportQuality: number
  responseTime: number
  resolution: number
  comment?: string
  email: string
  completedAt: Date
}

// ============================================================================
// CANNED RESPONSES & TEMPLATES
// ============================================================================

export interface CannedResponse {
  id: string
  title: string
  category: TicketCategory
  content: string
  shortcut?: string
  createdBy: string
  usageCount: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TicketTemplate {
  id: string
  name: string
  category: TicketCategory
  fields: {
    fieldName: string
    fieldType: string
    required: boolean
    placeholder?: string
  }[]
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// SLA & METRICS
// ============================================================================

export interface SLAPolicy {
  id: string
  name: string
  category: TicketCategory
  priority: TicketPriority
  firstResponseTime: number // in hours
  resolutionTime: number // in hours
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SupportMetrics {
  id: string
  date: Date
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  totalTickets: number
  resolvedTickets: number
  averageResolutionTime: number
  averageFirstResponseTime: number
  customerSatisfactionScore: number
  ticketsByPriority: {
    priority: TicketPriority
    count: number
  }[]
  ticketsByCategory: {
    category: TicketCategory
    count: number
  }[]
  ticketsByStatus: {
    status: TicketStatus
    count: number
  }[]
  topAgents: {
    agentId: string
    agentName: string
    ticketsResolved: number
    satisfactionScore: number
  }[]
  createdAt: Date
}

// ============================================================================
// DTOs
// ============================================================================

export interface CreateTicketDTO {
  customerId: string
  customerName: string
  customerEmail: string
  category: TicketCategory
  subject: string
  description: string
  priority?: TicketPriority
  relatedBookingId?: string
  attachments?: {
    fileName: string
    fileUrl: string
    fileType: string
  }[]
}

export interface UpdateTicketDTO {
  status?: TicketStatus
  priority?: TicketPriority
  assignedTo?: string
  category?: TicketCategory
  tags?: string[]
  resolution?: string
}

export interface CreateTicketMessageDTO {
  ticketId: string
  senderId: string
  senderType: 'CUSTOMER' | 'AGENT' | 'SYSTEM'
  message: string
  isInternal?: boolean
  attachments?: {
    fileName: string
    fileUrl: string
    fileType: string
  }[]
}

export interface CreateFeedbackDTO {
  ticketId: string
  customerId: string
  agentId: string
  rating: number
  comment?: string
  wouldRecommend: boolean
}

export interface CreateSurveyDTO {
  customerId: string
  overallRating: number
  supportQuality: number
  responseTime: number
  resolution: number
  comment?: string
  email: string
}

// ============================================================================
// FILTER INTERFACES
// ============================================================================

export interface TicketFilter {
  status?: TicketStatus
  priority?: TicketPriority
  category?: TicketCategory
  customerId?: string
  agentId?: string
  assignedTo?: string
  team?: string
  fromDate?: Date
  toDate?: Date
  search?: string
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'priority'
  sortOrder?: 'ASC' | 'DESC'
}

export interface KnowledgeBaseFilter {
  category?: string
  search?: string
  tags?: string[]
  isPublished?: boolean
  page?: number
  limit?: number
  sortBy?: 'views' | 'createdAt'
  sortOrder?: 'ASC' | 'DESC'
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class SupportError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'SupportError'
  }
}

export class TicketNotFoundError extends SupportError {
  constructor(ticketId: string) {
    super(`Ticket not found: ${ticketId}`, 'TICKET_NOT_FOUND')
  }
}

export class AgentNotAvailableError extends SupportError {
  constructor() {
    super('No support agents available', 'AGENT_NOT_AVAILABLE')
  }
}

export class InvalidTicketStatusError extends SupportError {
  constructor(currentStatus: string, targetStatus: string) {
    super(
      `Cannot transition from ${currentStatus} to ${targetStatus}`,
      'INVALID_TICKET_STATUS'
    )
  }
}

export class SLAViolationError extends SupportError {
  constructor(slaType: string) {
    super(`SLA violation: ${slaType}`, 'SLA_VIOLATION')
  }
}

export class KnowledgeBaseError extends SupportError {
  constructor(message: string) {
    super(message, 'KNOWLEDGE_BASE_ERROR')
  }
}

export class TicketMessageError extends SupportError {
  constructor(message: string) {
    super(message, 'TICKET_MESSAGE_ERROR')
  }
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface TicketListResponse {
  success: boolean
  data: Ticket[]
  total: number
  page: number
  limit: number
}

export interface TicketResponse {
  success: boolean
  data: Ticket
}

export interface SupportMetricsResponse {
  success: boolean
  data: SupportMetrics
}

export interface KnowledgeBaseListResponse {
  success: boolean
  data: KnowledgeBaseArticle[]
  total: number
  page: number
  limit: number
}
