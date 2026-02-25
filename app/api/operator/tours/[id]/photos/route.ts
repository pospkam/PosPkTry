import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { verifyTourOwnership } from '@/lib/auth/operator-helpers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/tours/[id]/photos
 * Get all photos for a tour
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operatorOrResponse = await requireOperator(request);
    if (operatorOrResponse instanceof NextResponse) {
      return operatorOrResponse;
    }
    const userId = operatorOrResponse.userId;

    const { id } = await params;

    // Verify ownership
    const isOwner = await verifyTourOwnership(userId, id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    const result = await query(
      `SELECT 
        a.id,
        a.url,
        a.mime_type,
        a.size,
        a.width,
        a.height,
        a.alt,
        a.created_at
      FROM assets a
      JOIN tour_assets ta ON a.id = ta.asset_id
      WHERE ta.tour_id = $1
      ORDER BY a.created_at ASC`,
      [id]
    );

    const photos = result.rows.map(row => ({
      id: row.id,
      url: row.url,
      mimeType: row.mime_type,
      size: parseInt(row.size),
      width: row.width,
      height: row.height,
      alt: row.alt,
      createdAt: row.created_at
    }));

    return NextResponse.json({
      success: true,
      data: { photos }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get tour photos error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении фотографий'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/operator/tours/[id]/photos
 * Upload photo for tour
 * NOTE: This is a placeholder. Real implementation requires file upload middleware
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operatorOrResponse = await requireOperator(request);
    if (operatorOrResponse instanceof NextResponse) {
      return operatorOrResponse;
    }
    const userId = operatorOrResponse.userId;

    const { id } = await params;

    // Verify ownership
    const isOwner = await verifyTourOwnership(userId, id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();
    const { url, mimeType, size, width, height, alt } = body;

    // Validation
    if (!url || !mimeType) {
      return NextResponse.json({
        success: false,
        error: 'URL и MIME тип обязательны'
      } as ApiResponse<null>, { status: 400 });
    }

    // Generate SHA256 hash for URL
    const sha256 = crypto.createHash('sha256').update(url).digest('hex');

    // Check if asset already exists
    const existingAsset = await query(
      'SELECT id FROM assets WHERE sha256 = $1',
      [sha256]
    );

    let assetId;

    if (existingAsset.rows.length > 0) {
      assetId = existingAsset.rows[0].id;
    } else {
      // Create new asset
      const assetResult = await query(
        `INSERT INTO assets (url, mime_type, sha256, size, width, height, alt)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [url, mimeType, sha256, size || 0, width, height, alt || '']
      );
      assetId = assetResult.rows[0].id;
    }

    // Link asset to tour
    await query(
      `INSERT INTO tour_assets (tour_id, asset_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id, assetId]
    );

    // Get created asset
    const result = await query(
      'SELECT * FROM assets WHERE id = $1',
      [assetId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Фотография успешно добавлена'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Upload photo error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при загрузке фотографии',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}
