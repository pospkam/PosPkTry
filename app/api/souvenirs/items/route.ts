import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getSouvenirPartnerId, ensureSouvenirPartnerExists } from '@/lib/auth/souvenir-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/souvenirs/items - Get all souvenirs for the partner
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const partnerId = await getSouvenirPartnerId(userOrResponse.id);
    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Партнер категории souvenir не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const stockStatus = searchParams.get('stockStatus');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let queryText = `
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM souvenir_order_items soi 
         JOIN souvenir_orders so ON soi.order_id = so.id 
         WHERE soi.souvenir_id = s.id AND so.status IN ('pending', 'processing', 'confirmed')) as active_orders
      FROM souvenirs s
      WHERE s.partner_id = $1
    `;

    const params: any[] = [partnerId];
    let paramIndex = 2;

    if (status === 'active') {
      queryText += ` AND s.is_active = TRUE`;
    } else if (status === 'inactive') {
      queryText += ` AND s.is_active = FALSE`;
    }

    if (category) {
      queryText += ` AND s.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (stockStatus === 'in_stock') {
      queryText += ` AND s.available_quantity > s.low_stock_threshold`;
    } else if (stockStatus === 'low_stock') {
      queryText += ` AND s.available_quantity > 0 AND s.available_quantity <= s.low_stock_threshold`;
    } else if (stockStatus === 'out_of_stock') {
      queryText += ` AND s.available_quantity = 0`;
    }

    queryText += ` ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    const countResult = await query(
      `SELECT COUNT(*) FROM souvenirs WHERE partner_id = $1`,
      [partnerId]
    );

    return NextResponse.json({
      success: true,
      data: {
        souvenirs: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          limit,
          offset,
          hasMore: offset + limit < parseInt(countResult.rows[0].count)
        }
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching souvenirs:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении товаров' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * POST /api/souvenirs/items - Create new souvenir
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const partnerId = await ensureSouvenirPartnerExists(userOrResponse.id);

    const body = await request.json();
    const {
      name,
      description,
      shortDescription,
      category,
      subcategory,
      sku,
      price,
      discountPrice,
      costPrice,
      images,
      tags,
      stockQuantity,
      lowStockThreshold,
      weight,
      dimensions,
      materials,
      origin,
      artisanName,
      artisanBio,
      isHandmade,
      isExclusive,
      isFeatured,
      minOrderQuantity,
      maxOrderQuantity,
      productionTimeDays,
      careInstructions,
      shippingInfo
    } = body;

    // Validation
    if (!name || name.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Укажите название товара (минимум 3 символа)' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!description || description.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Укажите описание товара (минимум 10 символов)' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!category || !['magnets', 'ceramics', 'textiles', 'jewelry', 'crafts', 'food', 'books', 'art', 'other'].includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Укажите корректную категорию' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!price || price <= 0) {
      return NextResponse.json(
        { success: false, error: 'Укажите корректную цену' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (discountPrice && (discountPrice <= 0 || discountPrice >= price)) {
      return NextResponse.json(
        { success: false, error: 'Цена со скидкой должна быть меньше обычной цены' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Check for duplicate SKU
    if (sku) {
      const duplicateCheck = await query(
        `SELECT id FROM souvenirs WHERE sku = $1`,
        [sku]
      );

      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Товар с таким артикулом уже существует' } as ApiResponse<null>,
          { status: 400 }
        );
      }
    }

    const result = await query(
      `INSERT INTO souvenirs (
        partner_id, name, description, short_description,
        category, subcategory, sku, price, discount_price, cost_price,
        images, tags, stock_quantity, low_stock_threshold,
        weight, dimensions, materials, origin,
        artisan_name, artisan_bio, is_handmade, is_exclusive, is_featured,
        min_order_quantity, max_order_quantity, production_time_days,
        care_instructions, shipping_info
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
      ) RETURNING *`,
      [
        partnerId, name, description, shortDescription || null,
        category, subcategory || null, sku || null, price, discountPrice || null, costPrice || null,
        JSON.stringify(images || []), tags || [], stockQuantity || 0, lowStockThreshold || 5,
        weight || null, JSON.stringify(dimensions || {}), materials || [], origin || 'Камчатка, Россия',
        artisanName || null, artisanBio || null, isHandmade || false, isExclusive || false, isFeatured || false,
        minOrderQuantity || 1, maxOrderQuantity || null, productionTimeDays || null,
        careInstructions || null, shippingInfo || null
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error creating souvenir:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании товара' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
