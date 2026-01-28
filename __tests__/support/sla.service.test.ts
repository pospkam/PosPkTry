/**
 * Unit Tests: SLAService
 * Critical SLA violation detection
 */

import { SLAService } from '../../../pillars/support-pillar/services/sla.service'
import { TicketStatus } from '../../../pillars/support-pillar/types'

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
}

describe('SLAService', () => {
  let service: SLAService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new SLAService(mockDatabase as any, mockCache as any, mockEventBus as any, mockMonitoring as any)
  })

  // ============================================================================
  // CRITICAL TEST 1: SLA Violation Detection
  // ============================================================================
  describe('checkSLAViolation', () => {
    it('should detect first response time violation', async () => {
      const now = Date.now()
      const createdTime = new Date(now - 5 * 60 * 60 * 1000) // 5 hours ago

      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            ticket_number: 'TKT-001',
            category: 'TECHNICAL',
            priority: 'HIGH',
            status: TicketStatus.OPEN,
            created_at: createdTime,
            first_response_at: null, // No response yet
            resolved_at: null,
          },
        ],
      })

      mockCache.get.mockResolvedValueOnce(null)

      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            name: 'High Priority Technical SLA',
            first_response_time_hours: 4, // 4-hour SLA
            resolution_time_hours: 24,
          },
        ],
      })

      mockDatabase.query.mockResolvedValueOnce({
        rows: [{ id: '100' }], // Violation recorded
      })

      const result = await service.checkSLAViolation('1')

      expect(result.violated).toBe(true)
      expect(result.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'FIRST_RESPONSE_SLA',
          })
        )
      )
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'sla.violation_detected',
        expect.any(Object)
      )
    })

    it('should detect resolution time violation', async () => {
      const now = Date.now()
      const createdTime = new Date(now - 30 * 60 * 60 * 1000) // 30 hours ago
      const resolvedTime = new Date(now - 2 * 60 * 60 * 1000) // 2 hours ago

      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            category: 'BILLING',
            priority: 'MEDIUM',
            status: TicketStatus.RESOLVED,
            created_at: createdTime,
            first_response_at: new Date(now - 28 * 60 * 60 * 1000),
            resolved_at: resolvedTime,
          },
        ],
      })

      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            name: 'Billing SLA',
            first_response_time_hours: 4,
            resolution_time_hours: 24, // 24-hour SLA violated
          },
        ],
      })

      mockDatabase.query.mockResolvedValueOnce({
        rows: [{ id: '101' }],
      })

      const result = await service.checkSLAViolation('1')

      expect(result.violated).toBe(true)
      expect(result.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'RESOLUTION_SLA',
          })
        )
      )
    })

    it('should return no violation if within SLA', async () => {
      const now = Date.now()
      const createdTime = new Date(now - 1 * 60 * 60 * 1000) // 1 hour ago

      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            category: 'TECHNICAL',
            priority: 'LOW',
            status: TicketStatus.OPEN,
            created_at: createdTime,
            first_response_at: new Date(now - 30 * 60 * 1000), // Response within 30 mins
            resolved_at: null,
          },
        ],
      })

      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            name: 'Low Priority SLA',
            first_response_time_hours: 4,
            resolution_time_hours: 48,
          },
        ],
      })

      const result = await service.checkSLAViolation('1')

      expect(result.violated).toBe(false)
      expect(result.violations).toEqual([])
    })

    it('should handle missing policy gracefully', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            category: 'UNKNOWN_CATEGORY',
            priority: 'MEDIUM',
            status: TicketStatus.OPEN,
            created_at: new Date(),
            first_response_at: null,
            resolved_at: null,
          },
        ],
      })

      mockDatabase.query.mockResolvedValueOnce({
        rows: [], // No policy found
      })

      const result = await service.checkSLAViolation('1')

      expect(result.violated).toBe(false)
      expect(result.message).toBe('NO_POLICY_FOUND')
      expect(mockMonitoring.logWarning).toHaveBeenCalledWith(
        'No SLA policy found',
        expect.any(Object)
      )
    })

    it('should handle ticket not found error', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [], // No ticket
      })

      await expect(service.checkSLAViolation('999')).rejects.toThrow()
      expect(mockMonitoring.logWarning).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // CRITICAL TEST 2: SLA Policy Management
  // ============================================================================
  describe('createPolicy', () => {
    it('should create SLA policy with valid data', async () => {
      const policyData = {
        name: 'Premium Customer SLA',
        category: 'TECHNICAL',
        priority: 'CRITICAL',
        firstResponseTime: 1,
        resolutionTime: 4,
      }

      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            ...policyData,
            active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      })

      const result = await service.createPolicy(policyData)

      expect(result.name).toBe(policyData.name)
      expect(result.firstResponseTime).toBe(policyData.firstResponseTime)
      expect(mockCache.set).toHaveBeenCalled()
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'sla_policy.created',
        expect.any(Object)
      )
    })
  })

  // ============================================================================
  // CRITICAL TEST 3: Compliance Metrics
  // ============================================================================
  describe('getComplianceMetrics', () => {
    it('should calculate compliance percentage', async () => {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const to = new Date()

      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          {
            total_tickets: 100,
            first_response_violations: 5,
            resolution_violations: 8,
            compliance_percentage: 87,
          },
        ],
      })

      const result = await service.getComplianceMetrics(from, to)

      expect(result.totalTickets).toBe(100)
      expect(result.firstResponseViolations).toBe(5)
      expect(result.resolutionViolations).toBe(8)
      expect(result.totalViolations).toBe(13)
      expect(result.compliancePercentage).toBe(87)
    })

    it('should default to last 30 days', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [{ total_tickets: 50, compliance_percentage: 95 }],
      })

      const result = await service.getComplianceMetrics()

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= $1 AND t.created_at <= $2'),
        expect.any(Array)
      )
    })
  })
})
