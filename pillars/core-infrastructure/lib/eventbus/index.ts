/**
 * @module @core-infrastructure/lib/eventbus
 *
 * Core Infrastructure EventBus Module
 *
 * Domain-driven event system for loosely-coupled inter-pillar communication.
 * Implements the Event-Driven Architecture pattern for KamHub.
 *
 * Core Concepts:
 * - Domain Events: Immutable records of significant occurrences
 * - Event Sourcing: Store event history for audit trail and replay
 * - Event Handlers: Business logic triggered by events (async by default)
 * - Subscriptions: Subscribe to event patterns with wildcards
 * - Event Replay: Rebuild aggregate state from event history
 *
 * Integration Points:
 * - **Discovery Pillar**: tour.created, tour.updated, tour.deleted, tour.published
 * - **Booking Pillar**: booking.created, booking.confirmed, booking.cancelled, booking.completed
 * - **Engagement Pillar**: review.submitted, review.moderated, rating.updated, comment.added
 * - **Partner Pillar**: partner.registered, partner.verified, partner.suspended, partner.updated
 * - **Core Infrastructure**: cache.invalidated, payment.processed, notification.sent
 *
 * Event Patterns:
 * - Specific: 'tour.created' - subscribe to exact event
 * - Wildcard: 'tour.*' - subscribe to all tour events
 * - Wildcard: '*.created' - subscribe to all creation events
 * - Wildcard: '*' - subscribe to all events
 *
 * Features:
 * - Async event publishing with fire-and-forget
 * - Ordered execution (FIFO per event type)
 * - Priority-based handler execution
 * - Pattern-based subscriptions with wildcards
 * - Event replay for state reconstruction
 * - Event history with TTL-based cleanup
 * - Error handling and recovery
 * - Memory-efficient event storage
 * - Integration-ready for distributed transactions
 *
 * @example
 * ```typescript
 * import {
 *   eventBus,
 *   publish,
 *   subscribe,
 *   getEventHistory,
 *   replayEvents,
 *   DomainEvent,
 *   BookingCreatedEvent,
 * } from '@core-infrastructure/lib/eventbus';
 *
 * // Initialize
 * await eventBus.initialize({
 *   maxHistorySize: 100000,
 *   historyRetention: 86400000, // 24 hours
 *   asyncHandlers: true,
 * });
 *
 * // Subscribe to specific event
 * const subscription1 = subscribe('tour.created', async (event) => {
 *   console.log('New tour:', event.data.name);
 *   // Update search index, send notifications, etc.
 * });
 *
 * // Subscribe to event pattern
 * const subscription2 = subscribe('booking.*', async (event) => {
 *   console.log(`Booking event: ${event.type}`);
 *   // Handle all booking-related events
 * });
 *
 * // Subscribe with priority (higher = earlier execution)
 * const subscription3 = subscribe(
 *   'booking.created',
 *   async (event) => {
 *     // This runs first (priority 10)
 *     console.log('Payment processing...');
 *   },
 *   { priority: 10 }
 * );
 *
 * // Subscribe to run only once
 * const subscription4 = subscribe(
 *   'partner.verified',
 *   async (event) => {
 *     console.log('Partner verified:', event.aggregateId);
 *   },
 *   { once: true }
 * );
 *
 * // Publish tour creation event
 * const tourCreated = await publish({
 *   type: 'tour.created',
 *   aggregateId: 'tour_123',
 *   aggregateType: 'Tour',
 *   data: {
 *     name: 'Kamchatka Volcano Explorer',
 *     description: '10-day adventure tour',
 *     operatorId: 'operator_456',
 *     location: {
 *       region: 'Kamchatka',
 *       coordinates: [56.5, 160.5],
 *     },
 *     basePrice: 150000,
 *     duration: 10,
 *     maxParticipants: 20,
 *     images: ['img1.jpg', 'img2.jpg'],
 *   },
 *   metadata: {
 *     userId: 'user_789',
 *     source: 'discovery-api',
 *     timestamp: Date.now(),
 *   },
 * });
 *
 * console.log(`Event published: ${tourCreated.id}`);
 *
 * // Publish booking event
 * const bookingCreated = await publish({
 *   type: 'booking.created',
 *   aggregateId: 'booking_999',
 *   aggregateType: 'Booking',
 *   data: {
 *     tourId: 'tour_123',
 *     userId: 'user_789',
 *     participants: 2,
 *     totalPrice: 300000,
 *     startDate: 1643673600000,
 *   },
 *   metadata: {
 *     source: 'booking-api',
 *   },
 * });
 *
 * // Get event history
 * const allTourEvents = getEventHistory('tour.*');
 * console.log(`${allTourEvents.length} tour events`);
 *
 * // Get booking event history
 * const bookingEvents = getEventHistory({
 *   eventType: 'booking.*',
 *   aggregateId: 'booking_999',
 *   startTime: Date.now() - 86400000, // Last 24 hours
 * });
 *
 * // Replay events to rebuild booking state
 * interface BookingState {
 *   id: string;
 *   status: 'created' | 'confirmed' | 'cancelled' | 'completed';
 *   totalPrice: number;
 *   refundAmount?: number;
 * }
 *
 * const bookingState = await replayEvents(
 *   'booking_999',
 *   (state: BookingState | undefined, event: DomainEvent) => {
 *     if (!state) {
 *       state = { id: event.aggregateId, status: 'created', totalPrice: 0 };
 *     }
 *
 *     switch (event.type) {
 *       case 'booking.created':
 *         state.totalPrice = (event.data.totalPrice as number);
 *         break;
 *       case 'booking.confirmed':
 *         state.status = 'confirmed';
 *         break;
 *       case 'booking.cancelled':
 *         state.status = 'cancelled';
 *         state.refundAmount = event.data.refundAmount as number;
 *         break;
 *       case 'booking.completed':
 *         state.status = 'completed';
 *         break;
 *     }
 *
 *     return state;
 *   }
 * );
 *
 * console.log(`Booking state: ${JSON.stringify(bookingState)}`);
 *
 * // Get statistics
 * const stats = eventBus.getStatistics();
 * console.log(`Events published: ${stats.totalEventsPublished}`);
 * console.log(`Active subscriptions: ${stats.subscriptionCount}`);
 * console.log(`Success rate: ${stats.successRate}%`);
 *
 * // Unsubscribe
 * eventBus.unsubscribe(subscription1.id);
 *
 * // Graceful shutdown
 * await eventBus.disconnect();
 * ```
 *
 * Advanced Usage - Cross-Pillar Workflows:
 * ```typescript
 * // When booking is created, notify operator and update tour availability
 * subscribe('booking.created', async (event) => {
 *   const booking = event.data;
 *
 *   // Publish notification event for notifications service
 *   await publish({
 *     type: 'notification.send',
 *     aggregateId: 'notif_' + Date.now(),
 *     aggregateType: 'Notification',
 *     data: {
 *       channel: 'email',
 *       recipient: booking.operatorEmail,
 *       template: 'booking_notification',
 *     },
 *   });
 *
 *   // Publish cache invalidation for tour cache
 *   await publish({
 *     type: 'cache.invalidated',
 *     aggregateId: 'cache_tour',
 *     aggregateType: 'Cache',
 *     data: {
 *       keys: [`tour:${booking.tourId}:availability`],
 *     },
 *   });
 * });
 *
 * // When payment is processed, confirm booking
 * subscribe('payment.processed', async (event) => {
 *   if (event.data.status === 'success') {
 *     await publish({
 *       type: 'booking.confirmed',
 *       aggregateId: event.data.bookingId,
 *       aggregateType: 'Booking',
 *       data: {
 *         confirmationCode: generateCode(),
 *         confirmedAt: Date.now(),
 *       },
 *     });
 *   }
 * });
 * ```
 */

export * from './services/index';
export * from './types/index';
