export interface ApprovalExecutionVisibility {
  execution_progress_pct: number;
  execution_method: string;
  execution_tool: string;
  executed_by: string | null;
  changes_count: number;
  errors_count: number;
  verification_passed: boolean | null;
  last_error: string | null;
}

interface ApprovalLike {
  action_type: string;
  execution_status: string | null;
  executor_name: string | null;
  executor_agent_id: string | null;
  execution_notes: string | null;
  requested_by: string | null;
}

const ACTION_METHODS: Record<string, { method: string; tool: string }> = {
  sql_query_fix: {
    method: 'Авто-исправление SQL',
    tool: 'initiative-executor.executeSQLQueryFix + pool.query',
  },
  code_change: {
    method: 'Авто-PR в репозиторий',
    tool: 'initiative-executor.executeCodeChange',
  },
  ui_copy_change: {
    method: 'AI-редактор контента',
    tool: 'initiative-executor.executeTourDescriptionRewrite',
  },
  price_change: {
    method: 'A/B эксперимент цены',
    tool: 'initiative-executor.executeABTestSetup',
  },
  commission_change: {
    method: 'Обновление финансовых правил',
    tool: 'initiative-executor.executeCommissionUpdate',
  },
  booking_rule_change: {
    method: 'Обновление политики бронирований',
    tool: 'initiative-executor.executeCancellationPolicyUpdate',
  },
  send_notification: {
    method: 'Уведомление владельца',
    tool: 'initiative-executor.executeSendNotification (Telegram API)',
  },
  archive_sos: {
    method: 'Авто-архивация SOS',
    tool: 'initiative-executor.executeArchiveSOS',
  },
  operator_outreach: {
    method: 'Outreach операторам',
    tool: 'initiative-executor.executeOperatorOutreach',
  },
  new_page_create: {
    method: 'Генерация страницы + PR',
    tool: 'initiative-executor.executeNewPageCreate',
  },
  ab_scale_winner: {
    method: 'Масштабирование победителя A/B',
    tool: 'initiative-executor.executeABScaleWinner',
  },
};

function statusToProgress(status: string | null): number {
  switch (status) {
    case 'pending': return 0;
    case 'assigned': return 15;
    case 'in_progress': return 60;
    case 'done': return 100;
    case 'failed': return 100;
    default: return 0;
  }
}

function parseExecutionNotes(notes: string | null): {
  changesCount: number;
  errorsCount: number;
  verificationPassed: boolean | null;
  lastError: string | null;
} {
  if (!notes) {
    return { changesCount: 0, errorsCount: 0, verificationPassed: null, lastError: null };
  }
  try {
    const parsed = JSON.parse(notes) as {
      changes_made?: unknown[];
      errors?: unknown[];
      verification_passed?: boolean;
    };
    const changes = Array.isArray(parsed.changes_made) ? parsed.changes_made : [];
    const errors = Array.isArray(parsed.errors) ? parsed.errors : [];
    return {
      changesCount: changes.length,
      errorsCount: errors.length,
      verificationPassed: typeof parsed.verification_passed === 'boolean' ? parsed.verification_passed : null,
      lastError: errors.length > 0 ? String(errors[errors.length - 1]).slice(0, 300) : null,
    };
  } catch {
    return { changesCount: 0, errorsCount: 0, verificationPassed: null, lastError: notes.slice(0, 300) };
  }
}

export function deriveExecutionVisibility(approval: ApprovalLike): ApprovalExecutionVisibility {
  const methodInfo = ACTION_METHODS[approval.action_type] ?? {
    method: 'Кастомный исполнитель',
    tool: 'initiative-executor (custom)',
  };
  const parsed = parseExecutionNotes(approval.execution_notes);

  return {
    execution_progress_pct: statusToProgress(approval.execution_status),
    execution_method: methodInfo.method,
    execution_tool: methodInfo.tool,
    executed_by: approval.executor_name ?? approval.executor_agent_id ?? approval.requested_by,
    changes_count: parsed.changesCount,
    errors_count: parsed.errorsCount,
    verification_passed: parsed.verificationPassed,
    last_error: parsed.lastError,
  };
}
