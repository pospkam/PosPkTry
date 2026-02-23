/**
 * Payment Service
 * Управление платежами и транзакциями
 */

import { Pool } from 'pg';
import { pool } from '@/lib/db';

export interface PaymentInitData {
  bookingId: string;
  amount: number;
  currency: string;
  gateway: string;
  payerName: string;
  payerEmail: string;
  payerPhone?: string;
  returnUrl: string;
  notificationUrl?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentTransaction {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  gateway: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

export class PaymentService {
  private db: Pool;

  constructor(db?: Pool) {
    this.db = db || pool;
  }

  async initiatePayment(data: PaymentInitData) {
    try {
      const result = await this.db.query(
        `INSERT INTO payment_transactions
           (booking_id, amount, currency, gateway, status, payer_name, payer_email, return_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [data.bookingId, data.amount, data.currency, data.gateway,
         data.payerName, data.payerEmail, data.returnUrl]
      );
      const transaction = result.rows[0];
      return {
        transactionId: transaction.id,
        status: 'pending',
        paymentUrl: data.returnUrl,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
    } catch (err) {
      console.error('initiatePayment error:', err);
      throw new Error('Failed to initiate payment');
    }
  }

  async verifyPayment(transactionId: string, verificationData: Record<string, unknown> = {}) {
    try {
      const result = await this.db.query(
        `UPDATE payment_transactions SET status = 'completed', updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [transactionId]
      );
      if (!result.rows[0]) {
        throw new Error('Transaction not found');
      }
      return {
        transactionId,
        status: 'completed' as const,
        transaction: result.rows[0],
      };
    } catch (err) {
      console.error('verifyPayment error:', err);
      throw new Error('Failed to verify payment');
    }
  }

  async getTransaction(id: string): Promise<PaymentTransaction | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM payment_transactions WHERE id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch {
      return null;
    }
  }

  async refund(data: { transactionId: string; refundAmount?: number; reason: string; description?: string }) {
    try {
      const result = await this.db.query(
        `UPDATE payment_transactions SET status = 'refunded', updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [data.transactionId]
      );
      return {
        refundId: `refund_${data.transactionId}`,
        transactionId: data.transactionId,
        status: 'refunded',
        amount: data.refundAmount,
        reason: data.reason,
        processedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error('refund error:', err);
      throw new Error('Failed to process refund');
    }
  }
}

export const paymentService = new PaymentService();
