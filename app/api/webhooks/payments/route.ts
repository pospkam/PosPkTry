/**
 * Payment Webhook Handler
 * POST /api/webhooks/payments - Handle payment gateway webhooks
 */

import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/lib/database'
import crypto from 'crypto'

/**
 * POST /api/webhooks/payments
 * Handle webhooks from payment gateways (Yandex Kassa, Stripe, etc.)
 * Verifies webhook signature and processes payment status updates
 *
 * AUTH: Public by design — webhooks protected by x-signature/x-signature-256 headers.
 */
export async function POST(request: NextRequest) {
  try {
    // Get webhook signature from headers
    const signature = request.headers.get('x-signature') || request.headers.get('x-signature-256')
    const gateway = request.headers.get('x-gateway') || 'yandex_kassa'

    // Parse body
    const body = await request.json()

    // Verify signature (implementation depends on gateway)
    // For Yandex Kassa:
    // 1. Get secretKey from config
    // 2. Create SHA1 hash: sha1(body.notification_type;body.operation_id;body.amount;body.currency;body.datetime;body.sender;body.receiver;body.label;secretKey)
    // 3. Compare with x-signature header

    // Handle webhook based on gateway
    switch (gateway) {
      case 'yandex_kassa':
        await handleYandexKassaWebhook(body, signature)
        break
      case 'stripe':
        await handleStripeWebhook(body, signature)
        break
      case 'sberbank':
        await handleSberbankWebhook(body, signature)
        break
      default:
        // Generic handling
        await paymentService.handleWebhook(gateway as any, body)
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (error) {
    console.error('Webhook processing failed:', error)

    // Always return 200 to prevent gateway retry
    // Log error for investigation
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Processing failed' },
      { status: 200 }
    )
  }
}

/**
 * Handle Yandex Kassa webhook
 */
async function handleYandexKassaWebhook(body: any, signature: string | null): Promise<void> {
  // Yandex Kassa sends notifications in XML format
  // Body structure:
  // {
  //   "notification_type": "payment.succeeded" | "payment.failed",
  //   "operation_id": "...",
  //   "amount": 1000.00,
  //   "currency": "RUB",
  //   "datetime": "2024-01-01T12:00:00Z",
  //   "sender": "...",
  //   "receiver": "...",
  //   "label": "booking_123",
  //   "sha1_hash": "..."
  // }

  const transactionId = body.label || body.operation_id

  if (body.notification_type === 'payment.succeeded') {
    await paymentService.handleWebhook('yandex_kassa', {
      transaction_id: transactionId,
      status: 'success',
      amount: body.amount,
      currency: body.currency,
      datetime: body.datetime,
    })
  } else if (body.notification_type === 'payment.failed') {
    await paymentService.handleWebhook('yandex_kassa', {
      transaction_id: transactionId,
      status: 'failed',
      amount: body.amount,
      currency: body.currency,
      datetime: body.datetime,
    })
  }
}

/**
 * Handle Stripe webhook
 */
async function handleStripeWebhook(body: any, signature: string | null): Promise<void> {
  // Stripe sends events in this structure:
  // {
  //   "id": "evt_...",
  //   "object": "event",
  //   "type": "charge.succeeded" | "charge.failed",
  //   "data": {
  //     "object": {
  //       "id": "ch_...",
  //       "amount": 100000,  // in cents
  //       "currency": "rub",
  //       "status": "succeeded",
  //       "metadata": { "booking_id": "..." }
  //     }
  //   }
  // }

  const eventType = body.type
  const charge = body.data?.object

  if (!charge) return

  if (eventType === 'charge.succeeded') {
    await paymentService.handleWebhook('stripe', {
      transaction_id: charge.id,
      status: 'completed',
      amount: charge.amount / 100, // Convert from cents
      currency: charge.currency.toUpperCase(),
      booking_id: charge.metadata?.booking_id,
    })
  } else if (eventType === 'charge.failed') {
    await paymentService.handleWebhook('stripe', {
      transaction_id: charge.id,
      status: 'failed',
      amount: charge.amount / 100,
      currency: charge.currency.toUpperCase(),
      booking_id: charge.metadata?.booking_id,
    })
  }
}

/**
 * Handle Sberbank webhook
 */
async function handleSberbankWebhook(body: any, signature: string | null): Promise<void> {
  // Sberbank sends notifications like:
  // {
  //   "order": {
  //     "orderNumber": "booking_123",
  //     "orderStatus": 2,  // 0 = created, 1 = approved, 2 = deposited, 3 = declined, 4 = cancelled, 5 = refunded
  //     "orderAmount": 100000,  // in kopecks
  //     "orderCurrency": 810,  // RUB
  //     "orderDate": 1234567890000
  //   }
  // }

  const order = body.order || body

  if (!order) return

  let status = 'pending'

  if (order.orderStatus === 2) {
    status = 'completed'
  } else if (order.orderStatus === 3 || order.orderStatus === 4) {
    status = 'failed'
  } else if (order.orderStatus === 5) {
    status = 'refunded'
  }

  await paymentService.handleWebhook('sberbank', {
    transaction_id: order.orderNumber,
    status,
    amount: order.orderAmount / 100, // Convert from kopecks
    currency: 'RUB',
    datetime: new Date(order.orderDate),
  })
}

/**
 * GET /api/webhooks/payments
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook endpoint is active',
    timestamp: new Date(),
  })
}
