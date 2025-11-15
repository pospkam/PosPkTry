import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

interface PartnerRegistrationData {
  name: string;
  email: string;
  phone: string;
  password: string;
  description?: string;
  address?: string;
  website?: string;
  logoUrl?: string;
  roles: string[];
}

export async function POST(request: NextRequest) {
  try {
    const data: PartnerRegistrationData = await request.json();

    // Валидация
    if (!data.name || !data.email || !data.phone || !data.password) {
      return NextResponse.json(
        { success: false, error: 'Заполните все обязательные поля' },
        { status: 400 }
      );
    }

    if (data.password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Пароль должен быть не менее 8 символов' },
        { status: 400 }
      );
    }

    if (!data.roles || data.roles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Выберите хотя бы одно направление деятельности' },
        { status: 400 }
      );
    }

    // Проверка на существующий email
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [data.email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      );
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Создание пользователя
    const userResult = await query(
      `INSERT INTO users (email, password, name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [data.email, hashedPassword, data.name, 'partner']
    );

    const userId = userResult.rows[0].id;

    // Создание заявки партнера
    const partnerResult = await query(
      `INSERT INTO partner_applications (
        user_id, 
        name, 
        email, 
        phone, 
        description, 
        address, 
        website, 
        logo_url, 
        roles, 
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING id`,
      [
        userId,
        data.name,
        data.email,
        data.phone,
        data.description || null,
        data.address || null,
        data.website || null,
        data.logoUrl || null,
        JSON.stringify(data.roles),
        'pending' // Статус "на модерации"
      ]
    );

    return NextResponse.json({
      success: true,
      applicationId: partnerResult.rows[0].id,
      userId: userId,
      message: 'Заявка успешно отправлена на модерацию'
    });

  } catch (error: any) {
    console.error('Partner registration error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Ошибка при регистрации партнера' 
      },
      { status: 500 }
    );
  }
}
