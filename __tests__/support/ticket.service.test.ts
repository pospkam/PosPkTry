/**
 * Unit Tests: TicketService
 * Critical business logic tests
 */

import { TicketService } from '../../../pillars/support-pillar/services/ticket.service'
import { TicketStatus, TicketPriority } from '../../../pillars/support-pillar/types'

// Mock dependencies
const mockDatabase = {
  query: jest.fn(),
}

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
}

const mockEventBus = {
  publish: jest.fn(),
}

const mockMonitoring = {
  trackEvent: jest.fn(),
  trackDuration: jest.fn(),
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  error: jest.fn(),
}

describe('TicketService', () => {
  let service: TicketService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new TicketService(mockDatabase as any, mockCache as any, mockEventBus as any, mockMonitoring as any)
  })

  // ============================================================================
  // CRITICAL TEST 1: Ticket Creation
  // ============================================================================
  describe('createTicket', () => {
    it('should create ticket with valid input', async () => {
      const ticketData = {
        subject: 'Test ticket',
        description: 'Test description for ticket',
        customerId: '123',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        category: 'TECHNICAL',
        priority: TicketPriority.MEDIUM,
      }

      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            ticket_number: 'TKT-123456',
            subject: ticketData.subject,
            description: ticketData.description,
            status: TicketStatus.OPEN,
            priority: ticketData.priority,
            customer_id: ticketData.customerId,
            customer_name: ticketData.customerName,
            customer_email: ticketData.customerEmail,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      })

      mockDatabase.query.mockResolvedValueOnce({
        rows: [], // No available agents
      })

      const result = await service.createTicket(ticketData)

      expect(result.ticketNumber).toBe('TKT-123456')
      expect(result.subject).toBe(ticketData.subject)
      expect(mockCache.set).toHaveBeenCalled()
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'ticket.created',
        expect.objectContaining({
          ticketId: '1',
        })
      )
    })

    it('should throw error on database failure', async () => {
      const ticketData = {
        subject: 'Test',
        description: 'Test description for ticket',
        customerId: '123',
        customerName: 'John',
        customerEmail: 'john@example.com',
      }

      mockDatabase.query.mockRejectedValueOnce(new Error('Database error'))

      await expect(service.createTicket(ticketData)).rejects.toThrow()
      expect(mockMonitoring.logError).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // CRITICAL TEST 2: Status Transition Validation
  // ============================================================================
  describe('updateTicket - Status Transition', () => {
    it('should validate valid status transitions', async () => {
      const validTransitions = [
        { from: TicketStatus.OPEN, to: TicketStatus.IN_PROGRESS },
        { from: TicketStatus.IN_PROGRESS, to: TicketStatus.RESOLVED },
        { from: TicketStatus.RESOLVED, to: TicketStatus.CLOSED },
      ]

      validTransitions.forEach(({ from, to }) => {
        const isValid = service.validateStatusTransition(from, to)
        expect(isValid).toBe(true)
      })
    })

    it('should reject invalid status transitions', async () => {
      const invalidTransitions = [
        { from: TicketStatus.OPEN, to: TicketStatus.REOPENED },
        { from: TicketStatus.CLOSED, to: TicketStatus.IN_PROGRESS },
      ]

      invalidTransitions.forEach(({ from, to }) => {
        expect(() => {
          service.validateStatusTransition(from, to)
        }).toThrow()
      })
    })

    it('should update ticket with valid data', async () => {
      const updateData = {
        status: TicketStatus.IN_PROGRESS,
        priority: TicketPriority.HIGH,
      }

      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            ticket_number: 'TKT-123456',
            subject: 'Test',
            status: updateData.status,
            priority: updateData.priority,
            updated_at: new Date(),
          },
        ],
      })

      const result = await service.updateTicket('1', updateData)

      expect(result.status).toBe(TicketStatus.IN_PROGRESS)
      expect(mockCache.delete).toHaveBeenCalledWith('ticket:1')
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'ticket.updated',
        expect.any(Object)
      )
    })
  })

  // ============================================================================
  // CRITICAL TEST 3: Ticket Listing with Filters
  // ============================================================================
  describe('listTickets', () => {
    it('should list tickets with pagination', async () => {
      const filter = { page: 1, limit: 20 }

      mockDatabase.query.mockResolvedValueOnce({
        rows: [{ count: 100 }],
      })

      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          { id: '1', ticket_number: 'TKT-001', status: TicketStatus.OPEN },
          { id: '2', ticket_number: 'TKT-002', status: TicketStatus.RESOLVED },
        ],
      })

      const result = await service.listTickets(filter)

      expect(result.total).toBe(100)
      expect(result.data.length).toBe(2)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should filter tickets by status', async () => {
      const filter = { status: TicketStatus.OPEN, page: 1, limit: 20 }

      mockDatabase.query.mockResolvedValueOnce({ rows: [{ count: 10 }] })
      mockDatabase.query.mockResolvedValueOnce({
        rows: [{ id: '1', status: TicketStatus.OPEN }],
      })

      const result = await service.listTickets(filter)

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $'),
        expect.arrayContaining([TicketStatus.OPEN])
      )
      expect(result.data[0].status).toBe(TicketStatus.OPEN)
    })

    it('should search tickets by text', async () => {
      const filter = { search: 'payment issue', page: 1, limit: 20 }

      mockDatabase.query.mockResolvedValueOnce({ rows: [{ count: 5 }] })
      mockDatabase.query.mockResolvedValueOnce({
        rows: [{ id: '1', subject: 'payment issue' }],
      })

      const result = await service.listTickets(filter)

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.any(Array)
      )
    })
  })

  // ============================================================================
  // CRITICAL TEST 4: Auto-assignment to Agents
  // ============================================================================
  describe('assignTicketToAgent', () => {
    it('should assign ticket to available agent', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          {
            id: '10',
            name: 'Agent Smith',
            active_tickets: 2,
            max_concurrent_tickets: 5,
          },
        ],
      })

      mockDatabase.query.mockResolvedValueOnce({ rows: [{ id: '1' }] })

      await service.assignTicketToAgent('1', 'TECHNICAL')

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY active_tickets ASC'),
        expect.any(Array)
      )
    })

    it('should handle case when no agents available', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [], // No available agents
      })

      // Should not throw
      await expect(service.assignTicketToAgent('1', 'TECHNICAL')).resolves.not.toThrow()
    })
  })

  // ============================================================================
  // CRITICAL TEST 5: Ticket Closure
  // ============================================================================
  describe('closeTicket', () => {
    it('should close RESOLVED ticket', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            status: TicketStatus.RESOLVED,
          },
        ],
      })

      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            status: TicketStatus.CLOSED,
            closed_at: new Date(),
          },
        ],
      })

      const result = await service.closeTicket('1')

      expect(result.status).toBe(TicketStatus.CLOSED)
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'ticket.closed',
        expect.any(Object)
      )
    })

    it('should reject closing OPEN ticket', async () => {
      expect(() => {
        service.validateStatusTransition(TicketStatus.OPEN, TicketStatus.CLOSED)
      }).toThrow()
    })
  })
})
