/**
 * Unit Tests: Validation Schemas
 * Input validation tests
 */

import {
  CreateTicketSchema,
  UpdateTicketSchema,
  CreateFeedbackSchema,
  CreateAgentSchema,
  CreateSLAPolicySchema,
  validateInput,
} from '@/lib/validation/support-schemas'

describe('Support Validation Schemas', () => {
  // ============================================================================
  // CRITICAL TEST 1: Ticket Creation Validation
  // ============================================================================
  describe('CreateTicketSchema', () => {
    it('should validate correct ticket data', () => {
      const validData = {
        subject: 'Payment Issue',
        description: 'I cannot process my payment on the website',
        customerId: 123,
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        category: 'BILLING',
        priority: 'HIGH',
      }

      const result = CreateTicketSchema.safeParse(validData)

      expect(result.success).toBe(true)
    })

    it('should reject ticket without subject', () => {
      const invalidData = {
        description: 'Test description',
        customerId: 123,
        customerName: 'John',
        customerEmail: 'john@example.com',
      }

      const result = CreateTicketSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        subject: 'Test',
        description: 'Test description for ticket',
        customerId: 123,
        customerName: 'John',
        customerEmail: 'invalid-email',
      }

      const result = CreateTicketSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Invalid email')
      }
    })

    it('should reject negative customer ID', () => {
      const invalidData = {
        subject: 'Test',
        description: 'Test description for ticket',
        customerId: -1,
        customerName: 'John',
        customerEmail: 'john@example.com',
      }

      const result = CreateTicketSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })

    it('should set default priority to MEDIUM', () => {
      const data = {
        subject: 'Test',
        description: 'Test description for ticket',
        customerId: 123,
        customerName: 'John',
        customerEmail: 'john@example.com',
      }

      const result = CreateTicketSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.priority).toBe('MEDIUM')
      }
    })
  })

  // ============================================================================
  // CRITICAL TEST 2: Feedback Validation
  // ============================================================================
  describe('CreateFeedbackSchema', () => {
    it('should validate feedback with required fields', () => {
      const validData = {
        ticketId: '1',
        customerId: '123',
        rating: 4,
        comment: 'Great support!',
        wouldRecommend: true,
      }

      const result = CreateFeedbackSchema.safeParse(validData)

      expect(result.success).toBe(true)
    })

    it('should reject rating outside 1-5 range', () => {
      const invalidData = {
        ticketId: '1',
        customerId: '123',
        rating: 10,
      }

      const result = CreateFeedbackSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })

    it('should reject rating of 0', () => {
      const invalidData = {
        ticketId: '1',
        customerId: '123',
        rating: 0,
      }

      const result = CreateFeedbackSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })

    it('should validate category ratings', () => {
      const validData = {
        ticketId: '1',
        customerId: '123',
        rating: 5,
        categories: {
          responseTime: 5,
          resolution: 4,
          professionalism: 5,
          knowledge: 4,
        },
      }

      const result = CreateFeedbackSchema.safeParse(validData)

      expect(result.success).toBe(true)
    })

    it('should reject invalid category ratings', () => {
      const invalidData = {
        ticketId: '1',
        customerId: '123',
        rating: 5,
        categories: {
          responseTime: 10, // Invalid
          resolution: 4,
        },
      }

      const result = CreateFeedbackSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })
  })

  // ============================================================================
  // CRITICAL TEST 3: Agent Creation Validation
  // ============================================================================
  describe('CreateAgentSchema', () => {
    it('should validate agent with required fields', () => {
      const validData = {
        userId: 'user123',
        email: 'agent@company.com',
        name: 'Agent Smith',
        specialization: ['TECHNICAL', 'BILLING'],
      }

      const result = CreateAgentSchema.safeParse(validData)

      expect(result.success).toBe(true)
    })

    it('should reject agent without specialization', () => {
      const invalidData = {
        userId: 'user123',
        email: 'agent@company.com',
        name: 'Agent Smith',
        specialization: [],
      }

      const result = CreateAgentSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })

    it('should validate maxConcurrentTickets range', () => {
      const validData = {
        userId: 'user123',
        email: 'agent@company.com',
        name: 'Agent Smith',
        specialization: ['TECHNICAL'],
        availability: {
          maxConcurrentTickets: 10,
        },
      }

      const result = CreateAgentSchema.safeParse(validData)

      expect(result.success).toBe(true)
    })

    it('should reject maxConcurrentTickets > 50', () => {
      const invalidData = {
        userId: 'user123',
        email: 'agent@company.com',
        name: 'Agent Smith',
        specialization: ['TECHNICAL'],
        availability: {
          maxConcurrentTickets: 100,
        },
      }

      const result = CreateAgentSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })
  })

  // ============================================================================
  // CRITICAL TEST 4: SLA Policy Validation
  // ============================================================================
  describe('CreateSLAPolicySchema', () => {
    it('should validate SLA policy with valid times', () => {
      const validData = {
        name: 'Premium SLA',
        category: 'TECHNICAL',
        priority: 'CRITICAL',
        firstResponseTime: 1,
        resolutionTime: 4,
      }

      const result = CreateSLAPolicySchema.safeParse(validData)

      expect(result.success).toBe(true)
    })

    it('should reject first response time > 168 hours (1 week)', () => {
      const invalidData = {
        name: 'Invalid SLA',
        category: 'TECHNICAL',
        priority: 'LOW',
        firstResponseTime: 200,
        resolutionTime: 48,
      }

      const result = CreateSLAPolicySchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })

    it('should reject resolution time > 720 hours (30 days)', () => {
      const invalidData = {
        name: 'Invalid SLA',
        category: 'TECHNICAL',
        priority: 'LOW',
        firstResponseTime: 4,
        resolutionTime: 800,
      }

      const result = CreateSLAPolicySchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })

    it('should reject 0 or negative times', () => {
      const invalidData = {
        name: 'Invalid SLA',
        category: 'TECHNICAL',
        priority: 'MEDIUM',
        firstResponseTime: 0,
        resolutionTime: -1,
      }

      const result = CreateSLAPolicySchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })
  })

  // ============================================================================
  // CRITICAL TEST 5: validateInput Helper
  // ============================================================================
  describe('validateInput helper', () => {
    it('should return success with valid data', () => {
      const data = {
        subject: 'Test',
        description: 'Test description for ticket',
        customerId: 123,
        customerName: 'John',
        customerEmail: 'john@example.com',
      }

      const result = validateInput(CreateTicketSchema, data)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.errors).toBeUndefined()
    })

    it('should return formatted errors on validation failure', () => {
      const data = {
        subject: '', // Invalid
        description: '', // Invalid
        customerId: -1, // Invalid
        customerName: 'John',
        customerEmail: 'invalid', // Invalid email
      }

      const result = validateInput(CreateTicketSchema, data)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(Object.keys(result.errors!).length).toBeGreaterThan(0)
    })

    it('should format error messages with field paths', () => {
      const data = {
        subject: 'x', // Too short
        description: 'x', // Too short
        customerId: 'not-a-number',
        customerName: 'John',
        customerEmail: 'john@example.com',
      }

      const result = validateInput(CreateTicketSchema, data)

      expect(result.success).toBe(false)
      if (!result.success && result.errors) {
        expect(Object.keys(result.errors).some((key) => key.includes('subject'))).toBe(true)
      }
    })
  })
})
