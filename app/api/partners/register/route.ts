/**
 * API endpoint для регистрации нового партнера
 * POST /api/partners/register
 * 
 * ИСПРАВЛЕНО:
 * - Добавлено хеширование пароля с bcrypt
 * - Создание пользователя в таблице users
 * - Создание партнера в таблице partners со связью user_id
 * - Генерация JWT токена для автоматической авторизации
 * - Улучшенная обработка ошибок
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/database';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { config } from '@/lib/config';

// Валидация входных данных
const registerSchema = z.object({
  name: z.string().min(2, 'Название должно быть минимум 2 символа'),
  email: z.string().email('Неверный формат email'),
  phone: z.string().min(10, 'Неверный формат телефона'),
  password: z.string().min(8, 'Пароль должен быть минимум 8 символов'),
  description: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  roles: z.array(z.enum(['operator', 'transfer', 'stay', 'gear'])).min(1, 'Выберите хотя бы одну роль'),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

export const dynamic = 'force-dynamic';

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

    const { name, email, phone, password, description, address, website, roles, logoUrl } = validationResult.data;

    // Используем транзакцию для обеспечения целостности данных
    const result = await transaction(async (client) => {
      // Проверяем, не существует ли уже пользователь с таким email
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Пользователь с таким email уже зарегистрирован');
      }

      // Хешируем пароль
      const passwordHash = await bcrypt.hash(password, 10);

      // Создаем пользователя
      // Роль пользователя определяется по первой выбранной роли партнера
      const userRole = roles[0]; // 'operator', 'transfer', 'stay', или 'gear'
      
      const userResult = await client.query(
        `INSERT INTO users (email, name, role, password_hash, preferences, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, email, name, role`,
        [
          email,
          name,
          userRole,
          passwordHash,
          JSON.stringify({
            phone,
            address: address || '',
            website: website || '',
          })
        ]
      );

      const user = userResult.rows[0];
      const userId = user.id;

      // Создаем контактную информацию
      const contact = {
        email,
        phone,
        address: address || '',
        website: website || '',
      };

      // Создаем партнеров для каждой роли
      const partnerIds: string[] = [];
      
      for (const role of roles) {
        const partnerResult = await client.query(
          `INSERT INTO partners (
            name, 
            category, 
            description, 
            contact, 
            is_verified, 
            user_id,
            created_at, 
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING id`,
          [
            `${name}${roles.length > 1 ? ` (${getRoleName(role)})` : ''}`,
            role,
            description || `${name} - ${getRoleName(role)}`,
            JSON.stringify(contact),
            false, // Требуется верификация
            userId,
          ]
        );

        const partnerId = partnerResult.rows[0].id;
        partnerIds.push(partnerId);

        // Если есть логотип, сохраняем его как asset
        if (logoUrl) {
          const assetResult = await client.query(
            `INSERT INTO assets (url, mime_type, sha256, size, alt, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING id`,
            [
              logoUrl,
              'image/png',
              `logo-${partnerId}-${Date.now()}`,
              0,
              `Логотип ${name}`,
            ]
          );

          const assetId = assetResult.rows[0].id;

          // Связываем логотип с партнером
          await client.query(
            `INSERT INTO partner_assets (partner_id, asset_id)
             VALUES ($1, $2)`,
            [partnerId, assetId]
          );

          // Обновляем logo_asset_id
          await client.query(
            `UPDATE partners SET logo_asset_id = $1 WHERE id = $2`,
            [assetId, partnerId]
          );
        }
      }

      return {
        user,
        partnerIds,
        roles,
      };
    });

    // Создаем JWT токен для автоматической авторизации
    const secret = new TextEncoder().encode(config.auth.jwtSecret);
    const token = await new SignJWT({ 
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(config.auth.jwtExpiresIn)
      .sign(secret);

    // Создаем ответ с токеном в cookie
    const response = NextResponse.json({
      success: true,
      message: 'Партнер успешно зарегистрирован! Ожидайте подтверждения администратора.',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
        partnerIds: result.partnerIds,
        roles: result.roles,
      },
    });

    // Устанавливаем токен в HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Error registering partner:', error);
    
    // Обработка известных ошибок
    if (error instanceof Error) {
      if (error.message.includes('уже зарегистрирован')) {
        return NextResponse.json(
          { 
            success: false, 
            error: error.message,
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('duplicate key')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Партнер с такими данными уже существует',
          },
          { status: 400 }
        );
      }
    }

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

function getRoleName(role: string): string {
  const roleNames: Record<string, string> = {
    operator: 'Туроператор',
    transfer: 'Трансфер',
    stay: 'Размещение',
    gear: 'Аренда снаряжения',
  };
  return roleNames[role] || role;
}
