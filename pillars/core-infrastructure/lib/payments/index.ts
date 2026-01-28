/**
 * @module @core-infrastructure/lib/payments
 *
 * Core Infrastructure Payments Module
 *
 * Multi-provider payment processing service for handling transactions, refunds, and payouts.
 *
 * Supported Providers:
 * - CloudPayments (Russian payments gateway)
 * - Stripe (International payments)
 * - Yandex.Kassa (Russian gateway with KYC)
 *
 * Features:
 * - Payment processing with multiple providers
 * - Support for cards, wallets, bank transfers
 * - Refund and partial refund processing
 * - Payout management for operators
 * - Webhook integration for provider notifications
 * - Transaction history and reconciliation
 * - PCI compliance through tokenization
 * - Idempotent operations
 * - Revenue and settlement tracking
 * - Multi-currency support
 *
 * @example
 * ```typescript
 * import {
 *   payments,
 *   processPayment,
 *   refundPayment,
 *   getPaymentStatistics,
 *   PaymentRequest,
 * } from '@/pillars/core-infrastructure-infrastructure/lib/payments';
 *
 * // Initialize with CloudPayments provider
 * await payments.initialize({
 *   provider: 'cloudpayments',
 *   publicKey: process.env.CLOUDPAYMENTS_PUBLIC_KEY,
 *   apiKey: process.env.CLOUDPAYMENTS_API_KEY,
 *   currency: 'RUB',
 * });
 *
 * // Process a payment
 * const paymentRequest: PaymentRequest = {
 *   amount: 10000, // 100 RUB in kopecks
 *   currency: 'RUB',
 *   method: 'card',
 *   accountId: 'user_123',
 *   orderId: 'order_456',
 *   description: 'Tour booking - Kamchatka Adventure',
 *   metadata: {
 *     tourId: 'tour_789',
 *     participantCount: 2,
 *     tourDate: '2025-03-15',
 *   },
 * };
 *
 * const payment = await processPayment(paymentRequest);
 * console.log(`Payment processed: ${payment.transactionId}`);
 *
 * // Check transaction status
 * const transaction = await payments.getTransaction(payment.transactionId);
 * console.log(`Status: ${transaction?.status}`);
 *
 * // Process refund (if needed)
 * const refund = await refundPayment(payment.transactionId, {
 *   amount: 5000, // Partial refund
 *   reason: 'customer_request',
 * });
 *
 * // Process payout to operator
 * const payout = await payments.processPayout({
 *   operatorId: 'operator_123',
 *   amount: 9000, // Revenue after commission
 *   method: 'bank_transfer',
 *   currency: 'RUB',
 *   description: 'Monthly settlement',
 * });
 *
 * // Get payment statistics
 * const stats = getPaymentStatistics();
 * console.log(`Total Revenue: ${stats.totalRevenue / 100} RUB`);
 * console.log(`Success Rate: ${stats.successRate}%`);
 * console.log(`Avg Transaction: ${stats.averageTransactionAmount / 100} RUB`);
 *
 * // Get transaction history
 * const userTransactions = payments.getTransactionsByAccount('user_123');
 * const orderTransactions = payments.getTransactionsByOrder('order_456');
 *
 * // Register webhook handler for CloudPayments
 * payments.registerWebhookHandler('cloudpayments', (payload) => {
 *   console.log('Payment webhook received:', payload);
 *   // Handle payment notification
 * });
 * ```
 */

export * from './services/index';
export * from './types/index';
