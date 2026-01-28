/**
 * @module @core-infrastructure/lib/notifications
 *
 * Core Infrastructure Notifications Module
 *
 * Multi-channel notifications service supporting email, SMS, and push notifications.
 *
 * Features:
 * - Email notifications with template support
 * - SMS notifications with rate limiting
 * - Push notifications (FCM, APNS)
 * - Template management with variable substitution
 * - Batch notification sending
 * - Notification queuing and retry logic
 * - Delivery tracking and status management
 * - Multi-language support
 * - Webhook integration for delivery events
 *
 * @example
 * ```typescript
 * import {
 *   notifications,
 *   registerTemplate,
 *   sendNotification,
 *   sendBatchNotifications,
 *   NotificationTemplate,
 * } from '@core-infrastructure/lib/notifications';
 *
 * // Initialize with configurations
 * await notifications.initialize({
 *   email: {
 *     provider: 'smtp',
 *     from: 'noreply@example.com',
 *     host: 'smtp.gmail.com',
 *     port: 587,
 *     secure: false,
 *     auth: {
 *       user: process.env.SMTP_USER,
 *       pass: process.env.SMTP_PASS,
 *     },
 *   },
 *   sms: {
 *     provider: 'twilio',
 *     accountSid: process.env.TWILIO_ACCOUNT_SID,
 *     authToken: process.env.TWILIO_AUTH_TOKEN,
 *     fromNumber: '+1234567890',
 *   },
 *   push: {
 *     provider: 'fcm',
 *     projectId: process.env.FCM_PROJECT_ID,
 *     privateKey: process.env.FCM_PRIVATE_KEY,
 *     clientEmail: process.env.FCM_CLIENT_EMAIL,
 *   },
 * });
 *
 * // Register templates
 * registerTemplate({
 *   id: 'welcome',
 *   name: 'Welcome Email',
 *   channels: {
 *     email: {
 *       subject: 'Welcome to {{appName}}',
 *       body: 'Hello {{userName}}, welcome!',
 *     },
 *     sms: {
 *       body: 'Welcome to {{appName}}, {{userName}}!',
 *     },
 *     push: {
 *       subject: 'Welcome!',
 *       body: 'Hello {{userName}}, welcome to {{appName}}!',
 *     },
 *   },
 *   variables: ['appName', 'userName'],
 * });
 *
 * // Send single notification
 * const response = await sendNotification({
 *   to: 'user@example.com',
 *   channel: 'email',
 *   templateId: 'welcome',
 *   variables: {
 *     appName: 'KamHub',
 *     userName: 'John',
 *   },
 * });
 *
 * console.log(`Notification sent: ${response.id}`);
 *
 * // Send batch notifications
 * const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
 * const responses = await sendBatchNotifications(
 *   recipients,
 *   'email',
 *   'welcome',
 *   { appName: 'KamHub', userName: 'User' }
 * );
 *
 * console.log(`Sent ${responses.length} notifications`);
 *
 * // Track delivery status
 * const status = getNotificationStatus(response.id);
 * console.log(`Status: ${status?.status}`);
 *
 * // Get statistics
 * const stats = getNotificationStatistics();
 * console.log(`Success rate: ${stats.successRate}%`);
 * ```
 */

export * from './services/index';
export * from './types/index';
