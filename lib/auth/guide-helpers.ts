/**
 * Guide Helper Functions
 * Utilities for working with guide profiles, schedules, and business logic
 */

import { query } from '@/lib/database';

/**
 * Get partner ID for a guide user
 * Returns partner.id linked to user.id where category='guide'
 */
export async function getGuidePartnerId(userId: string): Promise<string | null> {
  try {
    const result = await query(
      `SELECT id FROM partners 
       WHERE user_id = $1 AND category = 'guide'
       LIMIT 1`,
      [userId]
    );
    
    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('Error getting guide partner ID:', error);
    return null;
  }
}

/**
 * Get guide partner record with full details
 */
export async function getGuidePartnerByUserId(userId: string): Promise<any | null> {
  try {
    const result = await query(
      `SELECT 
        p.id,
        p.name,
        p.category,
        p.description,
        p.contact,
        p.rating,
        p.review_count,
        p.is_verified,
        p.logo_asset_id,
        p.experience_years,
        p.languages,
        p.specializations,
        p.bio,
        ST_X(p.location::geometry) as longitude,
        ST_Y(p.location::geometry) as latitude,
        p.total_earnings,
        p.is_available,
        p.created_at,
        p.updated_at,
        a.url as logo_url
      FROM partners p
      LEFT JOIN assets a ON p.logo_asset_id = a.id
      WHERE p.user_id = $1 AND p.category = 'guide'
      LIMIT 1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const partner = result.rows[0];
    return {
      id: partner.id,
      name: partner.name,
      category: partner.category,
      description: partner.description,
      contact: partner.contact,
      rating: parseFloat(partner.rating),
      reviewCount: partner.review_count,
      isVerified: partner.is_verified,
      logoAssetId: partner.logo_asset_id,
      logoUrl: partner.logo_url,
      experienceYears: partner.experience_years,
      languages: partner.languages,
      specializations: partner.specializations,
      bio: partner.bio,
      location: partner.latitude && partner.longitude ? {
        lat: parseFloat(partner.latitude),
        lng: parseFloat(partner.longitude)
      } : null,
      totalEarnings: parseFloat(partner.total_earnings || 0),
      isAvailable: partner.is_available,
      createdAt: partner.created_at,
      updatedAt: partner.updated_at
    };
  } catch (error) {
    console.error('Error getting guide partner:', error);
    return null;
  }
}

/**
 * Create guide partner record for user if doesn't exist
 */
export async function ensureGuidePartnerExists(userId: string, userName: string, userEmail: string): Promise<string> {
  try {
    // Check if partner exists
    const existing = await query(
      `SELECT id FROM partners WHERE user_id = $1 AND category = 'guide' LIMIT 1`,
      [userId]
    );
    
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }
    
    // Create new partner record
    const result = await query(
      `INSERT INTO partners (user_id, name, category, contact, is_verified, rating, review_count, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        userName,
        'guide',
        JSON.stringify({ email: userEmail, phone: '' }),
        false,
        0.0,
        0,
        true
      ]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error ensuring guide partner exists:', error);
    throw error;
  }
}

/**
 * Verify user owns a schedule entry
 */
export async function verifyScheduleOwnership(userId: string, scheduleId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT gs.id 
       FROM guide_schedule gs
       JOIN partners p ON gs.guide_id = p.id
       WHERE p.user_id = $1 AND gs.id = $2`,
      [userId, scheduleId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying schedule ownership:', error);
    return false;
  }
}

/**
 * Verify user owns a review (for replying)
 */
export async function verifyReviewOwnership(userId: string, reviewId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT gr.id 
       FROM guide_reviews gr
       JOIN partners p ON gr.guide_id = p.id
       WHERE p.user_id = $1 AND gr.id = $2`,
      [userId, reviewId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying review ownership:', error);
    return false;
  }
}

/**
 * Check for schedule conflicts
 * Returns true if NO conflicts exist
 */
export async function checkScheduleConflicts(
  guideId: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<boolean> {
  try {
    const params: any[] = [guideId, startTime, endTime];
    const paramIndex = 4;
    
    let queryStr = `
      SELECT check_schedule_conflicts($1, $2, $3`;
    
    if (excludeId) {
      queryStr += `, $${paramIndex}`;
      params.push(excludeId);
    } else {
      queryStr += `, NULL`;
    }
    
    queryStr += `) as no_conflicts`;
    
    const result = await query(queryStr, params);
    
    return result.rows[0]?.no_conflicts === true;
  } catch (error) {
    console.error('Error checking schedule conflicts:', error);
    return false;
  }
}

/**
 * Calculate guide earnings from booking
 * Default commission: 10%
 */
export async function calculateGuideEarnings(
  bookingPrice: number,
  commissionRate: number = 10.0
): Promise<number> {
  return Math.round((bookingPrice * commissionRate) / 100 * 100) / 100;
}

/**
 * Record guide earnings
 */
export async function recordGuideEarnings(
  guideId: string,
  bookingId: string,
  tourId: string | null,
  amount: number,
  date: string,
  commissionRate: number = 10.0
): Promise<string> {
  try {
    const result = await query(
      `INSERT INTO guide_earnings (
        guide_id, booking_id, tour_id, amount, commission_rate, date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id`,
      [guideId, bookingId, tourId, amount, commissionRate, date]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error recording guide earnings:', error);
    throw error;
  }
}

/**
 * Get guide statistics
 */
export async function getGuideStats(userId: string): Promise<any> {
  try {
    const guideId = await getGuidePartnerId(userId);
    
    if (!guideId) {
      return null;
    }
    
    // Overall stats
    const statsResult = await query(
      `SELECT 
        COUNT(DISTINCT gs.id) FILTER (WHERE gs.status = 'completed') as completed_tours,
        COUNT(DISTINCT gs.id) FILTER (WHERE gs.status = 'scheduled') as scheduled_tours,
        COUNT(DISTINCT gs.id) FILTER (WHERE gs.status = 'in_progress') as active_tours,
        COUNT(DISTINCT gr.id) as total_reviews,
        COALESCE(AVG(gr.rating), 0) as avg_rating,
        COALESCE(SUM(ge.amount) FILTER (WHERE ge.status = 'paid'), 0) as total_paid_earnings,
        COALESCE(SUM(ge.amount) FILTER (WHERE ge.status = 'pending'), 0) as pending_earnings,
        COUNT(DISTINCT gc.id) FILTER (WHERE gc.is_verified = true) as verified_certifications
      FROM partners p
      LEFT JOIN guide_schedule gs ON p.id = gs.guide_id
      LEFT JOIN guide_reviews gr ON p.id = gr.guide_id AND gr.is_public = true
      LEFT JOIN guide_earnings ge ON p.id = ge.guide_id
      LEFT JOIN guide_certifications gc ON p.id = gc.guide_id
      WHERE p.id = $1`,
      [guideId]
    );
    
    const stats = statsResult.rows[0];
    
    // Monthly earnings trend (last 6 months)
    const trendsResult = await query(
      `SELECT 
        DATE_TRUNC('month', date) as month,
        COUNT(*) as tours_count,
        SUM(amount) as earnings
      FROM guide_earnings
      WHERE guide_id = $1 
        AND date >= CURRENT_DATE - INTERVAL '6 months'
        AND status = 'paid'
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month ASC`,
      [guideId]
    );
    
    const monthlyTrends = trendsResult.rows.map(row => ({
      month: row.month,
      toursCount: parseInt(row.tours_count),
      earnings: parseFloat(row.earnings || 0)
    }));
    
    // Upcoming schedule
    const upcomingResult = await query(
      `SELECT COUNT(*) as count
       FROM guide_schedule
       WHERE guide_id = $1 
         AND start_time > NOW()
         AND status = 'scheduled'`,
      [guideId]
    );
    
    return {
      tours: {
        completed: parseInt(stats.completed_tours || 0),
        scheduled: parseInt(stats.scheduled_tours || 0),
        active: parseInt(stats.active_tours || 0)
      },
      reviews: {
        total: parseInt(stats.total_reviews || 0),
        avgRating: parseFloat(stats.avg_rating || 0).toFixed(2)
      },
      earnings: {
        totalPaid: parseFloat(stats.total_paid_earnings || 0),
        pending: parseFloat(stats.pending_earnings || 0),
        monthlyTrends
      },
      certifications: {
        verified: parseInt(stats.verified_certifications || 0)
      },
      upcoming: parseInt(upcomingResult.rows[0].count || 0)
    };
  } catch (error) {
    console.error('Error getting guide stats:', error);
    return null;
  }
}

/**
 * Get guide's weekly availability pattern
 */
export async function getGuideAvailability(guideId: string): Promise<any[]> {
  try {
    const result = await query(
      `SELECT 
        day_of_week,
        start_time,
        end_time,
        is_available
      FROM guide_availability
      WHERE guide_id = $1
      ORDER BY day_of_week, start_time`,
      [guideId]
    );
    
    return result.rows.map(row => ({
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      isAvailable: row.is_available
    }));
  } catch (error) {
    console.error('Error getting guide availability:', error);
    return [];
  }
}

/**
 * Check if guide is available for specific date/time
 */
export async function isGuideAvailable(
  guideId: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  try {
    // Check overall availability status
    const statusResult = await query(
      `SELECT is_available FROM partners WHERE id = $1`,
      [guideId]
    );
    
    if (!statusResult.rows[0]?.is_available) {
      return false;
    }
    
    // Check for schedule conflicts
    const noConflicts = await checkScheduleConflicts(guideId, startTime, endTime);
    
    return noConflicts;
  } catch (error) {
    console.error('Error checking guide availability:', error);
    return false;
  }
}

/**
 * Find available guides by criteria
 */
export async function findAvailableGuides(
  startTime: string,
  endTime: string,
  specialization?: string,
  language?: string,
  location?: { lat: number; lng: number; radiusKm?: number }
): Promise<any[]> {
  try {
    let queryStr = `
      SELECT 
        p.id,
        p.name,
        p.rating,
        p.review_count,
        p.experience_years,
        p.specializations,
        p.languages,
        p.bio,
        ST_X(p.location::geometry) as longitude,
        ST_Y(p.location::geometry) as latitude,
        a.url as logo_url
      FROM partners p
      LEFT JOIN assets a ON p.logo_asset_id = a.id
      WHERE p.category = 'guide'
        AND p.is_available = true
    `;
    
    const params: any[] = [startTime, endTime];
    let paramIndex = 3;
    
    if (specialization) {
      queryStr += ` AND $${paramIndex} = ANY(p.specializations)`;
      params.push(specialization);
      paramIndex++;
    }
    
    if (language) {
      queryStr += ` AND $${paramIndex} = ANY(p.languages)`;
      params.push(language);
      paramIndex++;
    }
    
    if (location) {
      const radiusMeters = (location.radiusKm || 50) * 1000;
      queryStr += ` AND ST_DWithin(
        p.location,
        ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography,
        $${paramIndex + 2}
      )`;
      params.push(location.lng, location.lat, radiusMeters);
      paramIndex += 3;
    }
    
    // Check for schedule conflicts
    queryStr += `
      AND NOT EXISTS (
        SELECT 1 FROM guide_schedule gs
        WHERE gs.guide_id = p.id
          AND gs.status != 'cancelled'
          AND tstzrange(gs.start_time, gs.end_time) && tstzrange($1, $2)
      )
    `;
    
    queryStr += ` ORDER BY p.rating DESC, p.review_count DESC LIMIT 20`;
    
    const result = await query(queryStr, params);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      rating: parseFloat(row.rating),
      reviewCount: row.review_count,
      experienceYears: row.experience_years,
      specializations: row.specializations,
      languages: row.languages,
      bio: row.bio,
      location: row.latitude && row.longitude ? {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude)
      } : null,
      logoUrl: row.logo_url
    }));
  } catch (error) {
    console.error('Error finding available guides:', error);
    return [];
  }
}

/**
 * Get guide's expertise zones for map display
 */
export async function getGuideExpertiseZones(guideId: string): Promise<any[]> {
  try {
    // Get tours associated with this guide
    const result = await query(
      `SELECT DISTINCT
        t.id,
        t.title,
        ST_X(t.location::geometry) as longitude,
        ST_Y(t.location::geometry) as latitude,
        t.duration,
        t.difficulty_level
      FROM tours t
      WHERE t.guide_id = $1
        AND t.location IS NOT NULL
      ORDER BY t.title`,
      [guideId]
    );
    
    return result.rows.map(row => ({
      tourId: row.id,
      title: row.title,
      location: {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude)
      },
      duration: row.duration,
      difficultyLevel: row.difficulty_level
    }));
  } catch (error) {
    console.error('Error getting guide expertise zones:', error);
    return [];
  }
}
