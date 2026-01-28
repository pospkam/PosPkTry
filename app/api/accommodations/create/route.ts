/**
 * API endpoint для добавления нового места размещения
 * POST /api/accommodations/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
import { z } from 'zod';

// Валидация входных данных
const accommodationSchema = z.object({
  partnerId: z.string().uuid('Неверный ID партнера'),
  name: z.string().min(3, 'Название должно быть минимум 3 символа'),
  description: z.string().min(10, 'Описание должно быть минимум 10 символов'),
  shortDescription: z.string().optional(),
  type: z.enum(['hotel', 'hostel', 'apartment', 'guesthouse', 'resort', 'camping', 'glamping', 'cottage'], {
    message: 'Выберите тип размещения'
  }),
  address: z.string().min(5, 'Укажите адрес'),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  locationZone: z.enum(['city_center', 'airport', 'nature', 'beach']).optional(),
  starRating: z.number().min(1).max(5).optional(),
  totalRooms: z.number().min(1, 'Укажите количество номеров'),
  pricePerNightFrom: z.number().min(0, 'Цена не может быть отрицательной'),
  pricePerNightTo: z.number().min(0).optional(),
  currency: z.string().default('RUB'),
  amenities: z.array(z.string()).optional().default([]),
  languages: z.array(z.string()).optional().default(['ru']),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  images: z.array(z.string().url()).optional().default([]),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Валидация
    const validationResult = accommodationSchema.safeParse(body);
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

    const {
      partnerId,
      name,
      description,
      shortDescription,
      type,
      address,
      coordinates,
      locationZone,
      starRating,
      totalRooms,
      pricePerNightFrom,
      pricePerNightTo,
      currency,
      amenities,
      languages,
      checkInTime,
      checkOutTime,
      cancellationPolicy,
      images,
    } = validationResult.data;

    // Проверяем, существует ли партнер с категорией 'stay'
    const partnerCheck = await query(
      'SELECT id FROM partners WHERE id = $1 AND category = $2',
      [partnerId, 'stay']
    );

    if (partnerCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Партнер не найден или не имеет категорию "Размещение"' },
        { status: 404 }
      );
    }

    // Создаем размещение
    const result = await query(
      `INSERT INTO accommodations (
        partner_id, name, description, short_description, type, address, coordinates,
        location_zone, star_rating, total_rooms,
        price_per_night_from, price_per_night_to, currency,
        amenities, languages,
        check_in_time, check_out_time, cancellation_policy,
        is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
      RETURNING id`,
      [
        partnerId,
        name,
        description,
        shortDescription || description.substring(0, 100),
        type,
        address,
        JSON.stringify(coordinates),
        locationZone || null,
        starRating || null,
        totalRooms,
        pricePerNightFrom,
        pricePerNightTo || null,
        currency,
        JSON.stringify(amenities),
        JSON.stringify(languages),
        checkInTime || '14:00',
        checkOutTime || '12:00',
        cancellationPolicy || 'Отмена за 24 часа до заезда - без штрафа',
        true, // is_active
      ]
    );

    const accommodationId = result.rows[0].id;

    // Добавляем изображения как assets
    if (images.length > 0) {
      for (const imageUrl of images) {
        const assetResult = await query(
          `INSERT INTO assets (url, mime_type, sha256, size, alt, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING id`,
          [
            imageUrl,
            'image/jpeg',
            `accommodation-${accommodationId}-${Date.now()}-${Math.random()}`,
            0,
            name,
          ]
        );

        const assetId = assetResult.rows[0].id;

        // Связываем изображение с размещением
        await query(
          `INSERT INTO accommodation_assets (accommodation_id, asset_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [accommodationId, assetId]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Размещение успешно добавлено!',
      data: {
        accommodationId,
        name,
      },
    });

  } catch (error) {
    console.error('Error creating accommodation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ошибка при создании размещения',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
