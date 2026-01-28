/**
 * API endpoint для получения детальной информации об объекте размещения
 * GET /api/accommodations/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Получаем основную информацию
    const accommodationResult = await query(
      `SELECT 
        a.*,
        p.name as partner_name,
        p.email as partner_email,
        p.phone as partner_phone,
        (
          SELECT json_agg(json_build_object(
            'url', ast.url, 
            'alt', ast.alt,
            'mime_type', ast.mime_type
          ))
          FROM accommodation_assets aa
          JOIN assets ast ON aa.asset_id = ast.id
          WHERE aa.accommodation_id = a.id
        ) as images
      FROM accommodations a
      LEFT JOIN partners p ON a.partner_id = p.id
      WHERE a.id = $1 AND a.is_active = true`,
      [id]
    );
    
    if (accommodationResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Объект размещения не найден' },
        { status: 404 }
      );
    }
    
    const accommodation = accommodationResult.rows[0];
    
    // Получаем список номеров
    const roomsResult = await query(
      `SELECT 
        id,
        name,
        room_type,
        description,
        size_sqm,
        max_guests,
        beds_configuration,
        amenities,
        view,
        available_rooms,
        price_per_night,
        is_active
      FROM accommodation_rooms
      WHERE accommodation_id = $1 AND is_active = true
      ORDER BY price_per_night ASC`,
      [id]
    );
    
    // Получаем отзывы (последние 10)
    const reviewsResult = await query(
      `SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.name as user_name,
        u.email as user_email
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.accommodation_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10`,
      [id]
    );
    
    // Получаем похожие объекты (того же типа, в той же зоне)
    const similarResult = await query(
      `SELECT 
        a.id,
        a.name,
        a.type,
        a.short_description,
        a.address,
        a.price_per_night_from,
        a.currency,
        a.rating,
        a.review_count,
        (
          SELECT json_agg(json_build_object('url', ast.url))
          FROM accommodation_assets aa
          JOIN assets ast ON aa.asset_id = ast.id
          WHERE aa.accommodation_id = a.id
          LIMIT 1
        ) as images
      FROM accommodations a
      WHERE a.type = $1 
        AND a.location_zone = $2 
        AND a.id != $3 
        AND a.is_active = true
      ORDER BY a.rating DESC
      LIMIT 4`,
      [accommodation.type, accommodation.location_zone, id]
    );
    
    // Форматируем данные
    const formattedData = {
      id: accommodation.id,
      name: accommodation.name,
      type: accommodation.type,
      description: accommodation.description,
      shortDescription: accommodation.short_description,
      address: accommodation.address,
      coordinates: accommodation.coordinates,
      locationZone: accommodation.location_zone,
      starRating: accommodation.star_rating,
      totalRooms: accommodation.total_rooms,
      checkInTime: accommodation.check_in_time,
      checkOutTime: accommodation.check_out_time,
      pricePerNight: {
        from: parseFloat(accommodation.price_per_night_from),
        to: accommodation.price_per_night_to ? parseFloat(accommodation.price_per_night_to) : null,
        currency: accommodation.currency,
      },
      amenities: accommodation.amenities || [],
      languages: accommodation.languages || [],
      rating: accommodation.rating ? parseFloat(accommodation.rating) : 0,
      reviewCount: accommodation.review_count || 0,
      isVerified: accommodation.is_verified,
      partner: {
        name: accommodation.partner_name,
        email: accommodation.partner_email,
        phone: accommodation.partner_phone,
      },
      images: accommodation.images || [],
      rooms: roomsResult.rows.map(room => ({
        id: room.id,
        name: room.name,
        roomType: room.room_type,
        description: room.description,
        sizeSqm: room.size_sqm,
        maxGuests: room.max_guests,
        bedsConfiguration: room.beds_configuration || [],
        amenities: room.amenities || [],
        view: room.view,
        availableRooms: room.available_rooms,
        pricePerNight: parseFloat(room.price_per_night),
      })),
      reviews: reviewsResult.rows.map(review => ({
        id: review.id,
        rating: parseFloat(review.rating),
        comment: review.comment,
        createdAt: review.created_at,
        user: {
          name: review.user_name,
          email: review.user_email,
        },
      })),
      similar: similarResult.rows.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        description: item.short_description,
        address: item.address,
        pricePerNight: parseFloat(item.price_per_night_from),
        currency: item.currency,
        rating: item.rating ? parseFloat(item.rating) : 0,
        reviewCount: item.review_count || 0,
        image: item.images?.[0]?.url || null,
      })),
      createdAt: accommodation.created_at,
      updatedAt: accommodation.updated_at,
    };
    
    return NextResponse.json({
      success: true,
      data: formattedData,
    });
    
  } catch (error) {
    console.error('Error fetching accommodation details:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка при получении информации об объекте',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



