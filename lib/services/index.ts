/**
 * Service barrel file — re-exports all domain services.
 * Provides backward compatibility: `import { tourService } from '@/lib/services'` still works.
 */

// Error classes
export {
  TourNotFoundError,
  TourValidationError,
  TourAlreadyPublishedError,
  ReviewNotFoundError,
  ReviewValidationError,
  DuplicateReviewError,
} from './_errors';

// Tour / Review / Search
export { tourService } from './tour.service';
export { reviewService } from './review.service';
export { searchService } from './search.service';

// Booking / Availability
export { bookingService, availabilityService } from './booking.service';

// Partner (operators)
export { partnerService } from './partner.service';

// Payment / Commission / Payout
export { commissionService, payoutService } from './payment.service';

// RAG / Knowledge Base
export { knowledgeBaseService } from './rag.service';

// Chat (conversation-based user-to-user messaging)
export { chatService } from './chat.service';

// Notifications
export { notificationService } from './notification.service';

// Support (agents, feedback, SLA, ticket messages)
export { agentService, feedbackService, slaService, ticketMessageService } from './support.service';

// Analytics (dashboard, metrics, reports)
export { dashboardService, metricsService, reportService } from './analytics.service';

// Pillar services
export { paymentService, PaymentService } from '@/pillars/booking-pillar/lib/payment/services';
export { wishlistService, WishlistService } from '@/pillars/engagement-pillar/lib/wishlist/services';
export { ticketService, TicketService } from '@/pillars/support-pillar/services/ticket.service';
