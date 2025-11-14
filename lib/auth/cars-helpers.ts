/**
 * Cars System Helper Functions
 * Provides utilities for car rental partner operations with validation
 */

import { query } from '@/lib/database';

/**
 * Get partner ID for cars category
 */
export async function getCarsPartnerId(userId: string): Promise<string | null> {
  try {
    const result = await query(
      `SELECT id FROM partners WHERE user_id = $1 AND category = 'cars' LIMIT 1`,
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    console.error('Error getting cars partner ID:', error);
    return null;
  }
}

/**
 * Ensure cars partner exists
 */
export async function ensureCarsPartnerExists(userId: string): Promise<string> {
  let partnerId = await getCarsPartnerId(userId);
  
  if (!partnerId) {
    const userResult = await query(
      `SELECT name, email FROM users WHERE id = $1`,
      [userId]
    );
    const user = userResult.rows[0] || { name: 'Партнёр автопарка', email: '' };
    const contact = {
      email: user.email || '',
      phone: '',
    };

    const result = await query(
      `INSERT INTO partners (user_id, name, category, contact, is_verified, rating, review_count)
       VALUES ($1, $2, 'cars', $3, FALSE, 0, 0)
       RETURNING id`,
      [userId, user.name || 'Партнёр автопарка', JSON.stringify(contact)]
    );
    partnerId = result.rows[0].id;
  }
  
  return partnerId;
}

/**
 * Verify car ownership
 */
export async function verifyCarOwnership(userId: string, carId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT c.id 
       FROM cars c
       JOIN partners p ON c.partner_id = p.id
       WHERE p.user_id = $1 AND c.id = $2`,
      [userId, carId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying car ownership:', error);
    return false;
  }
}

/**
 * Verify rental ownership
 */
export async function verifyRentalOwnership(userId: string, rentalId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT cr.id 
       FROM car_rentals cr
       JOIN partners p ON cr.partner_id = p.id
       WHERE p.user_id = $1 AND cr.id = $2`,
      [userId, rentalId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying rental ownership:', error);
    return false;
  }
}

/**
 * Check car availability for date range
 */
export async function checkCarAvailability(
  carId: string, 
  startDate: string, 
  endDate: string
): Promise<{ available: boolean; availableDates: Date[]; unavailableDates: Date[] }> {
  try {
    const result = await query(
      `SELECT date, available_quantity
       FROM car_availability
       WHERE car_id = $1 AND date >= $2 AND date < $3
       ORDER BY date`,
      [carId, startDate, endDate]
    );

    const availableDates: Date[] = [];
    const unavailableDates: Date[] = [];
    let allAvailable = true;

    for (const row of result.rows) {
      if (row.available_quantity > 0) {
        availableDates.push(new Date(row.date));
      } else {
        unavailableDates.push(new Date(row.date));
        allAvailable = false;
      }
    }

    return {
      available: allAvailable,
      availableDates,
      unavailableDates
    };
  } catch (error) {
    console.error('Error checking car availability:', error);
    return { available: false, availableDates: [], unavailableDates: [] };
  }
}

/**
 * Calculate rental cost with optimizations
 */
export async function calculateRentalCost(
  carId: string,
  days: number,
  includesInsurance: boolean = false,
  includesGPS: boolean = false,
  includesChildSeat: boolean = false,
  additionalDriver: boolean = false
): Promise<{
  rentalCost: number;
  insuranceCost: number;
  extrasCost: number;
  totalCost: number;
  depositAmount: number;
}> {
  try {
    const carResult = await query(
      `SELECT 
        price_per_day,
        price_per_week,
        price_per_month,
        insurance_daily_cost,
        deposit_amount
       FROM cars
       WHERE id = $1`,
      [carId]
    );

    if (carResult.rows.length === 0) {
      throw new Error('Car not found');
    }

    const car = carResult.rows[0];
    let rentalCost = 0;

    // Calculate optimal pricing
    if (days >= 30 && car.price_per_month) {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      rentalCost = (months * car.price_per_month) + (remainingDays * car.price_per_day);
    } else if (days >= 7 && car.price_per_week) {
      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      rentalCost = (weeks * car.price_per_week) + (remainingDays * car.price_per_day);
    } else {
      rentalCost = days * car.price_per_day;
    }

    // Calculate extras
    const insuranceCost = includesInsurance ? (days * (car.insurance_daily_cost || 0)) : 0;
    const gpsCost = includesGPS ? (days * 300) : 0;
    const childSeatCost = includesChildSeat ? (days * 200) : 0;
    const additionalDriverCost = additionalDriver ? (days * 500) : 0;
    const extrasCost = gpsCost + childSeatCost + additionalDriverCost;

    return {
      rentalCost,
      insuranceCost,
      extrasCost,
      totalCost: rentalCost + insuranceCost + extrasCost,
      depositAmount: car.deposit_amount
    };
  } catch (error) {
    console.error('Error calculating rental cost:', error);
    throw error;
  }
}

/**
 * Find available cars with filters
 */
export async function findAvailableCars(filters: {
  startDate?: string;
  endDate?: string;
  category?: string;
  transmission?: string;
  fuelType?: string;
  seats?: number;
  minPrice?: number;
  maxPrice?: number;
  features?: string[];
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  try {
    let queryText = `
      SELECT DISTINCT
        c.id,
        c.brand,
        c.model,
        c.year,
        c.category,
        c.transmission,
        c.fuel_type,
        c.seats,
        c.doors,
        c.price_per_day,
        c.price_per_week,
        c.price_per_month,
        c.images,
        c.features,
        c.rating,
        c.review_count,
        c.deposit_amount,
        c.insurance_included,
        c.available_quantity
      FROM cars c
      WHERE c.is_active = TRUE
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Check availability for date range
    if (filters.startDate && filters.endDate) {
      queryText += ` AND c.id IN (
        SELECT car_id 
        FROM car_availability
        WHERE date >= $${paramIndex} AND date < $${paramIndex + 1}
        GROUP BY car_id
        HAVING MIN(available_quantity) > 0
      )`;
      params.push(filters.startDate, filters.endDate);
      paramIndex += 2;
    }

    // Category filter
    if (filters.category) {
      queryText += ` AND c.category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    // Transmission filter
    if (filters.transmission) {
      queryText += ` AND c.transmission = $${paramIndex}`;
      params.push(filters.transmission);
      paramIndex++;
    }

    // Fuel type filter
    if (filters.fuelType) {
      queryText += ` AND c.fuel_type = $${paramIndex}`;
      params.push(filters.fuelType);
      paramIndex++;
    }

    // Seats filter
    if (filters.seats) {
      queryText += ` AND c.seats >= $${paramIndex}`;
      params.push(filters.seats);
      paramIndex++;
    }

    // Price range
    if (filters.minPrice) {
      queryText += ` AND c.price_per_day >= $${paramIndex}`;
      params.push(filters.minPrice);
      paramIndex++;
    }
    if (filters.maxPrice) {
      queryText += ` AND c.price_per_day <= $${paramIndex}`;
      params.push(filters.maxPrice);
      paramIndex++;
    }

    // Features filter
    if (filters.features && filters.features.length > 0) {
      queryText += ` AND c.features @> $${paramIndex}::jsonb`;
      params.push(JSON.stringify(filters.features));
      paramIndex++;
    }

    queryText += ` ORDER BY c.rating DESC, c.review_count DESC`;

    // Pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);
    return result.rows;
  } catch (error) {
    console.error('Error finding available cars:', error);
    return [];
  }
}

/**
 * Get cars partner statistics
 */
export async function getCarsStats(partnerId: string): Promise<any> {
  try {
    const result = await query(
      `SELECT
        -- Cars overview
        COUNT(DISTINCT c.id) as total_cars,
        SUM(CASE WHEN c.is_active THEN 1 ELSE 0 END) as active_cars,
        AVG(c.rating) as avg_rating,
        SUM(c.review_count) as total_reviews,
        
        -- Rentals overview
        COUNT(DISTINCT cr.id) as total_rentals,
        SUM(CASE WHEN cr.status = 'active' THEN 1 ELSE 0 END) as active_rentals,
        SUM(CASE WHEN cr.status = 'completed' THEN 1 ELSE 0 END) as completed_rentals,
        SUM(CASE WHEN cr.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_rentals,
        
        -- Revenue
        COALESCE(SUM(CASE WHEN cr.payment_status = 'paid' THEN cr.rental_cost ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN cr.payment_status = 'paid' AND cr.created_at >= NOW() - INTERVAL '30 days' THEN cr.rental_cost ELSE 0 END), 0) as revenue_last_30_days,
        
        -- Deposits
        SUM(CASE WHEN cr.deposit_paid AND NOT cr.deposit_refunded THEN cr.deposit_amount ELSE 0 END) as deposits_held,
        
        -- Maintenance
        (SELECT COUNT(*) FROM car_maintenance cm WHERE cm.car_id IN (SELECT id FROM cars WHERE partner_id = $1)) as maintenance_count,
        (SELECT COALESCE(SUM(cost), 0) FROM car_maintenance cm WHERE cm.car_id IN (SELECT id FROM cars WHERE partner_id = $1)) as maintenance_cost
        
       FROM cars c
       LEFT JOIN car_rentals cr ON cr.car_id = c.id
       WHERE c.partner_id = $1`,
      [partnerId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error getting cars stats:', error);
    throw error;
  }
}

/**
 * Update car availability quantity
 */
export async function updateCarAvailability(carId: string): Promise<void> {
  try {
    await query(
      `UPDATE cars
       SET available_quantity = quantity - (
         SELECT COUNT(*)
         FROM car_rentals
         WHERE car_id = $1
         AND status = 'confirmed'
         AND start_date <= CURRENT_DATE
         AND end_date > CURRENT_DATE
       )
       WHERE id = $1`,
      [carId]
    );
  } catch (error) {
    console.error('Error updating car availability:', error);
    throw error;
  }
}

/**
 * Validate driver license data
 */
export function validateDriverLicense(data: {
  licenseNumber: string;
  issueDate?: string;
  expiryDate: string;
  birthDate: string;
  rentalStartDate: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check license number format (basic validation)
  if (!data.licenseNumber || data.licenseNumber.length < 5) {
    errors.push('Некорректный номер водительского удостоверения');
  }

  // Check expiry date
  const expiryDate = new Date(data.expiryDate);
  const startDate = new Date(data.rentalStartDate);
  if (expiryDate <= startDate) {
    errors.push('Срок действия водительского удостоверения истек');
  }

  // Check driver age
  const birthDate = new Date(data.birthDate);
  const age = Math.floor((startDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  if (age < 18) {
    errors.push('Водитель должен быть старше 18 лет');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate car rental data
 */
export function validateRentalData(data: {
  startDate: string;
  endDate: string;
  carId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  driverLicenseNumber: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check dates
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate < today) {
    errors.push('Дата начала аренды не может быть в прошлом');
  }

  if (endDate <= startDate) {
    errors.push('Дата окончания должна быть позже даты начала');
  }

  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (days > 90) {
    errors.push('Максимальный срок аренды - 90 дней');
  }

  // Check customer data
  if (!data.customerName || data.customerName.length < 2) {
    errors.push('Укажите полное имя');
  }

  if (!data.customerEmail || !data.customerEmail.includes('@')) {
    errors.push('Укажите корректный email');
  }

  if (!data.customerPhone || data.customerPhone.length < 10) {
    errors.push('Укажите корректный номер телефона');
  }

  if (!data.driverLicenseNumber || data.driverLicenseNumber.length < 5) {
    errors.push('Укажите номер водительского удостоверения');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
