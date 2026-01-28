/**
 * EventBus services - Public API
 * @module @core-infrastructure/lib/eventbus/services
 */

export { EventBusService, eventBus } from './EventBusService';
export {
  publish,
  subscribe,
  unsubscribe,
  getEventHistory,
  replayEvents,
  getEventStatistics,
} from './EventBusService';
