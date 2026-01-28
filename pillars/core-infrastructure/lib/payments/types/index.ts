/**
 * Type definitions for Payments module
 */

/**
 * Supported payment providers
 */
export type PaymentProvider = 'cloudpayments' | 'stripe' | 'yandex';

/**
 * Payment method type
 */
export type PaymentMethod = 'card' | 'wallet' | 'bank_transfer' | 'other';

/**
 * Payment status
 */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';

/**
 * Refund information
 */
export interface Refund {
  id: string;
  amount: number;
  reason?: string;
  createdAt: number;
  status: 'pending' | 'completed' | 'failed';
}

/**
 * Transaction record
 */
export interface Transaction {
  id: string;
  accountId: string;
  orderId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  provider: PaymentProvider;
  status: PaymentStatus;
  createdAt: number;
  completedAt?: number;
  error?: string;
  metadata: Record<string, unknown>;
  refunds?: Refund[];
}

/**
 * Payment configuration
 */
export interface PaymentConfig {
  provider: PaymentProvider;
  publicKey?: string;
  apiKey: string;
  secretKey?: string;
  webhookSecret?: string;
  sandbox?: boolean;
  currency?: string;
  region?: string;
}

/**
 * Payment request
 */
export interface PaymentRequest {
  amount: number;
  currency?: string;
  method: PaymentMethod;
  accountId: string;
  orderId: string;
  description?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

/**
 * Payment response
 */
export interface PaymentResponse {
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  processedAt: number;
  error?: string;
}

/**
 * Refund request
 */
export interface RefundRequest {
  amount?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Refund response
 */
export interface RefundResponse {
  refundId: string;
  transactionId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  processedAt: number;
}

/**
 * Payout request for operators
 */
export interface PayoutRequest {
  operatorId: string;
  amount: number;
  method: 'bank_transfer' | 'card' | 'wallet';
  currency?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Payout response
 */
export interface PayoutResponse {
  payoutId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  processedAt: number;
}

/**
 * Payment statistics
 */
export interface PaymentStatistics {
  totalTransactions: number;
  totalRevenue: number;
  failedPayments: number;
  successRate: number;
  byStatus: Record<PaymentStatus, number>;
  byMethod: Record<PaymentMethod, number>;
  averageTransactionAmount: number;
}

/**
 * Webhook event from payment provider
 */
export interface PaymentWebhookEvent {
  id: string;
  type: string;
  provider: PaymentProvider;
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Payment settlement report
 */
export interface PaymentSettlementReport {
  period: {
    start: number;
    end: number;
  };
  totalTransactions: number;
  totalAmount: number;
  totalFees: number;
  netAmount: number;
  byProvider: Record<PaymentProvider, {
    count: number;
    amount: number;
    fees: number;
  }>;
  byMethod: Record<PaymentMethod, {
    count: number;
    amount: number;
  }>;
}

/**
 * Card information (for display only, never store full card)
 */
export interface CardInfo {
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
}

/**
 * Customer payment method
 */
export interface PaymentMethodRecord {
  id: string;
  accountId: string;
  type: PaymentMethod;
  cardInfo?: CardInfo;
  walletId?: string;
  bankAccount?: {
    accountNumber: string;
    bankCode: string;
  };
  isDefault: boolean;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

/**
 * Invoice for payment
 */
export interface Invoice {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate?: number;
  createdAt: number;
  paidAt?: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Payment reconciliation report
 */
export interface ReconciliationReport {
  reportId: string;
  period: {
    start: number;
    end: number;
  };
  status: 'pending' | 'completed' | 'discrepancies';
  discrepancies?: Array<{
    transactionId: string;
    expectedAmount: number;
    actualAmount: number;
    difference: number;
  }>;
  generatedAt: number;
}
