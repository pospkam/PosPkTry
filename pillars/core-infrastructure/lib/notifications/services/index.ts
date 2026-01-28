/**
 * Notification services - Public API
 * @module @core-infrastructure/lib/notifications/services
 */

export { NotificationsService, notifications } from './NotificationsService';
export {
  registerTemplate,
  sendNotification,
  sendBatchNotifications,
  getNotificationStatus,
  getNotificationStatistics,
} from './NotificationsService';
