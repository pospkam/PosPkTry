// =============================================
// АЛГОРИТМ ИНТЕЛЛЕКТУАЛЬНОГО СОПОСТАВЛЕНИЯ
// Kamchatour Hub - Transfer Matching Algorithm
// =============================================

import { query } from '@/lib/database';
import { TransferBookingRequest, TransferOption } from '@/types/transfer';

interface MatchingCriteria {
  vehicleType?: string;
  capacity: number;
  features: string[];
  languages: string[];
  maxDistance: number; // в метрах
  maxPrice: number;
  minRating: number;
  workingHours: {
    start: string;
    end: string;
  };
}

interface DriverScore {
  driverId: string;
  score: number;
  reasons: string[];
  details: {
    rating: number;
    price: number;
    distance: number;
    availability: number;
    experience: number;
    features: string[];
    languages: string[];
  };
}

interface MatchingResult {
  success: boolean;
  drivers: DriverScore[];
  totalFound: number;
  processingTime: number;
  algorithm: string;
}

export class TransferMatchingEngine {
  private weights = {
    rating: 0.3,        // 30% - рейтинг водителя
    price: 0.25,        // 25% - цена поездки
    distance: 0.2,      // 20% - расстояние до пассажира
    availability: 0.15, // 15% - доступность
    experience: 0.1     // 10% - опыт водителя
  };

  // Основной метод сопоставления
  async findBestDrivers(
    booking: TransferBookingRequest,
    criteria: MatchingCriteria
  ): Promise<MatchingResult> {
    const startTime = Date.now();

    try {
      // 1. Получаем всех потенциальных водителей
      const potentialDrivers = await this.getPotentialDrivers(booking, criteria);
      
      if (potentialDrivers.length === 0) {
        return {
          success: false,
          drivers: [],
          totalFound: 0,
          processingTime: Date.now() - startTime,
          algorithm: 'intelligent_matching_v1'
        };
      }

      // 2. Рассчитываем баллы для каждого водителя
      const scoredDrivers = await this.calculateDriverScores(
        potentialDrivers,
        booking,
        criteria
      );

      // 3. Сортируем по баллам (от лучшего к худшему)
      const sortedDrivers = scoredDrivers.sort((a, b) => b.score - a.score);

      // 4. Берем топ-5 водителей
      const topDrivers = sortedDrivers.slice(0, 5);

      return {
        success: true,
        drivers: topDrivers,
        totalFound: potentialDrivers.length,
        processingTime: Date.now() - startTime,
        algorithm: 'intelligent_matching_v1'
      };

    } catch (error) {
      console.error('Matching algorithm error:', error);
      return {
        success: false,
        drivers: [],
        totalFound: 0,
        processingTime: Date.now() - startTime,
        algorithm: 'intelligent_matching_v1'
      };
    }
  }

  // Получение потенциальных водителей
  private async getPotentialDrivers(
    booking: TransferBookingRequest,
    criteria: MatchingCriteria
  ): Promise<any[]> {
    const queryText = `
      SELECT DISTINCT
        d.id,
        d.name,
        d.phone,
        d.email,
        d.rating,
        d.experience_years,
        d.languages,
        d.working_hours,
        d.is_available,
        d.current_location,
        v.id as vehicle_id,
        v.vehicle_type,
        v.capacity,
        v.features,
        v.is_active as vehicle_active,
        s.id as schedule_id,
        s.departure_time,
        s.price_per_person,
        s.available_seats,
        r.from_location,
        r.to_location,
        r.from_coordinates,
        r.to_coordinates
      FROM transfer_drivers d
      JOIN transfer_vehicles v ON d.id = v.driver_id
      JOIN transfer_schedules s ON v.id = s.vehicle_id
      JOIN transfer_routes r ON s.route_id = r.id
      WHERE 
        d.is_available = true
        AND v.is_active = true
        AND s.available_seats >= $1
        AND d.rating >= $2
        AND v.vehicle_type = COALESCE($3, v.vehicle_type)
        AND s.departure_time::date = $4::date
        AND ST_DWithin(
          d.current_location::geography,
          ST_GeogFromText('POINT(' || $5 || ' ' || $6 || ')'),
          $7
        )
      ORDER BY d.rating DESC, s.price_per_person ASC
    `;

    const result = await query(queryText, [
      criteria.capacity,
      criteria.minRating,
      criteria.vehicleType || null,
      booking.departureDate,
      booking.fromCoordinates?.lng || 0,
      booking.fromCoordinates?.lat || 0,
      criteria.maxDistance
    ]);

    return result.rows;
  }

  // Расчет баллов для водителей
  private async calculateDriverScores(
    drivers: any[],
    booking: TransferBookingRequest,
    criteria: MatchingCriteria
  ): Promise<DriverScore[]> {
    const scoredDrivers: DriverScore[] = [];

    for (const driver of drivers) {
      const score = await this.calculateDriverScore(driver, booking, criteria);
      scoredDrivers.push(score);
    }

    return scoredDrivers;
  }

  // Расчет балла для одного водителя
  private async calculateDriverScore(
    driver: any,
    booking: TransferBookingRequest,
    criteria: MatchingCriteria
  ): Promise<DriverScore> {
    const reasons: string[] = [];
    let totalScore = 0;

    // 1. Рейтинг водителя (0-1)
    const ratingScore = Math.min(driver.rating / 5, 1);
    totalScore += ratingScore * this.weights.rating;
    if (ratingScore > 0.8) reasons.push('Высокий рейтинг');

    // 2. Цена поездки (0-1, чем дешевле, тем лучше)
    const maxPrice = criteria.maxPrice;
    const currentPrice = parseFloat(driver.price_per_person) * booking.passengersCount;
    const priceScore = Math.max(0, 1 - (currentPrice / maxPrice));
    totalScore += priceScore * this.weights.price;
    if (priceScore > 0.8) reasons.push('Выгодная цена');

    // 3. Расстояние до пассажира (0-1, чем ближе, тем лучше)
    const distance = this.calculateDistance(
      booking.fromCoordinates || { lat: 0, lng: 0 },
      { lat: driver.current_location.y, lng: driver.current_location.x }
    );
    const distanceScore = Math.max(0, 1 - (distance / criteria.maxDistance));
    totalScore += distanceScore * this.weights.distance;
    if (distanceScore > 0.8) reasons.push('Близко к пассажиру');

    // 4. Доступность (0-1)
    const availabilityScore = driver.is_available ? 1 : 0;
    totalScore += availabilityScore * this.weights.availability;
    if (availabilityScore > 0) reasons.push('Доступен сейчас');

    // 5. Опыт водителя (0-1)
    const experienceScore = Math.min(driver.experience_years / 10, 1);
    totalScore += experienceScore * this.weights.experience;
    if (experienceScore > 0.7) reasons.push('Опытный водитель');

    // 6. Дополнительные бонусы
    const bonusScore = this.calculateBonusScore(driver, criteria);
    totalScore += bonusScore;
    if (bonusScore > 0) reasons.push('Дополнительные преимущества');

    // 7. Штрафы
    const penaltyScore = this.calculatePenaltyScore(driver, criteria);
    totalScore += penaltyScore;
    if (penaltyScore < 0) reasons.push('Есть ограничения');

    // Нормализуем итоговый балл (0-1)
    const finalScore = Math.max(0, Math.min(1, totalScore));

    return {
      driverId: driver.id,
      score: finalScore,
      reasons,
      details: {
        rating: driver.rating,
        price: currentPrice,
        distance: distance,
        availability: availabilityScore,
        experience: driver.experience_years,
        features: driver.features || [],
        languages: driver.languages || []
      }
    };
  }

  // Расчет бонусных баллов
  private calculateBonusScore(driver: any, criteria: MatchingCriteria): number {
    let bonus = 0;

    // Бонус за соответствие функциям
    const matchingFeatures = (driver.features || []).filter((feature: string) =>
      criteria.features.includes(feature)
    );
    bonus += (matchingFeatures.length / criteria.features.length) * 0.1;

    // Бонус за знание языков
    const matchingLanguages = (driver.languages || []).filter((lang: string) =>
      criteria.languages.includes(lang)
    );
    bonus += (matchingLanguages.length / criteria.languages.length) * 0.1;

    // Бонус за высокую вместимость
    if (driver.capacity > criteria.capacity) {
      bonus += 0.05;
    }

    return bonus;
  }

  // Расчет штрафных баллов
  private calculatePenaltyScore(driver: any, criteria: MatchingCriteria): number {
    let penalty = 0;

    // Штраф за несоответствие рабочему времени
    const currentHour = new Date().getHours();
    const workingStart = parseInt(driver.working_hours?.start?.split(':')[0] || '0');
    const workingEnd = parseInt(driver.working_hours?.end?.split(':')[0] || '24');
    
    if (currentHour < workingStart || currentHour > workingEnd) {
      penalty -= 0.2;
    }

    // Штраф за низкую доступность мест
    const availabilityRatio = driver.available_seats / driver.capacity;
    if (availabilityRatio < 0.3) {
      penalty -= 0.1;
    }

    return penalty;
  }

  // Расчет расстояния между точками
  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371000; // Радиус Земли в метрах
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  // Преобразование градусов в радианы
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Автоматическое назначение лучшего водителя
  async autoAssignDriver(
    booking: TransferBookingRequest,
    criteria: MatchingCriteria
  ): Promise<{
    success: boolean;
    driverId?: string;
    message: string;
  }> {
    try {
      const result = await this.findBestDrivers(booking, criteria);
      
      if (!result.success || result.drivers.length === 0) {
        return {
          success: false,
          message: 'Не найдено подходящих водителей'
        };
      }

      const bestDriver = result.drivers[0];
      
      // Проверяем, что водитель действительно доступен
      const isAvailable = await this.checkDriverAvailability(bestDriver.driverId);
      
      if (!isAvailable) {
        return {
          success: false,
          message: 'Выбранный водитель больше не доступен'
        };
      }

      return {
        success: true,
        driverId: bestDriver.driverId,
        message: `Назначен водитель с рейтингом ${bestDriver.details.rating.toFixed(1)}`
      };

    } catch (error) {
      console.error('Auto assignment error:', error);
      return {
        success: false,
        message: 'Ошибка при назначении водителя'
      };
    }
  }

  // Проверка доступности водителя
  private async checkDriverAvailability(driverId: string): Promise<boolean> {
    try {
      const result = await query(
        'SELECT is_available FROM transfer_drivers WHERE id = $1',
        [driverId]
      );
      
      return result.rows.length > 0 && result.rows[0].is_available;
    } catch (error) {
      console.error('Driver availability check error:', error);
      return false;
    }
  }

  // Получение статистики сопоставления
  async getMatchingStats(period: string = '7 days'): Promise<{
    totalBookings: number;
    successfulMatches: number;
    averageResponseTime: number;
    topDrivers: Array<{
      driverId: string;
      name: string;
      matches: number;
      averageScore: number;
    }>;
  }> {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_bookings,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as successful_matches,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as average_response_time
        FROM transfer_bookings 
        WHERE created_at >= NOW() - INTERVAL '${period}'
      `);

      const topDriversResult = await query(`
        SELECT 
          d.id as driver_id,
          d.name,
          COUNT(b.id) as matches,
          AVG(d.rating) as average_score
        FROM transfer_drivers d
        LEFT JOIN transfer_bookings b ON d.id = b.driver_id
        WHERE b.created_at >= NOW() - INTERVAL '${period}'
        GROUP BY d.id, d.name
        ORDER BY matches DESC
        LIMIT 10
      `);

      return {
        totalBookings: parseInt(result.rows[0].total_bookings),
        successfulMatches: parseInt(result.rows[0].successful_matches),
        averageResponseTime: parseFloat(result.rows[0].average_response_time || 0),
        topDrivers: topDriversResult.rows.map(row => ({
          driverId: row.driver_id,
          name: row.name,
          matches: parseInt(row.matches),
          averageScore: parseFloat(row.average_score)
        }))
      };

    } catch (error) {
      console.error('Matching stats error:', error);
      return {
        totalBookings: 0,
        successfulMatches: 0,
        averageResponseTime: 0,
        topDrivers: []
      };
    }
  }
}

// Создаем глобальный экземпляр
export const matchingEngine = new TransferMatchingEngine();

// Экспортируем типы
export type { MatchingCriteria, DriverScore, MatchingResult };