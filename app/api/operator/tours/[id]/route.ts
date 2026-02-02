import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getOperatorPartnerId, verifyTourOwnership } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/tours/[id]
 * Get specific tour with ownership verification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Verify ownership
    const isOwner = await verifyTourOwnership(userId, params.id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден или у вас нет прав на его просмотр'
      } as ApiResponse<null>, { status: 404 });
    }

    // Get tour with full details
      const result = await query(
        `SELECT 
          t.*,
          COALESCE(array_agg(DISTINCT a.url) FILTER (WHERE a.url IS NOT NULL), '{}') as images,
          COALESCE(array_agg(DISTINCT jsonb_build_object(
            'id', a.id,
            'url', a.url,
            'alt', a.alt
          )) FILTER (WHERE a.id IS NOT NULL), '[]') as image_details
        FROM tours t
        LEFT JOIN tour_assets ta ON t.id = ta.tour_id
        LEFT JOIN assets a ON ta.asset_id = a.id
        WHERE t.id = $1
        GROUP BY t.id`,
        [params.id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Тур не найден'
        } as ApiResponse<null>, { status: 404 });
      }

      const row = result.rows[0];
      const tour = {
        id: row.id,
        name: row.name,
        description: row.description,
        shortDescription: row.short_description,
        category: row.category || 'adventure',
        difficulty: row.difficulty,
        duration: row.duration,
        price: parseFloat(row.price),
        currency: row.currency,
        season: row.season || [],
        requirements: row.requirements || [],
        includes: row.included || [],
        excludes: row.not_included || [],
        coordinates: row.coordinates || [],
        maxGroupSize: row.max_group_size,
        minGroupSize: row.min_group_size,
        isActive: row.is_active,
        rating: row.rating,
        reviewCount: row.review_count,
        images: row.images,
        imageDetails: row.image_details,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      return NextResponse.json({
        success: true,
        data: tour
      } as ApiResponse<any>);

  } catch (error) {
    console.error('Get tour error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении тура'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/operator/tours/[id]
 * Update tour with ownership verification
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Verify ownership
    const isOwner = await verifyTourOwnership(userId, params.id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден или у вас нет прав на его редактирование'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();

    // Build dynamic update query
      const allowedFields = [
        'name', 'description', 'shortDescription', 'category', 'difficulty', 
        'duration', 'price', 'currency', 'season', 'maxGroupSize', 'minGroupSize', 
        'requirements', 'includes', 'excludes', 'coordinates', 'isActive'
      ];
      
      const fieldMap: Record<string, string> = {
        shortDescription: 'short_description',
        maxGroupSize: 'max_group_size',
        minGroupSize: 'min_group_size',
        includes: 'included',
        excludes: 'not_included',
        isActive: 'is_active',
      };
      
      const jsonFields = new Set(['season', 'requirements', 'includes', 'excludes', 'coordinates']);

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

      for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'undefined') {
          continue;
        }
        
        if (!allowedFields.includes(key)) {
          continue;
        }
        
        const mappedKey = fieldMap[key] || key;
        const dbKey = mappedKey.replace(/([A-Z])/g, '_$1').toLowerCase();
        
        updateFields.push(`${dbKey} = $${paramIndex++}`);
        
        if (jsonFields.has(key)) {
          updateValues.push(JSON.stringify(value));
        } else {
          updateValues.push(value);
        }
      }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Нет полей для обновления'
      } as ApiResponse<null>, { status: 400 });
    }

    updateValues.push(params.id);

    const result = await query(
      `UPDATE tours 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateValues
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Тур успешно обновлён'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Update tour error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении тура'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * DELETE /api/operator/tours/[id]
 * Delete tour with safety checks
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Verify ownership
    const isOwner = await verifyTourOwnership(userId, params.id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден или у вас нет прав на его удаление'
      } as ApiResponse<null>, { status: 404 });
    }

    // Check for active bookings
    const bookingsCheck = await query(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE tour_id = $1 AND status IN ('pending', 'confirmed')`,
      [params.id]
    );

    if (parseInt(bookingsCheck.rows[0].count) > 0) {
      return NextResponse.json({
        success: false,
        error: 'Невозможно удалить тур с активными бронированиями',
        message: 'Сначала отмените или завершите все активные бронирования, либо деактивируйте тур вместо удаления.'
      } as ApiResponse<null>, { status: 400 });
    }

    // Delete tour (CASCADE will delete related records)
    await query('DELETE FROM tours WHERE id = $1', [params.id]);

    return NextResponse.json({
      success: true,
      message: 'Тур успешно удалён'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('Delete tour error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при удалении тура'
    } as ApiResponse<null>, { status: 500 });
  }
}
