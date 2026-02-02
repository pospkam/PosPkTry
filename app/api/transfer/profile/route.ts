import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getTransferPartnerByUserId, ensureTransferPartnerExists, getTransferStats } from '@/lib/auth/transfer-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/profile
 * Get transfer operator profile
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'transfer') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Get user details
    const userResult = await query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Пользователь не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const user = userResult.rows[0];

    // Get or create partner profile
    let partner = await getTransferPartnerByUserId(userId);
    if (!partner) {
      const partnerId = await ensureTransferPartnerExists(userId, user.name, user.email);
      partner = await getTransferPartnerByUserId(userId);
    }

    // Get statistics
    const stats = await getTransferStats(userId);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at
        },
        partner,
        stats
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении профиля'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/transfer/profile
 * Update transfer operator profile
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'transfer') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      partnerName,
      description,
      contact
    } = body;

    // Update user name if provided
    if (name) {
      await query(
        'UPDATE users SET name = $1 WHERE id = $2',
        [name, userId]
      );
    }

    // Get or create partner
    let partner = await getTransferPartnerByUserId(userId);
    if (!partner) {
      const userResult = await query('SELECT name, email FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];
      await ensureTransferPartnerExists(userId, user.name, user.email);
      partner = await getTransferPartnerByUserId(userId);
    }

    // Update partner details
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (partnerName) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(partnerName);
    }

    if (description) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(description);
    }

    if (contact) {
      updateFields.push(`contact = $${paramIndex++}`);
      updateValues.push(JSON.stringify(contact));
    }

    if (updateFields.length > 0) {
      updateValues.push(partner.id);
      
      await query(
        `UPDATE partners 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}`,
        updateValues
      );
    }

    // Get updated profile
    const updatedPartner = await getTransferPartnerByUserId(userId);

    return NextResponse.json({
      success: true,
      data: { partner: updatedPartner },
      message: 'Профиль успешно обновлён'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении профиля'
    } as ApiResponse<null>, { status: 500 });
  }
}
