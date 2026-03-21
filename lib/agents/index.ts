/**
 * lib/agents — публичный API агентной системы TourHub.
 *
 * Использование:
 *   import { PlatformAgent } from '@/lib/agents';
 *   const result = await PlatformAgent.dispatch({ message: 'дайджест', role: 'admin' });
 */

export { PlatformAgent } from './platform-agent';
export type { AgentIntent, DispatchParams, AgentResult } from './platform-agent';

export { ContextHub } from './context-hub';
export type { AgentContext, UserContext, PlatformContext } from './context-hub';

export { ObservationLogger } from './observation-logger';
export type { ObservationEntry, AgentObservation } from './observation-logger';

export { classifyIntentByKeywords, INTENT_KEYWORDS } from './intent-classifier';

// Learning layer
export { FeedbackLoop } from './learning/feedback-loop';
export type { FeedbackSummary, FeedbackPattern } from './learning/feedback-loop';

export { PatternRecognition } from './learning/pattern-recognition';
export type { IntentMetrics, SystemPattern, PatternSeverity, PatternType } from './learning/pattern-recognition';

export { ExperimentTracker } from './learning/experiment-tracker';

// Safeguards
export { auditLog, AuditLog } from './safeguards/audit-log';
export type { AuditEntry, AuditRecord, AuditEventType } from './safeguards/audit-log';

export { approvalRequired, ApprovalRequired } from './safeguards/approval-required';
export type { ApprovalAction, Approval, ApprovalRequestResult } from './safeguards/approval-required';
