/**
 * Service Index
 *
 * Re-exports all domain services from their individual modules.
 * This file serves as a backward-compatible entry point so that
 * existing imports from '@/lib/services' continue to work.
 */

// Shared helpers and error classes
export {
  TourNotFoundError,
  TourValidationError,
  TourAlreadyPublishedError,
  ReviewNotFoundError,
  ReviewValidationError,
  DuplicateReviewError,
  toStringOrNull,
  toNumberOrNull,
  toBooleanOrNull,
} from './_helpers';

// Domain services
export { tourService } from './tour.service';
export { reviewService } from './review.service';
export { bookingService, availabilityService } from './booking.service';
export { agentService } from './agent.service';
export { partnerService } from './partner.service';
export { commissionService } from './commission.service';
export { dashboardService } from './dashboard.service';
export { feedbackService } from './feedback.service';
export { knowledgeBaseService } from './knowledge-base.service';
export { messagingService } from './messaging.service';
export { metricsService } from './metrics.service';
export { notificationService } from './notification.service';
export { payoutService } from './payout.service';
export { reportService } from './report.service';
export { searchService } from './search.service';
export { slaService } from './sla.service';
export { ticketMessageService } from './ticket-message.service';
