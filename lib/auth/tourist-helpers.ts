/**
 * Tourist System Helper Functions
 * Provides utilities for tourist operations
 */

import { query } from '@/lib/database';

/**
 * Get or create tourist profile
 */
export async function getTouristProfile(userId: string): Promise<any | null> {
  try {
    let result = await query(
      `SELECT * FROM tourist_profiles WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      const userResult = await query(
        `SELECT name, email FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return null;
      }

      result = await query(
        `INSERT INTO tourist_profiles (user_id, full_name)
         VALUES ($1, $2)
         RETURNING *`,
        [userId, userResult.rows[0].name]
      );
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error getting tourist profile:', error);
    return null;
  }
}

/**
 * Update tourist statistics
 */
export async function updateTouristStats(userId: string): Promise<void> {
  try {
    await query(
      `UPDATE tourist_profiles tp
       SET 
         total_trips = (
           SELECT COUNT(*) FROM tourist_trips WHERE tourist_id = tp.id AND status = 'completed'
         ),
         total_spent = (
           SELECT COALESCE(SUM(b.total_price), 0)
           FROM bookings b
           JOIN tourist_trips tt ON tt.id = ANY(
             SELECT trip_id FROM trip_bookings WHERE booking_id = b.id
           )
           WHERE tt.tourist_id = tp.id AND b.status = 'confirmed'
         )
       WHERE tp.user_id = $1`,
      [userId]
    );
  } catch (error) {
    console.error('Error updating tourist stats:', error);
  }
}

/**
 * Award achievement to tourist
 */
export async function awardAchievement(
  userId: string,
  achievementType: string,
  achievementName: string,
  achievementDescription: string,
  pointsEarned: number,
  metadata: any = {}
): Promise<boolean> {
  try {
    const profile = await getTouristProfile(userId);
    if (!profile) return false;

    await query(
      `INSERT INTO tourist_achievements (tourist_id, achievement_type, achievement_name, achievement_description, points_earned, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tourist_id, achievement_type) DO NOTHING`,
      [profile.id, achievementType, achievementName, achievementDescription, pointsEarned, JSON.stringify(metadata)]
    );

    await query(
      `UPDATE tourist_profiles
       SET loyalty_points = loyalty_points + $1
       WHERE id = $2`,
      [pointsEarned, profile.id]
    );

    return true;
  } catch (error) {
    console.error('Error awarding achievement:', error);
    return false;
  }
}

/**
 * Check and award trip-based achievements
 */
export async function checkTripAchievements(userId: string): Promise<void> {
  try {
    const profile = await getTouristProfile(userId);
    if (!profile) return;

    const tripCount = profile.total_trips;

    const achievements = [
      { type: 'first_trip', name: 'Первая поездка', description: 'Совершили первую поездку на Камчатку', threshold: 1, points: 100 },
      { type: 'trips_5', name: '5 поездок', description: 'Совершили 5 поездок', threshold: 5, points: 500 },
      { type: 'trips_10', name: '10 поездок', description: 'Совершили 10 поездок', threshold: 10, points: 1000 },
      { type: 'trips_25', name: '25 поездок', description: 'Совершили 25 поездок', threshold: 25, points: 2500 },
      { type: 'trips_50', name: '50 поездок', description: 'Совершили 50 поездок', threshold: 50, points: 5000 },
      { type: 'trips_100', name: '100 поездок', description: 'Совершили 100 поездок', threshold: 100, points: 10000 }
    ];

    for (const achievement of achievements) {
      if (tripCount >= achievement.threshold) {
        await awardAchievement(
          userId,
          achievement.type,
          achievement.name,
          achievement.description,
          achievement.points,
          { trips_count: tripCount }
        );
      }
    }
  } catch (error) {
    console.error('Error checking trip achievements:', error);
  }
}

/**
 * Get expiring documents
 */
export async function getExpiringDocuments(userId: string, daysBeforeExpiry: number = 30): Promise<any[]> {
  try {
    const profile = await getTouristProfile(userId);
    if (!profile) return [];

    const result = await query(
      `SELECT *
       FROM tourist_documents
       WHERE tourist_id = $1
         AND expiry_date IS NOT NULL
         AND expiry_date <= CURRENT_DATE + INTERVAL '${daysBeforeExpiry} days'
         AND expiry_date > CURRENT_DATE
         AND reminder_sent = FALSE
       ORDER BY expiry_date ASC`,
      [profile.id]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting expiring documents:', error);
    return [];
  }
}

/**
 * Mark document reminder as sent
 */
export async function markDocumentReminderSent(documentId: string): Promise<void> {
  try {
    await query(
      `UPDATE tourist_documents SET reminder_sent = TRUE WHERE id = $1`,
      [documentId]
    );
  } catch (error) {
    console.error('Error marking document reminder sent:', error);
  }
}

/**
 * Get tourist recommendations
 */
export async function getTouristRecommendations(userId: string, limit: number = 10): Promise<any> {
  try {
    const profile = await getTouristProfile(userId);
    if (!profile) return { tours: [], accommodations: [] };

    const preferences = profile.preferences || {};
    const interests = profile.interests || [];

    let toursQuery = `
      SELECT t.*, p.name as partner_name
      FROM tours t
      JOIN partners p ON t.operator_id = p.id
      WHERE t.is_active = TRUE
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (interests.length > 0) {
      toursQuery += ` AND t.tags && $${paramIndex}::text[]`;
      params.push(interests);
      paramIndex++;
    }

    toursQuery += ` ORDER BY t.rating DESC, t.review_count DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const toursResult = await query(toursQuery, params);

    return {
      tours: toursResult.rows,
      accommodations: []
    };
  } catch (error) {
    console.error('Error getting tourist recommendations:', error);
    return { tours: [], accommodations: [] };
  }
}

/**
 * Calculate loyalty discount
 */
export function calculateLoyaltyDiscount(loyaltyTier: string, amount: number): number {
  const discounts: { [key: string]: number } = {
    'bronze': 0,
    'silver': 0.05,
    'gold': 0.10,
    'platinum': 0.15,
    'diamond': 0.20
  };

  const discountPercentage = discounts[loyaltyTier] || 0;
  return amount * discountPercentage;
}

/**
 * Get tourist travel stats
 */
export async function getTouristTravelStats(userId: string): Promise<any> {
  try {
    const profile = await getTouristProfile(userId);
    if (!profile) return null;

    const result = await query(
      `SELECT
        COUNT(DISTINCT tt.id) as total_trips,
        COUNT(DISTINCT CASE WHEN tt.status = 'completed' THEN tt.id END) as completed_trips,
        COUNT(DISTINCT CASE WHEN tt.status = 'upcoming' THEN tt.id END) as upcoming_trips,
        COUNT(DISTINCT CASE WHEN tt.status = 'active' THEN tt.id END) as active_trips,
        COALESCE(SUM(tt.actual_spent), 0) as total_spent,
        COUNT(DISTINCT tr.id) as total_reviews,
        COALESCE(AVG(tr.rating), 0) as average_rating_given,
        COUNT(DISTINCT ta.id) as total_achievements,
        COALESCE(SUM(ta.points_earned), 0) as total_points_earned,
        COUNT(DISTINCT tw.id) as wishlist_count
       FROM tourist_profiles tp
       LEFT JOIN tourist_trips tt ON tt.tourist_id = tp.id
       LEFT JOIN tourist_reviews tr ON tr.tourist_id = tp.id
       LEFT JOIN tourist_achievements ta ON ta.tourist_id = tp.id
       LEFT JOIN tourist_wishlist tw ON tw.tourist_id = tp.id
       WHERE tp.user_id = $1
       GROUP BY tp.id`,
      [userId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error getting tourist travel stats:', error);
    return null;
  }
}

/**
 * Validate trip data
 */
export function validateTripData(data: {
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  participants: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.tripName || data.tripName.length < 3) {
    errors.push('Укажите название поездки (минимум 3 символа)');
  }

  if (!data.destination || data.destination.length < 2) {
    errors.push('Укажите место назначения');
  }

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (endDate < startDate) {
    errors.push('Дата окончания должна быть позже даты начала');
  }

  if (!data.participants || data.participants < 1) {
    errors.push('Укажите количество участников (минимум 1)');
  }

  if (data.participants > 50) {
    errors.push('Максимальное количество участников: 50');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate document data
 */
export function validateDocumentData(data: {
  documentType: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const validTypes = ['passport', 'visa', 'insurance', 'vaccination', 'permit', 'license', 'other'];
  if (!data.documentType || !validTypes.includes(data.documentType)) {
    errors.push('Укажите корректный тип документа');
  }

  if (data.issueDate && data.expiryDate) {
    const issueDate = new Date(data.issueDate);
    const expiryDate = new Date(data.expiryDate);

    if (expiryDate <= issueDate) {
      errors.push('Дата окончания действия должна быть позже даты выдачи');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get upcoming trips with reminders
 */
export async function getUpcomingTripsWithReminders(userId: string, daysAhead: number = 7): Promise<any[]> {
  try {
    const profile = await getTouristProfile(userId);
    if (!profile) return [];

    const result = await query(
      `SELECT tt.*, 
        (SELECT json_agg(json_build_object(
          'id', tb.booking_id,
          'type', tb.booking_type,
          'start_time', tb.start_time
        ) ORDER BY tb.start_time)
        FROM trip_bookings tb
        WHERE tb.trip_id = tt.id) as bookings
       FROM tourist_trips tt
       WHERE tt.tourist_id = $1
         AND tt.status IN ('planning', 'upcoming')
         AND tt.start_date <= CURRENT_DATE + INTERVAL '${daysAhead} days'
         AND tt.start_date > CURRENT_DATE
       ORDER BY tt.start_date ASC`,
      [profile.id]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting upcoming trips:', error);
    return [];
  }
}
