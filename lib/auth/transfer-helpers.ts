/**
 * Transfer Operator Helper Functions
 * Utilities for working with transfer operators, vehicles, drivers, and transfers
 */

import { query } from '@/lib/database';

/**
 * Get partner ID for a transfer operator user
 * Returns partner.id linked to user.id
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
 * Get transfer partner record with full details
 */
export async function getTransferPartnerByUserId(userId: string): Promise<any | null> {
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
      WHERE p.user_id = $1 AND p.category = 'transfer'
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
    console.error('Error getting transfer partner:', error);
    return null;
  }
}

/**
 * Create transfer partner record for user if doesn't exist
 */
export async function ensureTransferPartnerExists(userId: string, userName: string, userEmail: string): Promise<string> {
  try {
    // Check if partner exists
    const existing = await query(
      `SELECT id FROM partners WHERE user_id = $1 AND category = 'transfer' LIMIT 1`,
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
        'transfer',
        JSON.stringify({ email: userEmail, phone: '' }),
        false,
        0.0,
        0
      ]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error ensuring transfer partner exists:', error);
    throw error;
  }
}

/**
 * Verify user owns a vehicle
 */
export async function verifyVehicleOwnership(userId: string, vehicleId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT v.id 
       FROM vehicles v
       JOIN partners p ON v.operator_id = p.id
       WHERE p.user_id = $1 AND v.id = $2`,
      [userId, vehicleId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying vehicle ownership:', error);
    return false;
  }
}

/**
 * Verify user owns a driver
 */
export async function verifyDriverOwnership(userId: string, driverId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT d.id 
       FROM drivers d
       JOIN partners p ON d.operator_id = p.id
       WHERE p.user_id = $1 AND d.id = $2`,
      [userId, driverId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying driver ownership:', error);
    return false;
  }
}

/**
 * Verify user owns a transfer
 */
export async function verifyTransferOwnership(userId: string, transferId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT t.id 
       FROM transfers t
       JOIN partners p ON t.operator_id = p.id
       WHERE p.user_id = $1 AND t.id = $2`,
      [userId, transferId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying transfer ownership:', error);
    return false;
  }
}

/**
 * Verify user owns a route
 */
export async function verifyRouteOwnership(userId: string, routeId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT r.id 
       FROM transfer_routes r
       JOIN partners p ON r.operator_id = p.id
       WHERE p.user_id = $1 AND r.id = $2`,
      [userId, routeId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying route ownership:', error);
    return false;
  }
}

/**
 * Check if driver is available for specific date and time range
 */
export async function checkDriverAvailability(
  driverId: string, 
  date: string, 
  startTime: string, 
  endTime: string,
  excludeScheduleId?: string
): Promise<boolean> {
  try {
    let queryStr = `
      SELECT id FROM driver_schedules 
      WHERE driver_id = $1 
      AND date = $2 
      AND (
        (start_time < $4 AND end_time > $3)
        OR (start_time >= $3 AND start_time < $4)
        OR (end_time > $3 AND end_time <= $4)
      )
      AND type != 'available'
    `;
    
    const params: any[] = [driverId, date, startTime, endTime];
    
    if (excludeScheduleId) {
      queryStr += ` AND id != $5`;
      params.push(excludeScheduleId);
    }
    
    const result = await query(queryStr, params);
    
    // If no conflicting schedules found, driver is available
    return result.rows.length === 0;
  } catch (error) {
    console.error('Error checking driver availability:', error);
    return false;
  }
}

/**
 * Check if vehicle is available for specific date and time range
 */
export async function checkVehicleAvailability(
  vehicleId: string, 
  date: string, 
  startTime: string, 
  endTime: string
): Promise<boolean> {
  try {
    // Check if vehicle has any scheduled transfers in that time range
    const result = await query(
      `SELECT t.id 
       FROM transfers t
       WHERE t.vehicle_id = $1 
       AND DATE(t.pickup_datetime) = $2
       AND t.status NOT IN ('cancelled', 'completed')
       AND (
         (EXTRACT(HOUR FROM t.pickup_datetime)::TEXT || ':' || EXTRACT(MINUTE FROM t.pickup_datetime)::TEXT) < $4
         AND (EXTRACT(HOUR FROM COALESCE(t.dropoff_datetime, t.pickup_datetime + INTERVAL '1 hour'))::TEXT || ':' || 
              EXTRACT(MINUTE FROM COALESCE(t.dropoff_datetime, t.pickup_datetime + INTERVAL '1 hour'))::TEXT) > $3
       )`,
      [vehicleId, date, startTime, endTime]
    );
    
    // Also check if vehicle is under maintenance
    const vehicleStatus = await query(
      `SELECT status FROM vehicles WHERE id = $1`,
      [vehicleId]
    );
    
    if (vehicleStatus.rows[0]?.status !== 'active') {
      return false;
    }
    
    return result.rows.length === 0;
  } catch (error) {
    console.error('Error checking vehicle availability:', error);
    return false;
  }
}

/**
 * Assign driver to vehicle
 */
export async function assignDriverToVehicle(driverId: string, vehicleId: string): Promise<boolean> {
  try {
    await query(
      `UPDATE drivers SET vehicle_id = $1 WHERE id = $2`,
      [vehicleId, driverId]
    );
    
    return true;
  } catch (error) {
    console.error('Error assigning driver to vehicle:', error);
    return false;
  }
}

/**
 * Calculate transfer price based on route and parameters
 */
export async function calculateTransferPrice(
  routeId: string, 
  passengers: number, 
  date: string
): Promise<number> {
  try {
    const result = await query(
      `SELECT base_price, price_per_km, distance 
       FROM transfer_routes 
       WHERE id = $1`,
      [routeId]
    );
    
    if (result.rows.length === 0) {
      return 0;
    }
    
    const route = result.rows[0];
    let price = parseFloat(route.base_price);
    
    // Add distance-based pricing if available
    if (route.price_per_km && route.distance) {
      price += parseFloat(route.price_per_km) * parseFloat(route.distance);
    }
    
    // Add passenger multiplier if more than 4 passengers
    if (passengers > 4) {
      price *= (1 + (passengers - 4) * 0.1);
    }
    
    // Weekend surcharge (10%)
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      price *= 1.1;
    }
    
    return Math.round(price);
  } catch (error) {
    console.error('Error calculating transfer price:', error);
    return 0;
  }
}

/**
 * Get transfer operator statistics
 */
export async function getTransferStats(userId: string): Promise<any> {
  try {
    const operatorId = await getTransferPartnerId(userId);
    
    if (!operatorId) {
      return null;
    }
    
    const statsResult = await query(
      `SELECT 
        COUNT(DISTINCT v.id) as total_vehicles,
        COUNT(DISTINCT CASE WHEN v.status = 'active' THEN v.id END) as active_vehicles,
        COUNT(DISTINCT d.id) as total_drivers,
        COUNT(DISTINCT CASE WHEN d.status = 'active' THEN d.id END) as active_drivers,
        COUNT(DISTINCT t.id) as total_transfers,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_transfers,
        COUNT(DISTINCT CASE WHEN t.status IN ('pending', 'assigned', 'confirmed') THEN t.id END) as pending_transfers,
        COUNT(DISTINCT CASE WHEN t.status = 'cancelled' THEN t.id END) as cancelled_transfers,
        COALESCE(SUM(CASE WHEN t.payment_status = 'paid' THEN t.price ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN t.rating IS NOT NULL THEN t.rating END), 0) as avg_rating
      FROM partners p
      LEFT JOIN vehicles v ON p.id = v.operator_id
      LEFT JOIN drivers d ON p.id = d.operator_id
      LEFT JOIN transfers t ON p.id = t.operator_id
      WHERE p.id = $1`,
      [operatorId]
    );
    
    const stats = statsResult.rows[0];
    
    return {
      vehicles: {
        total: parseInt(stats.total_vehicles || 0),
        active: parseInt(stats.active_vehicles || 0)
      },
      drivers: {
        total: parseInt(stats.total_drivers || 0),
        active: parseInt(stats.active_drivers || 0)
      },
      transfers: {
        total: parseInt(stats.total_transfers || 0),
        completed: parseInt(stats.completed_transfers || 0),
        pending: parseInt(stats.pending_transfers || 0),
        cancelled: parseInt(stats.cancelled_transfers || 0)
      },
      revenue: {
        total: parseFloat(stats.total_revenue || 0)
      },
      rating: parseFloat(stats.avg_rating || 0).toFixed(2)
    };
  } catch (error) {
    console.error('Error getting transfer stats:', error);
    return null;
  }
}

/**
 * Find available vehicle for transfer
 * Returns the best match based on capacity and availability
 */
export async function findAvailableVehicle(
  operatorId: string,
  passengers: number,
  date: string,
  startTime: string,
  endTime: string,
  vehicleType?: string
): Promise<string | null> {
  try {
    let queryStr = `
      SELECT v.id, v.capacity, v.rating
      FROM vehicles v
      WHERE v.operator_id = $1
      AND v.status = 'active'
      AND v.capacity >= $2
    `;
    
    const params: any[] = [operatorId, passengers];
    let paramIndex = 3;
    
    if (vehicleType) {
      queryStr += ` AND v.type = $${paramIndex}`;
      params.push(vehicleType);
      paramIndex++;
    }
    
    queryStr += ` ORDER BY v.capacity ASC, v.rating DESC`;
    
    const vehicles = await query(queryStr, params);
    
    // Check availability for each vehicle
    for (const vehicle of vehicles.rows) {
      const isAvailable = await checkVehicleAvailability(vehicle.id, date, startTime, endTime);
      if (isAvailable) {
        return vehicle.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding available vehicle:', error);
    return null;
  }
}

/**
 * Find available driver for transfer
 * Returns the best match based on rating and availability
 */
export async function findAvailableDriver(
  operatorId: string,
  vehicleId: string | null,
  date: string,
  startTime: string,
  endTime: string
): Promise<string | null> {
  try {
    let queryStr = `
      SELECT d.id, d.rating
      FROM drivers d
      WHERE d.operator_id = $1
      AND d.status = 'active'
    `;
    
    const params: any[] = [operatorId];
    let paramIndex = 2;
    
    // Prefer driver assigned to the vehicle
    if (vehicleId) {
      queryStr += ` AND (d.vehicle_id = $${paramIndex} OR d.vehicle_id IS NULL)`;
      params.push(vehicleId);
      paramIndex++;
    }
    
    queryStr += ` ORDER BY d.vehicle_id = $${paramIndex - 1} DESC, d.rating DESC`;
    
    const drivers = await query(queryStr, params);
    
    // Check availability for each driver
    for (const driver of drivers.rows) {
      const isAvailable = await checkDriverAvailability(driver.id, date, startTime, endTime);
      if (isAvailable) {
        return driver.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding available driver:', error);
    return null;
  }
}

/**
 * Generate unique booking reference
 */
export async function generateBookingReference(): Promise<string> {
  const prefix = 'TR';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
