/**
 * INPUT VALIDATION MIDDLEWARE
 * Валидация входных данных с Zod
 * 
 * @author Cursor AI Agent
 * @date 2025-10-30
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Обертка для валидации с Zod схемой
 */
export function withValidation<T extends z.ZodType>(
  schema: T,
  handler: (request: NextRequest, body: z.infer<T>) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      // Парсим body
      const rawBody = await request.json().catch(() => ({}));
      
      // Валидация с Zod
      const validationResult = schema.safeParse(rawBody);
      
      if (!validationResult.success) {
        // Форматируем ошибки валидации
        const errors = validationResult.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return NextResponse.json(
          {
            success: false,
            error: 'Ошибка валидации входных данных',
            errorCode: 'VALIDATION_ERROR',
            errors
          },
          { status: 400 }
        );
      }
      
      // Вызываем оригинальный handler с валидированными данными
      return handler(request, validationResult.data);
      
    } catch (error) {
      console.error('Validation middleware error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Внутренняя ошибка сервера',
          errorCode: 'INTERNAL_ERROR'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Общие Zod типы для переиспользования
 */
export const CommonSchemas = {
  uuid: z.string().uuid('Невалидный UUID'),
  email: z.string().email('Невалидный email'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Невалидный номер телефона'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Невалидная дата (формат: YYYY-MM-DD)'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Невалидное время (формат: HH:MM)'),
  positiveInt: z.number().int().positive('Должно быть положительным целым числом'),
  nonNegativeInt: z.number().int().nonnegative('Должно быть неотрицательным числом'),
};

/**
 * Схемы валидации для Transfer API
 */
export const TransferSchemas = {
  // POST /api/transfers/search
  search: z.object({
    from: z.string().min(1, 'Укажите откуда'),
    to: z.string().min(1, 'Укажите куда'),
    date: CommonSchemas.date,
    passengers: z.number().int().min(1).max(50, 'Максимум 50 пассажиров'),
    vehicleType: z.enum(['economy', 'comfort', 'business', 'minibus', 'bus']).optional(),
    fromCoordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    }).optional(),
    toCoordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    }).optional()
  }),
  
  // POST /api/transfers/book
  book: z.object({
    scheduleId: CommonSchemas.uuid,
    passengersCount: z.number().int().min(1).max(50),
    contactInfo: z.object({
      phone: CommonSchemas.phone,
      email: CommonSchemas.email,
      name: z.string().min(2).max(100).optional()
    }),
    specialRequests: z.string().max(500).optional(),
    fromCoordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional(),
    toCoordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional(),
    departureDate: CommonSchemas.date.optional(),
    vehicleType: z.string().optional(),
    features: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    budgetMax: z.number().positive().optional()
  }),
  
  // POST /api/transfers/confirm
  confirm: z.object({
    bookingId: CommonSchemas.uuid,
    paymentId: z.string().min(1)
  }),
  
  // POST /api/transfers/cancel
  cancel: z.object({
    bookingId: CommonSchemas.uuid,
    reason: z.string().max(500).optional()
  })
};

/**
 * Схемы для Auth API
 */
export const AuthSchemas = {
  // POST /api/auth/signin
  signin: z.object({
    email: CommonSchemas.email,
    password: z.string().min(8, 'Пароль должен быть минимум 8 символов')
  }),
  
  // POST /api/auth/signup
  signup: z.object({
    email: CommonSchemas.email,
    password: z.string()
      .min(8, 'Минимум 8 символов')
      .regex(/[A-Z]/, 'Должна быть хотя бы одна заглавная буква')
      .regex(/[a-z]/, 'Должна быть хотя бы одна строчная буква')
      .regex(/[0-9]/, 'Должна быть хотя бы одна цифра'),
    name: z.string().min(2).max(100),
    role: z.enum(['tourist', 'operator', 'guide', 'provider']).optional()
  })
};

/**
 * Схемы для Payment API
 */
export const PaymentSchemas = {
  // POST /api/transfers/payment/confirm (CloudPayments webhook)
  cloudpaymentsWebhook: z.object({
    TransactionId: z.number(),
    Amount: z.number().positive(),
    Currency: z.string(),
    PaymentAmount: z.number().positive(),
    PaymentCurrency: z.string(),
    InvoiceId: z.string(), // booking ID
    AccountId: z.string(), // user ID
    Email: CommonSchemas.email,
    TestMode: z.boolean().optional(),
    Status: z.enum(['Completed', 'Declined', 'Pending'])
  })
};

/**
 * Пример использования:
 * 
 * import { withValidation, TransferSchemas } from '@/lib/middleware/validation';
 * 
 * export const POST = withValidation(
 *   TransferSchemas.book,
 *   async (request, validatedBody) => {
 *     // validatedBody уже типизирован и провалидирован!
 *     const { scheduleId, passengersCount, contactInfo } = validatedBody;
 *     
 *     // Ваша логика...
 *     
 *     return NextResponse.json({ success: true });
 *   }
 * );
 */
