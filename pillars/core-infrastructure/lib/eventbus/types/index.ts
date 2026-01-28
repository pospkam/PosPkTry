/**
 * Type definitions for EventBus module
 * Domain events for inter-pillar communication
 */

/**
 * Event handler function type
 */
export type EventHandler = (event: DomainEvent) => void | Promise<void>;

/**
 * Domain event base interface
 */
export interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  publishedAt: number;
}

/**
 * Event listener registry entry
 */
export interface EventListener {
  id: string;
  handler: EventHandler;
  priority: number;
  once: boolean;
  createdAt: number;
}

/**
 * Event subscription
 */
export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  createdAt: number;
}

/**
 * EventBus configuration
 */
export interface EventBusConfig {
  maxHistorySize: number;
  historyRetention: number;
  maxListenersPerEvent: number;
  enableEventSourcing: boolean;
  asyncHandlers: boolean;
}

/**
 * Event filter for querying history
 */
export interface EventFilter {
  eventType?: string;
  aggregateId?: string;
  aggregateType?: string;
  startTime?: number;
  endTime?: number;
}

/**
 * Event statistics
 */
export interface EventStatistics {
  totalEventsPublished: number;
  totalEventErrors: number;
  historySize: number;
  subscriptionCount: number;
  eventsByType: Record<string, number>;
  listenersByType: Record<string, number>;
  successRate: number;
}

/**
 * Event snapshot at point in time
 */
export interface EventSnapshot {
  timestamp: number;
  totalEvents: number;
  totalErrors: number;
  historySize: number;
  listenerCount: number;
  subscriptionCount: number;
  successRate: number;
}

/**
 * Discovery Pillar Events
 */
export interface TourCreatedEvent extends DomainEvent {
  type: 'tour.created';
  aggregateType: 'Tour';
  data: {
    name: string;
    description: string;
    operatorId: string;
    location: {
      region: string;
      coordinates: [number, number];
    };
    basePrice: number;
    duration: number;
    maxParticipants: number;
    images: string[];
  };
}

export interface TourUpdatedEvent extends DomainEvent {
  type: 'tour.updated';
  aggregateType: 'Tour';
  data: {
    changes: Record<string, unknown>;
  };
}

export interface TourDeletedEvent extends DomainEvent {
  type: 'tour.deleted';
  aggregateType: 'Tour';
  data: {
    reason?: string;
  };
}

export interface TourPublishedEvent extends DomainEvent {
  type: 'tour.published';
  aggregateType: 'Tour';
  data: {
    publishedAt: number;
  };
}

/**
 * Booking Pillar Events
 */
export interface BookingCreatedEvent extends DomainEvent {
  type: 'booking.created';
  aggregateType: 'Booking';
  data: {
    tourId: string;
    userId: string;
    participants: number;
    totalPrice: number;
    startDate: number;
  };
}

export interface BookingConfirmedEvent extends DomainEvent {
  type: 'booking.confirmed';
  aggregateType: 'Booking';
  data: {
    confirmationCode: string;
    confirmedAt: number;
  };
}

export interface BookingCancelledEvent extends DomainEvent {
  type: 'booking.cancelled';
  aggregateType: 'Booking';
  data: {
    reason: string;
    refundAmount: number;
  };
}

export interface BookingCompletedEvent extends DomainEvent {
  type: 'booking.completed';
  aggregateType: 'Booking';
  data: {
    completedAt: number;
  };
}

/**
 * Engagement Pillar Events
 */
export interface ReviewSubmittedEvent extends DomainEvent {
  type: 'review.submitted';
  aggregateType: 'Review';
  data: {
    tourId: string;
    userId: string;
    rating: number;
    text: string;
    images: string[];
  };
}

export interface ReviewModeratedEvent extends DomainEvent {
  type: 'review.moderated';
  aggregateType: 'Review';
  data: {
    status: 'approved' | 'rejected' | 'flagged';
    reason?: string;
  };
}

export interface RatingUpdatedEvent extends DomainEvent {
  type: 'rating.updated';
  aggregateType: 'Tour';
  data: {
    averageRating: number;
    reviewCount: number;
  };
}

export interface CommentAddedEvent extends DomainEvent {
  type: 'comment.added';
  aggregateType: 'Review';
  data: {
    userId: string;
    text: string;
  };
}

/**
 * Partner Pillar Events
 */
export interface PartnerRegisteredEvent extends DomainEvent {
  type: 'partner.registered';
  aggregateType: 'Partner';
  data: {
    name: string;
    email: string;
    phone: string;
    companyName: string;
    registeredAt: number;
  };
}

export interface PartnerVerifiedEvent extends DomainEvent {
  type: 'partner.verified';
  aggregateType: 'Partner';
  data: {
    verificationCode: string;
    verifiedAt: number;
  };
}

export interface PartnerSuspendedEvent extends DomainEvent {
  type: 'partner.suspended';
  aggregateType: 'Partner';
  data: {
    reason: string;
    suspendedAt: number;
  };
}

export interface PartnerUpdatedEvent extends DomainEvent {
  type: 'partner.updated';
  aggregateType: 'Partner';
  data: {
    changes: Record<string, unknown>;
  };
}

/**
 * System Events (Core Infrastructure)
 */
export interface CacheInvalidatedEvent extends DomainEvent {
  type: 'cache.invalidated';
  aggregateType: 'Cache';
  data: {
    keys: string[];
  };
}

export interface PaymentProcessedEvent extends DomainEvent {
  type: 'payment.processed';
  aggregateType: 'Transaction';
  data: {
    amount: number;
    currency: string;
    status: 'success' | 'failed';
  };
}

export interface NotificationSentEvent extends DomainEvent {
  type: 'notification.sent';
  aggregateType: 'Notification';
  data: {
    channel: 'email' | 'sms' | 'push';
    recipient: string;
    status: 'sent' | 'failed';
  };
}

/**
 * Union type of all domain events
 */
export type AllDomainEvents =
  | TourCreatedEvent
  | TourUpdatedEvent
  | TourDeletedEvent
  | TourPublishedEvent
  | BookingCreatedEvent
  | BookingConfirmedEvent
  | BookingCancelledEvent
  | BookingCompletedEvent
  | ReviewSubmittedEvent
  | ReviewModeratedEvent
  | RatingUpdatedEvent
  | CommentAddedEvent
  | PartnerRegisteredEvent
  | PartnerVerifiedEvent
  | PartnerSuspendedEvent
  | PartnerUpdatedEvent
  | CacheInvalidatedEvent
  | PaymentProcessedEvent
  | NotificationSentEvent;

/**
 * Event sourcing state reducer type
 */
export type EventReducer<T> = (state: T | undefined, event: DomainEvent) => T;

/**
 * Event policy definition
 */
export interface EventPolicy {
  id: string;
  triggerEvent: string; // Event type pattern
  actions: Array<{
    type: 'publish' | 'emit' | 'call' | 'notify';
    config: Record<string, unknown>;
  }>;
}

/**
 * Sagas for complex, multi-step processes
 */
export interface EventSaga {
  id: string;
  name: string;
  steps: Array<{
    trigger: string; // Event type pattern
    action: (event: DomainEvent) => Promise<void>;
    compensate?: (event: DomainEvent) => Promise<void>;
  }>;
  compensationOnError: boolean;
}

/**
 * Distributed transaction coordinator
 */
export interface DistributedTransaction {
  id: string;
  steps: Array<{
    pillar: string;
    action: string;
    status: 'pending' | 'success' | 'failed' | 'compensated';
    compensated?: boolean;
  }>;
  status: 'in-progress' | 'completed' | 'failed' | 'compensated';
  createdAt: number;
  completedAt?: number;
}
