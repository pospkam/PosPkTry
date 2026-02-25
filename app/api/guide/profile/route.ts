import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getGuidePartnerByUserId, ensureGuidePartnerExists, getGuideStats } from '@/lib/auth/guide-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/profile
 * Get guide profile with statistics
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'guide') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав. Доступно только для гидов.'
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

    // Get or create guide partner profile
    let partner = await getGuidePartnerByUserId(userId);
    if (!partner) {
      const partnerId = await ensureGuidePartnerExists(userId, user.name, user.email);
      partner = await getGuidePartnerByUserId(userId);
    }

    // Get statistics
    const stats = await getGuideStats(userId);

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
    console.error('Get guide profile error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении профиля'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/guide/profile
 * Update guide profile
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'guide') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав. Доступно только для гидов.'
      } as ApiResponse<null>, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      partnerName,
      description,
      contact,
      experienceYears,
      languages,
      specializations,
      bio,
      location,
      isAvailable
    } = body;

    // Validate experience years
    if (experienceYears !== undefined && (experienceYears < 1 || experienceYears > 50)) {
      return NextResponse.json({
        success: false,
        error: 'Опыт работы должен быть от 1 до 50 лет'
      } as ApiResponse<null>, { status: 400 });
    }

    // Validate specializations
    const validSpecializations = ['volcanoes', 'wildlife', 'fishing', 'history', 'photography', 'extreme', 'hiking', 'cultural', 'rafting', 'skiing'];
    if (specializations && !specializations.every((s: string) => validSpecializations.includes(s))) {
      return NextResponse.json({
        success: false,
        error: 'Недопустимая специализация. Доступные: ' + validSpecializations.join(', ')
      } as ApiResponse<null>, { status: 400 });
    }

    // Update user name if provided
    if (name) {
      await query(
        'UPDATE users SET name = $1 WHERE id = $2',
        [name, userId]
      );
    }

    // Get or create partner
    let partner = await getGuidePartnerByUserId(userId);
    if (!partner) {
      const userResult = await query('SELECT name, email FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];
      await ensureGuidePartnerExists(userId, user.name, user.email);
      partner = await getGuidePartnerByUserId(userId);
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (partnerName) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(partnerName);
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(description);
    }

    if (contact) {
      updateFields.push(`contact = $${paramIndex++}`);
      updateValues.push(JSON.stringify(contact));
    }

    if (experienceYears !== undefined) {
      updateFields.push(`experience_years = $${paramIndex++}`);
      updateValues.push(experienceYears);
    }

    if (languages) {
      updateFields.push(`languages = $${paramIndex++}`);
      updateValues.push(languages);
    }

    if (specializations) {
      updateFields.push(`specializations = $${paramIndex++}`);
      updateValues.push(specializations);
    }

    if (bio !== undefined) {
      updateFields.push(`bio = $${paramIndex++}`);
      updateValues.push(bio);
    }

    if (location && location.lat && location.lng) {
      updateFields.push(`location = ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography`);
      updateValues.push(location.lng, location.lat);
      paramIndex += 2;
    }

    if (isAvailable !== undefined) {
      updateFields.push(`is_available = $${paramIndex++}`);
      updateValues.push(isAvailable);
    }

    if (updateFields.length > 0) {
      updateValues.push(partner.id);
      
      await query(
        `UPDATE partners 
         SET ${updateFields.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}`,
        updateValues
      );
    }

    // Get updated profile
    const updatedPartner = await getGuidePartnerByUserId(userId);

    return NextResponse.json({
      success: true,
      data: { partner: updatedPartner },
      message: 'Профиль успешно обновлён'
    } as ApiResponse<any>);

  } catch (error: any) {
    console.error('Update guide profile error:', error);
    
    // Handle constraint violations
    if (error.code === '23514') { // Check constraint violation
      return NextResponse.json({
        success: false,
        error: 'Некорректные данные. Проверьте значения полей.'
      } as ApiResponse<null>, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении профиля'
    } as ApiResponse<null>, { status: 500 });
  }
}
