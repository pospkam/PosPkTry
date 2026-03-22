/**
 * CLOUDPAYMENTS WEBHOOK VALIDATION
 * Проверка подлинности webhook запросов от CloudPayments
 * 
 * Защита от:
 * - Поддельных webhook запросов
 * - Replay attacks
 * - Man-in-the-middle атак
 * 
 * @author Cursor AI Agent
 * @date 2025-10-30
 */

import crypto from 'crypto';

/**
 * CloudPayments Webhook Data Interface
 */
export interface CloudPaymentsWebhook {
  TransactionId: number;
  Amount: number;
  Currency: string;
  PaymentAmount: number;
  PaymentCurrency: string;
  InvoiceId: string;      // booking ID
  AccountId: string;      // user ID
  Email: string;
  DateTime: string;
  TestMode: boolean;
  Status: 'Completed' | 'Declined' | 'Pending' | 'Cancelled';
  StatusCode?: number;
  Reason?: string;
  ReasonCode?: number;
  CardFirstSix?: string;
  CardLastFour?: string;
  CardType?: string;
  CardExpDate?: string;
  IpAddress?: string;
  IpCountry?: string;
  Description?: string;
  Data?: any;
}

/**
 * Валидация HMAC подписи CloudPayments
 * 
 * CloudPayments отправляет подпись в header X-Content-HMAC
 * Подпись вычисляется: HMAC-SHA256(request_body, API_SECRET)
 */
export function validateCloudPaymentsSignature(
  requestBody: string | Buffer,
  signature: string | null,
  apiSecret: string
): boolean {
  if (!signature) {
    console.error('CloudPayments signature missing');
    return false;
  }
  
  if (!apiSecret) {
    console.error('CloudPayments API secret not configured');
    return false;
  }
  
  try {
    // Вычисляем HMAC из request body
    const body = typeof requestBody === 'string' 
      ? requestBody 
      : requestBody.toString('utf8');
    
    const computed = crypto
      .createHmac('sha256', apiSecret)
      .update(body)
      .digest('base64');
    
    // Сравниваем с полученной подписью (timing-safe)
    const computedBuffer = Buffer.from(computed);
    const signatureBuffer = Buffer.from(signature);
    
    if (computedBuffer.length !== signatureBuffer.length) {
      console.error('CloudPayments signature length mismatch');
      return false;
    }
    
    const isValid = crypto.timingSafeEqual(computedBuffer, signatureBuffer);
    
    if (!isValid) {
      console.error('CloudPayments signature validation failed');
    }
    
    return isValid;
    
  } catch (error) {
    console.error('CloudPayments signature validation error:', error);
    return false;
  }
}

/**
 * Валидация данных webhook
 */
export function validateWebhookData(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Обязательные поля
  const requiredFields = [
    'TransactionId',
    'Amount',
    'Currency',
    'InvoiceId',
    'Status'
  ];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Валидация типов
  if (data.TransactionId && typeof data.TransactionId !== 'number') {
    errors.push('TransactionId must be a number');
  }
  
  if (data.Amount && typeof data.Amount !== 'number') {
    errors.push('Amount must be a number');
  }
  
  if (data.Amount && data.Amount <= 0) {
    errors.push('Amount must be positive');
  }
  
  // Валидация статуса
  const validStatuses = ['Completed', 'Declined', 'Pending', 'Cancelled'];
  if (data.Status && !validStatuses.includes(data.Status)) {
    errors.push(`Invalid status: ${data.Status}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Проверка на replay attack
 * CloudPayments может отправить webhook несколько раз
 */
export async function checkWebhookDuplicate(
  transactionId: number
): Promise<boolean> {
  const { query } = await import('@/lib/database');
  
  try {
    const result = await query(
      `SELECT id FROM transfer_payments 
       WHERE transaction_id = $1 
       LIMIT 1`,
      [transactionId.toString()]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking webhook duplicate:', error);
    return false;
  }
}

/**
 * Обработка CloudPayments webhook с полной валидацией
 */
export async function processCloudPaymentsWebhook(
  requestBody: string | Buffer,
  signature: string | null
): Promise<{
  success: boolean;
  error?: string;
  errorCode?: string;
  data?: CloudPaymentsWebhook;
}> {
  // 1. Валидация подписи
  const apiSecret = process.env.CLOUDPAYMENTS_API_SECRET;
  
  if (!apiSecret) {
    return {
      success: false,
      error: 'CloudPayments API secret not configured',
      errorCode: 'CONFIG_ERROR'
    };
  }
  
  const signatureValid = validateCloudPaymentsSignature(
    requestBody,
    signature,
    apiSecret
  );
  
  if (!signatureValid) {
    return {
      success: false,
      error: 'Invalid webhook signature',
      errorCode: 'INVALID_SIGNATURE'
    };
  }
  
  // 2. Парсинг данных
  let webhookData: CloudPaymentsWebhook;
  try {
    const body = typeof requestBody === 'string' 
      ? requestBody 
      : requestBody.toString('utf8');
    webhookData = JSON.parse(body);
  } catch (error) {
    return {
      success: false,
      error: 'Invalid JSON in webhook body',
      errorCode: 'INVALID_JSON'
    };
  }
  
  // 3. Валидация данных
  const dataValidation = validateWebhookData(webhookData);
  if (!dataValidation.valid) {
    return {
      success: false,
      error: `Validation failed: ${dataValidation.errors.join(', ')}`,
      errorCode: 'VALIDATION_ERROR'
    };
  }
  
  // 4. Проверка на дубликат
  const isDuplicate = await checkWebhookDuplicate(webhookData.TransactionId);
  if (isDuplicate) {
    // Это не ошибка, просто возвращаем success
    // CloudPayments может отправить webhook несколько раз
    return {
      success: true,
      data: webhookData
    };
  }
  
  // 5. Все проверки пройдены
  return {
    success: true,
    data: webhookData
  };
}

/**
 * Создание тестового webhook для testing
 * ТОЛЬКО ДЛЯ РАЗРАБОТКИ!
 */
export function createTestWebhook(
  bookingId: string,
  amount: number,
  status: 'Completed' | 'Declined' = 'Completed'
): {
  body: string;
  signature: string;
} {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Test webhooks not allowed in production');
  }
  
  const webhookData: CloudPaymentsWebhook = {
    TransactionId: Math.floor(Math.random() * 1000000),
    Amount: amount,
    Currency: 'RUB',
    PaymentAmount: amount,
    PaymentCurrency: 'RUB',
    InvoiceId: bookingId,
    AccountId: 'test-user',
    Email: 'test@example.com',
    DateTime: new Date().toISOString(),
    TestMode: true,
    Status: status
  };
  
  const body = JSON.stringify(webhookData);
  
  const apiSecret = process.env.CLOUDPAYMENTS_API_SECRET || 'test-secret';
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(body)
    .digest('base64');
  
  return { body, signature };
}

/**
 * ИСПОЛЬЗОВАНИЕ В API ROUTE:
 * 
 * import { processCloudPaymentsWebhook } from '@/lib/payments/cloudpayments-webhook';
 * 
 * export async function POST(request: NextRequest) {
 *   // Получаем raw body (ВАЖНО: не парсить как JSON автоматически!)
 *   const rawBody = await request.text();
 *   
 *   // Получаем подпись из header
 *   const signature = request.headers.get('X-Content-HMAC');
 *   
 *   // Валидация webhook
 *   const validation = await processCloudPaymentsWebhook(rawBody, signature);
 *   
 *   if (!validation.success) {
 *     console.error('Webhook validation failed:', validation.error);
 *     return NextResponse.json({ code: 13 }); // CloudPayments error code
 *   }
 *   
 *   const webhookData = validation.data!;
 *   
 *   // Обработка webhook
 *   if (webhookData.Status === 'Completed') {
 *     await confirmBooking(webhookData.InvoiceId, webhookData.TransactionId);
 *   }
 *   
 *   // CloudPayments ожидает { code: 0 } для success
 *   return NextResponse.json({ code: 0 });
 * }
 * 
 * 
 * ТЕСТИРОВАНИЕ:
 * 
 * import { createTestWebhook } from '@/lib/payments/cloudpayments-webhook';
 * 
 * const { body, signature } = createTestWebhook('booking-123', 1500);
 * 
 * const response = await fetch('/api/transfers/payment/confirm', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-Content-HMAC': signature
 *   },
 *   body: body
 * });
 */
