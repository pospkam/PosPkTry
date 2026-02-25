/**
 * API endpoint для регистрации нового партнера
 * POST /api/partners/register
 * 
 * Соответствует требованиям 152-ФЗ
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { z } from 'zod';

// Валидация входных данных
const registerSchema = z.object({
  // Тип бизнеса
  businessType: z.enum(['individual', 'ip', 'ooo', 'other']),
  
  // Юридические данные
  companyName: z.string().min(2, 'Наименование должно быть минимум 2 символа'),
  tradeName: z.string().optional(),
  inn: z.string().min(10, 'Некорректный ИНН').max(12),
  ogrn: z.string().optional(),
  kpp: z.string().optional(),
  legalAddress: z.string().min(10, 'Введите юридический адрес'),
  actualAddress: z.string().optional(),
  
  // Контактные данные
  contactPerson: z.string().min(2, 'Введите ФИО контактного лица'),
  contactPosition: z.string().optional(),
  email: z.string().email('Неверный формат email'),
  phone: z.string().min(10, 'Неверный формат телефона'),
  website: z.string().url().optional().or(z.literal('')),
  
  // Банковские реквизиты
  bankName: z.string().min(2, 'Введите наименование банка'),
  bik: z.string().length(9, 'БИК должен содержать 9 цифр'),
  correspondentAccount: z.string().length(20, 'Корр. счет должен содержать 20 цифр'),
  checkingAccount: z.string().length(20, 'Расчетный счет должен содержать 20 цифр'),
  
  // Направления деятельности
  roles: z.array(z.enum(['operator', 'transfer', 'stay', 'gear', 'guide'])).min(1, 'Выберите хотя бы одну роль'),
  tourRegistryNumber: z.string().optional(),
  hasFinancialGuarantee: z.boolean().optional(),
  
  // Дополнительно
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  
  // Согласия (обязательные)
  agreePersonalData: z.literal(true, { errorMap: () => ({ message: 'Необходимо согласие на обработку персональных данных' }) }),
  agreeUserAgreement: z.literal(true, { errorMap: () => ({ message: 'Необходимо согласие с пользовательским соглашением' }) }),
  agreeOffer: z.literal(true, { errorMap: () => ({ message: 'Необходимо согласие с офертой' }) }),
  agreeCommission: z.literal(true, { errorMap: () => ({ message: 'Необходимо согласие с условиями комиссии 10%' }) }),
  agreeNotifications: z.boolean().optional(),
  
  // Пароль
  password: z.string().min(8, 'Пароль должен быть минимум 8 символов'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

export const dynamic = 'force-dynamic';

// Простое хеширование пароля (в продакшене использовать bcrypt)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'kamhub_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Валидация
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ошибка валидации',
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Проверяем, не существует ли уже партнер с таким email или ИНН
    const existingPartner = await query(
      `SELECT id FROM partners 
       WHERE contact->>'email' = $1 
       OR legal_info->>'inn' = $2`,
      [data.email, data.inn]
    );

    if (existingPartner.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Партнер с таким email или ИНН уже зарегистрирован' },
        { status: 400 }
      );
    }

    // Хешируем пароль
    const passwordHash = await hashPassword(data.password);

    // Формируем данные для сохранения
    const contact = {
      person: data.contactPerson,
      position: data.contactPosition || '',
      email: data.email,
      phone: data.phone,
      website: data.website || '',
    };

    const legalInfo = {
      businessType: data.businessType,
      companyName: data.companyName,
      tradeName: data.tradeName || data.companyName,
      inn: data.inn,
      ogrn: data.ogrn || '',
      kpp: data.kpp || '',
      legalAddress: data.legalAddress,
      actualAddress: data.actualAddress || data.legalAddress,
    };

    const bankDetails = {
      bankName: data.bankName,
      bik: data.bik,
      correspondentAccount: data.correspondentAccount,
      checkingAccount: data.checkingAccount,
    };

    const consents = {
      personalData: {
        agreed: true,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      },
      userAgreement: {
        agreed: true,
        timestamp: new Date().toISOString(),
      },
      offer: {
        agreed: true,
        timestamp: new Date().toISOString(),
      },
      commission: {
        agreed: true,
        rate: 10, // 10% комиссия
        timestamp: new Date().toISOString(),
      },
      notifications: {
        agreed: data.agreeNotifications || false,
        timestamp: new Date().toISOString(),
      },
    };

    const operatorInfo = data.roles.includes('operator') ? {
      tourRegistryNumber: data.tourRegistryNumber || '',
      hasFinancialGuarantee: data.hasFinancialGuarantee || false,
    } : null;

    // Создаем партнера
    const result = await query(
      `INSERT INTO partners (
        name, 
        category, 
        description, 
        contact, 
        legal_info,
        bank_details,
        consents,
        operator_info,
        roles,
        password_hash,
        is_verified, 
        status,
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING id`,
      [
        data.tradeName || data.companyName,
        data.roles[0], // Основная категория
        data.description || '',
        JSON.stringify(contact),
        JSON.stringify(legalInfo),
        JSON.stringify(bankDetails),
        JSON.stringify(consents),
        operatorInfo ? JSON.stringify(operatorInfo) : null,
        JSON.stringify(data.roles),
        passwordHash,
        false, // Требуется верификация
        'pending', // Статус: ожидает проверки
      ]
    );

    const partnerId = result.rows[0].id;

    // Логируем регистрацию для аудита (152-ФЗ)
    await query(
      `INSERT INTO audit_log (
        entity_type, 
        entity_id, 
        action, 
        data, 
        ip_address,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        'partner',
        partnerId,
        'register',
        JSON.stringify({
          email: data.email,
          inn: data.inn,
          roles: data.roles,
          consents: consents,
        }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      ]
    ).catch(err => {
      // Не блокируем регистрацию если аудит не записался
      console.error('Audit log error:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Заявка на регистрацию партнера принята. Ожидайте подтверждения администратора.',
      data: {
        partnerId,
        roles: data.roles,
        status: 'pending',
      },
    });

  } catch (error) {
    console.error('Error registering partner:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ошибка при регистрации партнера',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
