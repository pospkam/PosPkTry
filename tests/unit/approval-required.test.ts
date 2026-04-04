import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPoolQuery = vi.fn();
const mockAuditWrite = vi.fn();
const mockTelegramSend = vi.fn();

vi.mock('@/lib/db-pool', () => ({
  pool: {
    query: (...args: unknown[]) => mockPoolQuery(...args),
  },
}));

vi.mock('@/lib/agents/safeguards/audit-log', () => ({
  auditLog: {
    write: (...args: unknown[]) => mockAuditWrite(...args),
  },
}));

vi.mock('@/lib/notifications/telegram', () => ({
  telegramService: {
    sendMessage: (...args: unknown[]) => mockTelegramSend(...args),
  },
}));

describe('ApprovalRequired', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('auto-approves safe action and persists approval id', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 'safe-id-1' }] });

    const { ApprovalRequired } = await import('@/lib/agents/safeguards/approval-required');
    const service = new ApprovalRequired();

    const result = await service.request({
      type: 'prompt_optimize',
      description: 'Optimize prompts',
      context: { meeting_id: 'm1' },
      requested_by: 'agent_evo',
    });

    expect(result).toEqual({ needs_approval: false, id: 'safe-id-1' });
    expect(mockPoolQuery).toHaveBeenCalledTimes(1);

    const sql = String(mockPoolQuery.mock.calls[0][0]);
    expect(sql).toContain('INSERT INTO agent_approvals');
    expect(sql).toContain("'approved'");

    expect(mockAuditWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'approval_granted',
        actor: 'agent_evo',
      }),
    );
    expect(mockTelegramSend).not.toHaveBeenCalled();
  });

  it('creates pending request for review action and returns approval id', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 'review-id-1' }] });

    const { ApprovalRequired } = await import('@/lib/agents/safeguards/approval-required');
    const service = new ApprovalRequired();

    const result = await service.request({
      type: 'price_change',
      description: 'Change price by 5%',
      context: { source: 'board' },
      requested_by: 'agent_hacker',
      expires_hours: 12,
    });

    expect(result).toEqual({ needs_approval: true, id: 'review-id-1' });
    expect(mockPoolQuery).toHaveBeenCalledTimes(1);

    const sql = String(mockPoolQuery.mock.calls[0][0]);
    expect(sql).toContain('INSERT INTO agent_approvals');
    expect(sql).toContain('expires_at');
  });
});
