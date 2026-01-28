/**
 * Type definitions for Notifications module
 */

/**
 * Supported notification channels
 */
export type NotificationChannel = 'email' | 'sms' | 'push';

/**
 * Notification status
 */
export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced';

/**
 * Template variable value type
 */
export type TemplateVariable = string | number | boolean | Date | null;

/**
 * Email service provider
 */
export type EmailProvider = 'smtp' | 'sendgrid' | 'aws-ses' | 'mailgun' | 'nodemailer';

/**
 * SMS service provider
 */
export type SMSProvider = 'twilio' | 'nexmo' | 'aws-sns' | 'custom';

/**
 * Push notification provider
 */
export type PushProvider = 'fcm' | 'apns' | 'custom';

/**
 * Email configuration
 */
export interface EmailConfig {
  provider: EmailProvider;
  from?: string;
  fromName?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  apiKey?: string;
  accountId?: string;
  domain?: string;
  region?: string;
}

/**
 * SMS configuration
 */
export interface SMSConfig {
  provider: SMSProvider;
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  apiKey?: string;
  apiSecret?: string;
  region?: string;
}

/**
 * Push notification configuration
 */
export interface PushConfig {
  provider: PushProvider;
  projectId?: string;
  privateKey?: string;
  clientEmail?: string;
  certificatePath?: string;
  bundleId?: string;
  teamId?: string;
  keyId?: string;
}

/**
 * Notification channel content
 */
export interface NotificationChannelContent {
  subject?: string;
  body: string;
  html?: string;
  variables?: Record<string, TemplateVariable>;
  actionUrl?: string;
  actionText?: string;
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  channels: Record<NotificationChannel, NotificationChannelContent>;
  variables?: string[]; // Expected variable names
  locale?: string;
  createdAt?: number;
  updatedAt?: number;
  isActive?: boolean;
}

/**
 * Notification request
 */
export interface NotificationRequest {
  to: string; // recipient address or token
  channel: NotificationChannel;
  templateId?: string;
  subject?: string;
  html?: string;
  text?: string;
  variables?: Record<string, TemplateVariable>;
  priority?: 'low' | 'normal' | 'high';
  scheduledFor?: number; // timestamp for delayed sending
  retryAttempts?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Notification response
 */
export interface NotificationResponse {
  id: string;
  status: NotificationStatus;
  channel: NotificationChannel;
  sentAt: number;
  deliveredAt?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Batch notification request
 */
export interface BatchNotificationRequest {
  recipients: string[];
  channel: NotificationChannel;
  templateId: string;
  variables?: Record<string, TemplateVariable>;
  priority?: 'low' | 'normal' | 'high';
  metadata?: Record<string, unknown>;
}

/**
 * Notification statistics
 */
export interface NotificationStatistics {
  sent: number;
  failed: number;
  pending: number;
  successRate: number;
  queueSize: number;
  deliveryRate?: number;
}

/**
 * Notification webhook payload
 */
export interface NotificationWebhookPayload {
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Notification event
 */
export interface NotificationEvent {
  id: string;
  type: 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked';
  notificationId: string;
  channel: NotificationChannel;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Email attachment
 */
export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

/**
 * Extended email request
 */
export interface EmailRequest extends NotificationRequest {
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
}

/**
 * SMS rate limit config
 */
export interface SMSRateLimit {
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
}

/**
 * Notification delivery report
 */
export interface NotificationDeliveryReport {
  period: {
    start: number;
    end: number;
  };
  byChannel: Record<NotificationChannel, {
    sent: number;
    delivered: number;
    failed: number;
  }>;
  byStatus: Record<NotificationStatus, number>;
  averageDeliveryTime: number;
  successRate: number;
}
