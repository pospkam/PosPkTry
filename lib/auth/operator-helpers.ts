/**
 * Operator Helper Functions
 * Utilities for working with operator role and partner records
 */

import { query } from '@/lib/database';

/**
 * Get partner ID for an operator user
 * Returns partner.id linked to user.id
 */
export async function getOperatorPartnerId(userId: string): Promise<string | null> {
  try {
    const result = await query(
      `SELECT id FROM partners 
       WHERE user_id = $1 AND category = 'operator'
       LIMIT 1`,
      [userId]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    
    // Auto-create partner profile if missing
    const userResult = await query(
      `SELECT name, email FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return null;
    }
    
    const user = userResult.rows[0];
    const contact = {
      email: user.email || '',
      phone: '',
    };
    
    const partnerResult = await query(
      `INSERT INTO partners (user_id, name, category, contact, is_verified, rating, review_count)
       VALUES ($1, $2, 'operator', $3, FALSE, 0, 0)
       RETURNING id`,
      [userId, user.name || 'Оператор', JSON.stringify(contact)]
    );
    
    return partnerResult.rows[0]?.id || null;
  } catch (error) {
    console.error('Error getting operator partner ID:', error);
    return null;
  }
}

/**
 * Get guide partner ID for a guide user
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
 * Get transfer partner ID for a transfer operator user
 */
export async function getTransferPartnerId(userId: string): Promise<string | null> {
  try {
    const result = await query(
      `SELECT id FROM partners 
       WHERE user_id = $1 AND category = 'transfer'
       LIMIT 1`,
      [userId]
    );
    
    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('Error getting transfer partner ID:', error);
    return null;
  }
}

/**
 * Get partner record with full details
 */
export async function getPartnerByUserId(userId: string, category?: string): Promise<any | null> {
  try {
    let queryStr = `
      SELECT 
        p.id,
        p.name,
        p.category,
        p.description,
        p.contact,
        p.rating,
        p.review_count,
        p.is_verified,
        p.logo_asset_id,
        p.created_at,
        p.updated_at,
        a.url as logo_url
      FROM partners p
      LEFT JOIN assets a ON p.logo_asset_id = a.id
      WHERE p.user_id = $1
    `;
    
    const params = [userId];
    
    if (category) {
      queryStr += ` AND p.category = $2`;
      params.push(category);
    }
    
    queryStr += ` LIMIT 1`;
    
    const result = await query(queryStr, params);
    
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
      createdAt: partner.created_at,
      updatedAt: partner.updated_at
    };
  } catch (error) {
    console.error('Error getting partner by user ID:', error);
    return null;
  }
}

/**
 * Create partner record for user if doesn't exist
 */
export async function ensurePartnerExists(userId: string, userName: string, userEmail: string, role: string): Promise<string> {
  try {
    // Check if partner exists
    const existing = await query(
      `SELECT id FROM partners WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }
    
    // Map role to category
    const categoryMap: Record<string, string> = {
      'operator': 'operator',
      'guide': 'guide',
      'transfer': 'transfer',
      'agent': 'operator' // agents work as operators
    };
    
    const category = categoryMap[role] || 'operator';
    
    // Create new partner record
    const result = await query(
      `INSERT INTO partners (user_id, name, category, contact, is_verified, rating, review_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        userName,
        category,
        JSON.stringify({ email: userEmail, phone: '' }),
        false,
        0.0,
        0
      ]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error ensuring partner exists:', error);
    throw error;
  }
}

/**
 * Verify user owns a tour (through partner)
 */
export async function verifyTourOwnership(userId: string, tourId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT t.id 
       FROM tours t
       JOIN partners p ON t.operator_id = p.id
       WHERE p.user_id = $1 AND t.id = $2`,
      [userId, tourId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying tour ownership:', error);
    return false;
  }
}

/**
 * Verify user owns a booking (through tour -> partner)
 */
export async function verifyBookingOwnership(userId: string, bookingId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT b.id 
       FROM bookings b
       JOIN tours t ON b.tour_id = t.id
       JOIN partners p ON t.operator_id = p.id
       WHERE p.user_id = $1 AND b.id = $2`,
      [userId, bookingId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying booking ownership:', error);
    return false;
  }
}

/**
 * Get operator statistics
 */
export async function getOperatorStats(userId: string): Promise<any> {
  try {
    const partnerId = await getOperatorPartnerId(userId);
    
    if (!partnerId) {
      return null;
    }
    
    // Check cache first
    const cacheResult = await query(
      `SELECT * FROM operator_stats_cache 
       WHERE operator_id = $1 
       AND last_calculated > NOW() - INTERVAL '1 hour'`,
      [partnerId]
    );
    
    if (cacheResult.rows.length > 0) {
      const cached = cacheResult.rows[0];
      return {
        totalTours: cached.total_tours,
        activeTours: cached.active_tours,
        totalBookings: cached.total_bookings,
        totalRevenue: parseFloat(cached.total_revenue),
        avgRating: parseFloat(cached.avg_rating),
        totalReviews: cached.total_reviews,
        completionRate: parseFloat(cached.completion_rate)
      };
    }
    
    // Calculate fresh stats
    const statsResult = await query(
      `WITH tour_stats AS (
        SELECT
          COUNT(*) as total_tours,
          COUNT(CASE WHEN is_active THEN 1 END) as active_tours
        FROM tours WHERE operator_id = $1
      ),
      booking_stats AS (
        SELECT
          COUNT(*) as total_bookings,
          COALESCE(SUM(total_price), 0) as total_revenue,
          COALESCE(
            COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100,
            0
          ) as completion_rate
        FROM bookings b
        JOIN tours t ON b.tour_id = t.id
        WHERE t.operator_id = $1
      ),
      review_stats AS (
        SELECT
          COALESCE(AVG(r.rating), 0) as avg_rating,
          COUNT(*) as total_reviews
        FROM reviews r
        JOIN tours t ON r.tour_id = t.id
        WHERE t.operator_id = $1
      )
      SELECT * FROM tour_stats, booking_stats, review_stats`,
      [partnerId]
    );
    
    const stats = statsResult.rows[0];
    
    // Update cache
    await query(
      `INSERT INTO operator_stats_cache (
        operator_id, total_tours, active_tours, total_bookings,
        total_revenue, avg_rating, total_reviews, completion_rate, last_calculated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (operator_id) DO UPDATE SET
        total_tours = EXCLUDED.total_tours,
        active_tours = EXCLUDED.active_tours,
        total_bookings = EXCLUDED.total_bookings,
        total_revenue = EXCLUDED.total_revenue,
        avg_rating = EXCLUDED.avg_rating,
        total_reviews = EXCLUDED.total_reviews,
        completion_rate = EXCLUDED.completion_rate,
        last_calculated = NOW()`,
      [
        partnerId,
        stats.total_tours,
        stats.active_tours,
        stats.total_bookings,
        stats.total_revenue,
        stats.avg_rating,
        stats.total_reviews,
        stats.completion_rate
      ]
    );
    
    return {
      totalTours: parseInt(stats.total_tours),
      activeTours: parseInt(stats.active_tours),
      totalBookings: parseInt(stats.total_bookings),
      totalRevenue: parseFloat(stats.total_revenue),
      avgRating: parseFloat(stats.avg_rating),
      totalReviews: parseInt(stats.total_reviews),
      completionRate: parseFloat(stats.completion_rate)
    };
  } catch (error) {
    console.error('Error getting operator stats:', error);
    return null;
  }
}
