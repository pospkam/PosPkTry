/**
 * API endpoint для регистрации нового партнера
 * POST /api/partners/register
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
import { z } from 'zod';

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

    // TODO: В production хешировать пароль с bcrypt
    // const passwordHash = await bcrypt.hash(password, 10);
    // Для демо сохраняем как есть (НЕ ДЕЛАЙТЕ ТАК В PRODUCTION!)
    const passwordHash = password;

    // Проверяем, не существует ли уже партнер с таким email
    const existingPartner = await query(
      'SELECT id FROM partners WHERE contact->>\'email\' = $1',
      [email]
    );

    if (existingPartner.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Партнер с таким email уже зарегистрирован' },
        { status: 400 }
      );
    }

    // Создаем контактную информацию
    const contact = {
      email,
      phone,
      address: address || '',
      website: website || '',
    };

    // Создаем партнера для каждой роли
    // (в текущей структуре БД партнер может иметь только одну категорию)
    const partnerIds: string[] = [];
    
    for (const role of roles) {
      const result = await query(
        `INSERT INTO partners (name, category, description, contact, is_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [
          `${name}${roles.length > 1 ? ` (${getRoleName(role)})` : ''}`,
          role,
          description || `${name} - ${getRoleName(role)}`,
          JSON.stringify(contact),
          false, // Требуется верификация
        ]
      );

      const partnerId = result.rows[0].id;
      partnerIds.push(partnerId);

      // Если есть логотип, сохраняем его как asset
      if (logoUrl) {
        const assetResult = await query(
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
        await query(
          `INSERT INTO partner_assets (partner_id, asset_id)
           VALUES ($1, $2)`,
          [partnerId, assetId]
        );

        // Обновляем logo_asset_id
        await query(
          `UPDATE partners SET logo_asset_id = $1 WHERE id = $2`,
          [assetId, partnerId]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Партнер успешно зарегистрирован! Ожидайте подтверждения администратора.',
      data: {
        partnerIds,
        roles,
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

function getRoleName(role: string): string {
  const roleNames: Record<string, string> = {
    operator: 'Туроператор',
    transfer: 'Трансфер',
    stay: 'Размещение',
    gear: 'Аренда снаряжения',
  };
  return roleNames[role] || role;
}
