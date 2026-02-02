/**
 * Gear Rental Helper Functions
 * Utilities for working with gear rental partners and equipment
 */

import { query } from '@/lib/database';

/**
 * Get partner ID for a gear rental user
 * Returns partner.id linked to user.id where category='gear'
 */
export async function getGearPartnerId(userId: string): Promise<string | null> {
  try {
    const result = await query(
      `SELECT id FROM partners 
       WHERE user_id = $1 AND category = 'gear'
       LIMIT 1`,
      [userId]
    );
    
    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('Error getting gear partner ID:', error);
    return null;
  }
}

/**
 * Get gear partner record with full details
 */
export async function getGearPartnerByUserId(userId: string): Promise<any | null> {
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
        p.created_at,
        p.updated_at,
        a.url as logo_url
      FROM partners p
      LEFT JOIN assets a ON p.logo_asset_id = a.id
      WHERE p.user_id = $1 AND p.category = 'gear'
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
      createdAt: partner.created_at,
      updatedAt: partner.updated_at
    };
  } catch (error) {
    console.error('Error getting gear partner:', error);
    return null;
  }
}

/**
 * Create gear partner record for user if doesn't exist
 */
export async function ensureGearPartnerExists(userId: string, userName: string, userEmail: string): Promise<string> {
  try {
    // Check if partner exists
    const existing = await query(
      `SELECT id FROM partners WHERE user_id = $1 AND category = 'gear' LIMIT 1`,
      [userId]
    );
    
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }
    
    // Create new partner record
    const result = await query(
      `INSERT INTO partners (user_id, name, category, contact, is_verified, rating, review_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        userName,
        'gear',
        JSON.stringify({ email: userEmail, phone: '' }),
        false,
        0.0,
        0
      ]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error ensuring gear partner exists:', error);
    throw error;
  }
}

/**
 * Verify user owns a gear item
 */
export async function verifyGearItemOwnership(userId: string, gearItemId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT gi.id 
       FROM gear_items gi
       JOIN partners p ON gi.partner_id = p.id
       WHERE p.user_id = $1 AND gi.id = $2`,
      [userId, gearItemId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying gear item ownership:', error);
    return false;
  }
}

/**
 * Verify user owns a rental
 */
export async function verifyGearRentalOwnership(userId: string, rentalId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT gr.id 
       FROM gear_rentals gr
       JOIN partners p ON gr.partner_id = p.id
       WHERE p.user_id = $1 AND gr.id = $2`,
      [userId, rentalId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying rental ownership:', error);
    return false;
  }
}

/**
 * Check gear availability for date range
 */
export async function checkGearAvailability(
  gearItemId: string,
  startDate: string,
  endDate: string,
  quantity: number = 1
): Promise<boolean> {
  try {
    const result = await query(
      `SELECT MIN(available_quantity) as min_available
       FROM gear_availability
       WHERE gear_item_id = $1 
         AND date >= $2 
         AND date < $3`,
      [gearItemId, startDate, endDate]
    );
    
    const minAvailable = parseInt(result.rows[0]?.min_available || 0);
    return minAvailable >= quantity;
  } catch (error) {
    console.error('Error checking gear availability:', error);
    return false;
  }
}

/**
 * Calculate rental cost
 */
export async function calculateRentalCost(
  gearItemId: string,
  startDate: string,
  endDate: string,
  quantity: number = 1,
  includeInsurance: boolean = false
): Promise<{ rentalCost: number; depositAmount: number; insuranceCost: number; totalAmount: number } | null> {
  try {
    const gearResult = await query(
      `SELECT 
        price_per_day,
        price_per_week,
        price_per_month,
        deposit_amount,
        insurance_cost_per_day
      FROM gear_items
      WHERE id = $1`,
      [gearItemId]
    );
    
    if (gearResult.rows.length === 0) {
      return null;
    }
    
    const gear = gearResult.rows[0];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate rental cost (optimize for week/month rates)
    let rentalCost = 0;
    let remainingDays = days;
    
    if (gear.price_per_month && remainingDays >= 30) {
      const months = Math.floor(remainingDays / 30);
      rentalCost += months * parseFloat(gear.price_per_month);
      remainingDays -= months * 30;
    }
    
    if (gear.price_per_week && remainingDays >= 7) {
      const weeks = Math.floor(remainingDays / 7);
      rentalCost += weeks * parseFloat(gear.price_per_week);
      remainingDays -= weeks * 7;
    }
    
    rentalCost += remainingDays * parseFloat(gear.price_per_day);
    rentalCost *= quantity;
    
    const depositAmount = parseFloat(gear.deposit_amount || 0) * quantity;
    const insuranceCost = includeInsurance 
      ? days * parseFloat(gear.insurance_cost_per_day || 0) * quantity 
      : 0;
    
    return {
      rentalCost,
      depositAmount,
      insuranceCost,
      totalAmount: rentalCost + insuranceCost
    };
  } catch (error) {
    console.error('Error calculating rental cost:', error);
    return null;
  }
}

/**
 * Get gear partner statistics
 */
export async function getGearStats(userId: string): Promise<any> {
  try {
    const partnerId = await getGearPartnerId(userId);
    
    if (!partnerId) {
      return null;
    }
    
    // Overall stats
    const statsResult = await query(
      `SELECT 
        COUNT(DISTINCT gi.id) as total_items,
        COUNT(DISTINCT gi.id) FILTER (WHERE gi.is_active = true) as active_items,
        COUNT(DISTINCT gr.id) as total_rentals,
        COUNT(DISTINCT gr.id) FILTER (WHERE gr.status = 'active') as active_rentals,
        COUNT(DISTINCT gr.id) FILTER (WHERE gr.status = 'completed') as completed_rentals,
        COUNT(DISTINCT gr.id) FILTER (WHERE gr.status = 'pending') as pending_rentals,
        COALESCE(SUM(gr.total_amount) FILTER (WHERE gr.payment_status = 'paid'), 0) as total_revenue,
        COALESCE(SUM(gr.deposit_amount) FILTER (WHERE gr.deposit_paid = true AND gr.deposit_refunded = false), 0) as deposits_held,
        COALESCE(AVG(grev.rating), 0) as avg_rating,
        COUNT(DISTINCT grev.id) as total_reviews
      FROM partners p
      LEFT JOIN gear_items gi ON p.id = gi.partner_id
      LEFT JOIN gear_rentals gr ON p.id = gr.partner_id
      LEFT JOIN gear_reviews grev ON gi.id = grev.gear_item_id AND grev.is_public = true
      WHERE p.id = $1`,
      [partnerId]
    );
    
    const stats = statsResult.rows[0];
    
    // Monthly revenue trend (last 6 months)
    const trendsResult = await query(
      `SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as rentals_count,
        SUM(total_amount) as revenue
      FROM gear_rentals
      WHERE partner_id = $1 
        AND payment_status = 'paid'
        AND created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC`,
      [partnerId]
    );
    
    const monthlyTrends = trendsResult.rows.map(row => ({
      month: row.month,
      rentalsCount: parseInt(row.rentals_count),
      revenue: parseFloat(row.revenue || 0)
    }));
    
    // Top rented items
    const topItemsResult = await query(
      `SELECT 
        id,
        name,
        category,
        rental_count,
        total_revenue,
        rating
      FROM gear_items
      WHERE partner_id = $1 AND is_active = true
      ORDER BY rental_count DESC, total_revenue DESC
      LIMIT 5`,
      [partnerId]
    );
    
    const topItems = topItemsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      rentalCount: row.rental_count,
      totalRevenue: parseFloat(row.total_revenue || 0),
      rating: parseFloat(row.rating || 0)
    }));
    
    return {
      items: {
        total: parseInt(stats.total_items || 0),
        active: parseInt(stats.active_items || 0)
      },
      rentals: {
        total: parseInt(stats.total_rentals || 0),
        active: parseInt(stats.active_rentals || 0),
        completed: parseInt(stats.completed_rentals || 0),
        pending: parseInt(stats.pending_rentals || 0)
      },
      revenue: {
        total: parseFloat(stats.total_revenue || 0),
        depositsHeld: parseFloat(stats.deposits_held || 0),
        monthlyTrends
      },
      reviews: {
        total: parseInt(stats.total_reviews || 0),
        avgRating: parseFloat(stats.avg_rating || 0).toFixed(2)
      },
      topItems
    };
  } catch (error) {
    console.error('Error getting gear stats:', error);
    return null;
  }
}

/**
 * Find available gear items
 */
export async function findAvailableGear(
  category?: string,
  startDate?: string,
  endDate?: string,
  minPrice?: number,
  maxPrice?: number,
  tags?: string[]
): Promise<any[]> {
  try {
    let queryStr = `
      SELECT 
        gi.id,
        gi.name,
        gi.description,
        gi.category,
        gi.subcategory,
        gi.brand,
        gi.price_per_day,
        gi.price_per_week,
        gi.images,
        gi.condition,
        gi.available_quantity,
        gi.rating,
        gi.review_count,
        p.name as partner_name,
        p.rating as partner_rating
      FROM gear_items gi
      JOIN partners p ON gi.partner_id = p.id
      WHERE gi.is_active = true
        AND gi.available_quantity > 0
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (category) {
      queryStr += ` AND gi.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (minPrice !== undefined) {
      queryStr += ` AND gi.price_per_day >= $${paramIndex}`;
      params.push(minPrice);
      paramIndex++;
    }
    
    if (maxPrice !== undefined) {
      queryStr += ` AND gi.price_per_day <= $${paramIndex}`;
      params.push(maxPrice);
      paramIndex++;
    }
    
    if (tags && tags.length > 0) {
      queryStr += ` AND gi.tags && $${paramIndex}`;
      params.push(tags);
      paramIndex++;
    }
    
    // Check availability for date range if provided
    if (startDate && endDate) {
      queryStr += `
        AND NOT EXISTS (
          SELECT 1 FROM gear_availability ga
          WHERE ga.gear_item_id = gi.id
            AND ga.date >= $${paramIndex}
            AND ga.date < $${paramIndex + 1}
            AND ga.available_quantity <= 0
        )
      `;
      params.push(startDate, endDate);
      paramIndex += 2;
    }
    
    queryStr += ` ORDER BY gi.rating DESC, gi.review_count DESC LIMIT 50`;
    
    const result = await query(queryStr, params);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      subcategory: row.subcategory,
      brand: row.brand,
      pricePerDay: parseFloat(row.price_per_day),
      pricePerWeek: row.price_per_week ? parseFloat(row.price_per_week) : null,
      images: row.images,
      condition: row.condition,
      availableQuantity: row.available_quantity,
      rating: parseFloat(row.rating),
      reviewCount: row.review_count,
      partnerName: row.partner_name,
      partnerRating: parseFloat(row.partner_rating)
    }));
  } catch (error) {
    console.error('Error finding available gear:', error);
    return [];
  }
}

/**
 * Update gear item availability
 */
export async function updateGearAvailability(
  gearItemId: string,
  dateFrom: string,
  dateTo: string
): Promise<boolean> {
  try {
    // Get gear item total quantity
    const gearResult = await query(
      'SELECT quantity FROM gear_items WHERE id = $1',
      [gearItemId]
    );
    
    if (gearResult.rows.length === 0) {
      return false;
    }
    
    const totalQuantity = gearResult.rows[0].quantity;
    
    // Generate dates and upsert availability
    await query(
      `INSERT INTO gear_availability (gear_item_id, date, total_quantity, rented_quantity, available_quantity)
       SELECT 
         $1,
         date::DATE,
         $2,
         0,
         $2
       FROM generate_series($3::DATE, $4::DATE, '1 day'::interval) AS date
       ON CONFLICT (gear_item_id, date) DO UPDATE
       SET total_quantity = $2`,
      [gearItemId, totalQuantity, dateFrom, dateTo]
    );
    
    return true;
  } catch (error) {
    console.error('Error updating gear availability:', error);
    return false;
  }
}
