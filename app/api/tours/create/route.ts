/**
 * API endpoint для добавления нового тура
 * POST /api/tours/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
import { z } from 'zod';

// Валидация входных данных
const tourSchema = z.object({
  operatorId: z.string().uuid('Неверный ID оператора'),
  name: z.string().min(3, 'Название тура должно быть минимум 3 символа'),
  description: z.string().min(10, 'Описание должно быть минимум 10 символов'),
  shortDescription: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard'], { message: 'Выберите сложность' }),
  duration: z.number().min(1, 'Длительность должна быть минимум 1 час'),
  price: z.number().min(0, 'Цена не может быть отрицательной'),
  currency: z.string().default('RUB'),
  maxGroupSize: z.number().min(1).max(100).default(10),
  minGroupSize: z.number().min(1).default(1),
  season: z.array(z.string()).optional().default([]),
  coordinates: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
    name: z.string().optional(),
  })).optional().default([]),
  requirements: z.array(z.string()).optional().default([]),
  included: z.array(z.string()).optional().default([]),
  notIncluded: z.array(z.string()).optional().default([]),
  images: z.array(z.string().url()).optional().default([]),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Валидация
    const validationResult = tourSchema.safeParse(body);
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
      operatorId,
      name,
      description,
      shortDescription,
      difficulty,
      duration,
      price,
      currency,
      maxGroupSize,
      minGroupSize,
      season,
      coordinates,
      requirements,
      included,
      notIncluded,
      images,
    } = validationResult.data;

    // Проверяем, существует ли оператор
    const operatorCheck = await query(
      'SELECT id FROM partners WHERE id = $1 AND category = $2',
      [operatorId, 'operator']
    );

    if (operatorCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Оператор не найден' },
        { status: 404 }
      );
    }

    // Создаем тур
    const result = await query(
      `INSERT INTO tours (
        operator_id, name, description, short_description, difficulty, duration,
        price, currency, max_group_size, min_group_size, season, coordinates,
        requirements, included, not_included, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      RETURNING id`,
      [
        operatorId,
        name,
        description,
        shortDescription || description.substring(0, 100),
        difficulty,
        duration,
        price,
        currency,
        maxGroupSize,
        minGroupSize,
        JSON.stringify(season),
        JSON.stringify(coordinates),
        JSON.stringify(requirements),
        JSON.stringify(included),
        JSON.stringify(notIncluded),
        true, // is_active
      ]
    );

    const tourId = result.rows[0].id;

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
            `tour-${tourId}-${Date.now()}-${Math.random()}`,
            0,
            name,
          ]
        );

        const assetId = assetResult.rows[0].id;

        // Связываем изображение с туром
        await query(
          `INSERT INTO tour_assets (tour_id, asset_id)
           VALUES ($1, $2)`,
          [tourId, assetId]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Тур успешно добавлен!',
      data: {
        tourId,
        name,
      },
    });

  } catch (error) {
    console.error('Error creating tour:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ошибка при создании тура',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
