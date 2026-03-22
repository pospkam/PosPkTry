/**
 * Support Pillar - Zod Validation Schemas
 * Type-safe validation for all Support-related DTOs
 */

import { z } from 'zod'

// ============================================================================
// TICKET SCHEMAS
// ============================================================================

export const CreateTicketSchema = z.object({
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(255, 'Subject must be less than 255 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be less than 5000 characters'),
  customerId: z.number().int().positive('Customer ID must be positive'),
  customerName: z
    .string()
    .min(2, 'Customer name must be at least 2 characters')
    .max(100, 'Customer name must be less than 100 characters'),
  customerEmail: z
    .string()
    .email('Invalid email format'),
  category: z
    .enum(['BILLING', 'TECHNICAL', 'BOOKING', 'CANCELLATION', 'REFUND', 'FEEDBACK', 'BUG_REPORT', 'FEATURE_REQUEST', 'OTHER'])
    .optional(),
  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'])
    .optional()
    .default('MEDIUM'),
  relatedBookingId: z.number().int().optional(),
  tags: z.array(z.string()).optional(),
})

export const UpdateTicketSchema = z.object({
  subject: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  status: z
    .enum(['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'REOPENED', 'ON_HOLD'])
    .optional(),
  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'])
    .optional(),
  category: z
    .enum(['BILLING', 'TECHNICAL', 'BOOKING', 'CANCELLATION', 'REFUND', 'FEEDBACK', 'BUG_REPORT', 'FEATURE_REQUEST', 'OTHER'])
    .optional(),
  agentId: z.number().int().optional(),
  tags: z.array(z.string()).optional(),
})

// ============================================================================
// MESSAGE SCHEMAS
// ============================================================================

export const CreateTicketMessageSchema = z.object({
  ticketId: z
    .string()
    .min(1, 'Ticket ID is required'),
  senderId: z
    .string()
    .min(1, 'Sender ID is required'),
  senderName: z
    .string()
    .min(1, 'Sender name is required')
    .max(100),
  senderType: z
    .enum(['CUSTOMER', 'AGENT', 'SYSTEM'])
    .optional()
    .default('CUSTOMER'),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(10000, 'Message must be less than 10000 characters'),
  attachments: z
    .array(z.object({
      url: z.string().url(),
      name: z.string(),
    }))
    .optional(),
  isInternal: z.boolean().optional().default(false),
})

export const RateMessageSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
  rating: z
    .number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  ratingComment: z.string().max(500).optional(),
})

// ============================================================================
// KNOWLEDGE BASE SCHEMAS
// ============================================================================

export const CreateArticleSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(255, 'Title must be less than 255 characters'),
  content: z
    .string()
    .min(20, 'Content must be at least 20 characters')
    .max(50000, 'Content must be less than 50000 characters'),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(100),
  tags: z
    .array(z.string())
    .optional(),
  isPublished: z.boolean().optional().default(false),
})

export const SearchArticlesSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(['views', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['ASC', 'DESC']).optional().default('DESC'),
})

export const CreateFAQSchema = z.object({
  question: z
    .string()
    .min(5, 'Question must be at least 5 characters')
    .max(500, 'Question must be less than 500 characters'),
  answer: z
    .string()
    .min(10, 'Answer must be at least 10 characters')
    .max(5000, 'Answer must be less than 5000 characters'),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(100),
  priority: z.number().int().min(1).max(100).optional().default(1),
})

// ============================================================================
// AGENT SCHEMAS
// ============================================================================

export const CreateAgentSchema = z.object({
  userId: z
    .string()
    .min(1, 'User ID is required'),
  email: z
    .string()
    .email('Invalid email format'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100),
  team: z
    .string()
    .min(1, 'Team is required')
    .optional(),
  specialization: z
    .array(z.string())
    .min(1, 'At least one specialization is required'),
  availability: z
    .object({
      timezone: z.string().optional().default('UTC'),
      workingHours: z
        .object({
          start: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format HH:MM'),
          end: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format HH:MM'),
        })
        .optional(),
      maxConcurrentTickets: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(5),
    })
    .optional(),
})

export const SetAgentStatusSchema = z.object({
  status: z.enum(['ONLINE', 'AWAY', 'BUSY', 'OFFLINE']),
})

// ============================================================================
// FEEDBACK SCHEMAS
// ============================================================================

export const CreateFeedbackSchema = z.object({
  ticketId: z
    .string()
    .min(1, 'Ticket ID is required'),
  customerId: z
    .string()
    .min(1, 'Customer ID is required'),
  agentId: z.string().optional(),
  rating: z
    .number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  comment: z.string().max(1000).optional(),
  categories: z
    .object({
      responseTime: z.number().int().min(1).max(5).optional(),
      resolution: z.number().int().min(1).max(5).optional(),
      professionalism: z.number().int().min(1).max(5).optional(),
      knowledge: z.number().int().min(1).max(5).optional(),
    })
    .optional(),
  wouldRecommend: z.boolean().optional(),
  followUpRequired: z.boolean().optional(),
})

export const CreateSurveySchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  overallRating: z
    .number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  supportQuality: z.number().int().min(1).max(5).optional(),
  responseTime: z.number().int().min(1).max(5).optional(),
  resolution: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
  email: z.string().email().optional(),
})

// ============================================================================
// SLA SCHEMAS
// ============================================================================

export const CreateSLAPolicySchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(255),
  category: z
    .string()
    .min(1, 'Category is required'),
  priority: z
    .string()
    .min(1, 'Priority is required'),
  firstResponseTime: z
    .number()
    .int()
    .min(1, 'First response time must be at least 1 hour')
    .max(168, 'First response time must be less than 168 hours'),
  resolutionTime: z
    .number()
    .int()
    .min(1, 'Resolution time must be at least 1 hour')
    .max(720, 'Resolution time must be less than 720 hours'),
  active: z.boolean().optional().default(true),
})

export const CheckSLAViolationSchema = z.object({
  ticketId: z
    .string()
    .min(1, 'Ticket ID is required'),
})

// ============================================================================
// Export composed validators
// ============================================================================

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>
export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>
export type CreateMessageInput = z.infer<typeof CreateTicketMessageSchema>
export type RateMessageInput = z.infer<typeof RateMessageSchema>
export type CreateArticleInput = z.infer<typeof CreateArticleSchema>
export type SearchArticlesInput = z.infer<typeof SearchArticlesSchema>
export type CreateFeedbackInput = z.infer<typeof CreateFeedbackSchema>
export type CreateSurveyInput = z.infer<typeof CreateSurveySchema>
export type CreateAgentInput = z.infer<typeof CreateAgentSchema>
export type CreateSLAPolicyInput = z.infer<typeof CreateSLAPolicySchema>

/**
 * Safe parse wrapper with error formatting
 */
export function validateInput<T>(schema: z.ZodSchema, data: unknown): { success: boolean; data?: T; errors?: Record<string, string> } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data as T }
  }

  const errors: Record<string, string> = {}
  result.error.errors.forEach((error) => {
    const path = error.path.join('.')
    errors[path] = error.message
  })

  return { success: false, errors }
}
