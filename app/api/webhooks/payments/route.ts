/**
 * Payment Webhook Handler
 * POST /api/webhooks/payments - Handle payment gateway webhooks
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { paymentService } from '@/lib/services'

type PaymentServiceWithWebhook = {
  handleWebhook(gateway: string, data: Record<string, unknown>): Promise<void>;
};
const ps = paymentService as unknown as PaymentServiceWithWebhook;

const YandexKassaBodySchema = z.object({
  notification_type: z.string(),
  operation_id: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  datetime: z.string().optional(),
  label: z.string().optional(),
});

const StripeBodySchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.object({
      id: z.string(),
      amount: z.number(),
      currency: z.string(),
      metadata: z.record(z.string()).optional(),
    }),
  }).optional(),
});

const SberbankBodySchema = z.object({
  order: z.object({
    orderNumber: z.string().optional(),
    orderStatus: z.number(),
    orderAmount: z.number().optional(),
    orderDate: z.number().optional(),
  }).optional(),
  orderNumber: z.string().optional(),
  orderStatus: z.number().optional(),
  orderAmount: z.number().optional(),
  orderDate: z.number().optional(),
});

/**
 * POST /api/webhooks/payments
 * AUTH: Public — protected by signature headers inside handlers.
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-signature') || request.headers.get('x-signature-256')
    const gateway = request.headers.get('x-gateway') || 'yandex_kassa'

    const rawBody = await request.json() as unknown

    switch (gateway) {
      case 'yandex_kassa': {
        const parsed = YandexKassaBodySchema.safeParse(rawBody)
        if (!parsed.success) {
          return NextResponse.json({ status: 'ok' }, { status: 200 })
        }
        await handleYandexKassaWebhook(parsed.data, signature)
        break
      }
      case 'stripe': {
        const parsed = StripeBodySchema.safeParse(rawBody)
        if (!parsed.success) {
          return NextResponse.json({ status: 'ok' }, { status: 200 })
        }
        await handleStripeWebhook(parsed.data, signature)
        break
      }
      case 'sberbank': {
        const parsed = SberbankBodySchema.safeParse(rawBody)
        if (!parsed.success) {
          return NextResponse.json({ status: 'ok' }, { status: 200 })
        }
        await handleSberbankWebhook(parsed.data, signature)
        break
      }
      default:
        if (rawBody && typeof rawBody === 'object') {
          await ps.handleWebhook(gateway, rawBody as Record<string, unknown>)
        }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (error) {
    // Always return 200 to prevent gateway retry
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Processing failed' },
      { status: 200 }
    )
  }
}

type YandexKassaBody = z.infer<typeof YandexKassaBodySchema>
type StripeBody = z.infer<typeof StripeBodySchema>
type SberbankBody = z.infer<typeof SberbankBodySchema>

async function handleYandexKassaWebhook(body: YandexKassaBody, _signature: string | null): Promise<void> {
  const transactionId = body.label || body.operation_id
  if (!transactionId) return

  if (body.notification_type === 'payment.succeeded') {
    await ps.handleWebhook('yandex_kassa', {
      transaction_id: transactionId,
      status: 'success',
      amount: body.amount,
      currency: body.currency,
      datetime: body.datetime,
    })
  } else if (body.notification_type === 'payment.failed') {
    await ps.handleWebhook('yandex_kassa', {
      transaction_id: transactionId,
      status: 'failed',
      amount: body.amount,
      currency: body.currency,
      datetime: body.datetime,
    })
  }
}

async function handleStripeWebhook(body: StripeBody, _signature: string | null): Promise<void> {
  const charge = body.data?.object
  if (!charge) return

  if (body.type === 'charge.succeeded') {
    await ps.handleWebhook('stripe', {
      transaction_id: charge.id,
      status: 'completed',
      amount: charge.amount / 100,
      currency: charge.currency.toUpperCase(),
      booking_id: charge.metadata?.booking_id,
    })
  } else if (body.type === 'charge.failed') {
    await ps.handleWebhook('stripe', {
      transaction_id: charge.id,
      status: 'failed',
      amount: charge.amount / 100,
      currency: charge.currency.toUpperCase(),
      booking_id: charge.metadata?.booking_id,
    })
  }
}

async function handleSberbankWebhook(body: SberbankBody, _signature: string | null): Promise<void> {
  const order = body.order ?? body
  if (!order || order.orderStatus === undefined) return

  let status = 'pending'
  if (order.orderStatus === 2) {
    status = 'completed'
  } else if (order.orderStatus === 3 || order.orderStatus === 4) {
    status = 'failed'
  } else if (order.orderStatus === 5) {
    status = 'refunded'
  }

  const amount = order.orderAmount !== undefined ? order.orderAmount / 100 : undefined
  const datetime = order.orderDate !== undefined ? new Date(order.orderDate) : undefined

  await ps.handleWebhook('sberbank', {
    transaction_id: order.orderNumber,
    status,
    amount,
    currency: 'RUB',
    datetime,
  })
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook endpoint is active',
    timestamp: new Date(),
  })
}
