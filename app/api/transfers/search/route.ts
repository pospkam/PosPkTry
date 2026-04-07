import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { TransferSearchRequest, TransferSearchResponse, TransferOption, SearchMetadata, TransferVehicle } from '@/types/transfer';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

// GET /api/transfers/search - Поиск доступных трансферов
// AUTH: публичный — guest может искать трансферы по маршруту/дате без авторизации.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Извлекаем параметры поиска
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const date = searchParams.get('date');
    const passengers = parseInt(searchParams.get('passengers') || '1');
    const vehicleType = searchParams.get('vehicle_type');
    const budgetMin = searchParams.get('budget_min') ? parseFloat(searchParams.get('budget_min')!) : undefined;
    const budgetMax = searchParams.get('budget_max') ? parseFloat(searchParams.get('budget_max')!) : undefined;
    const features = searchParams.get('features')?.split(',') || [];
    const languages = searchParams.get('languages')?.split(',') || [];

    // Валидация обязательных параметров
    if (!from || !to || !date || !passengers) {
      return NextResponse.json({
        success: false,
        error: 'Отсутствуют обязательные параметры: from, to, date, passengers'
      }, { status: 400 });
    }

    // Валидация даты
    const searchDate = new Date(date);
    if (isNaN(searchDate.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Неверный формат даты. Используйте YYYY-MM-DD'
      }, { status: 400 });
    }

    // Валидация количества пассажиров
    if (passengers < 1 || passengers > 50) {
      return NextResponse.json({
        success: false,
        error: 'Количество пассажиров должно быть от 1 до 50'
      }, { status: 400 });
    }

    const startTime = Date.now();

    try {
      // Поиск маршрутов по названиям (сначала точное совпадение, потом частичное)
      const routeQuery = `
        SELECT DISTINCT r.*, 
               ST_Distance(
                 ST_Point($1, $2)::geography, 
                 ST_Point(ST_X(r.from_coordinates), ST_Y(r.from_coordinates))::geography
               ) as from_distance,
               ST_Distance(
                 ST_Point($3, $4)::geography, 
                 ST_Point(ST_X(r.to_coordinates), ST_Y(r.to_coordinates))::geography
               ) as to_distance
        FROM transfer_routes r
        WHERE r.is_active = true
          AND (
            (LOWER(r.from_location) LIKE LOWER($5) OR LOWER(r.from_location) LIKE LOWER($6))
            AND (LOWER(r.to_location) LIKE LOWER($7) OR LOWER(r.to_location) LIKE LOWER($8))
          )
        ORDER BY (from_distance + to_distance) ASC
        LIMIT 10
      `;

      // Для демонстрации используем координаты Петропавловска-Камчатского
      const fromCoords = { lat: 53.02, lng: 158.65 };
      const toCoords = { lat: 53.17, lng: 158.65 };
      
      const routeResult = await query(routeQuery, [
        fromCoords.lng, fromCoords.lat,
        toCoords.lng, toCoords.lat,
        `%${from}%`, `${from}%`,
        `%${to}%`, `${to}%`
      ]);

      if (routeResult.rows.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            availableTransfers: [],
            totalCount: 0,
            searchMetadata: {
              searchId: `search_${Date.now()}`,
              searchTime: new Date(),
              resultsCount: 0,
              minPrice: 0,
              maxPrice: 0,
              averagePrice: 0,
              searchDuration: Date.now() - startTime
            }
          }
        });
      }

      // Поиск доступных расписаний для найденных маршрутов
      const routeIds = routeResult.rows.map(r => r.id);
      const placeholders = routeIds.map((_, i) => `$${i + 1}`).join(',');

      let scheduleQuery = `
        SELECT s.*, r.*, v.*, d.*, o.name as operator_name, o.phone as operator_phone, o.email as operator_email
        FROM transfer_schedules s
        JOIN transfer_routes r ON s.route_id = r.id
        JOIN transfer_vehicles v ON s.vehicle_id = v.id
        JOIN transfer_drivers d ON s.driver_id = d.id
        JOIN operators o ON v.operator_id = o.id
        WHERE s.route_id IN (${placeholders})
          AND s.is_active = true
          AND v.is_active = true
          AND d.is_active = true
          AND s.available_seats >= $${routeIds.length + 1}
      `;

      const queryParams = [...routeIds, passengers];

      // Добавляем фильтры
      if (vehicleType) {
        scheduleQuery += ` AND v.vehicle_type = $${queryParams.length + 1}`;
        queryParams.push(vehicleType);
      }

      if (budgetMin !== undefined) {
        scheduleQuery += ` AND s.price_per_person >= $${queryParams.length + 1}`;
        queryParams.push(budgetMin);
      }

      if (budgetMax !== undefined) {
        scheduleQuery += ` AND s.price_per_person <= $${queryParams.length + 1}`;
        queryParams.push(budgetMax);
      }

      // Фильтр по функциям
      if (features.length > 0) {
        const featureConditions = features.map((_, i) => 
          `$${queryParams.length + i + 1} = ANY(v.features)`
        ).join(' AND ');
        scheduleQuery += ` AND ${featureConditions}`;
        queryParams.push(...features);
      }

      // Фильтр по языкам
      if (languages.length > 0) {
        const languageConditions = languages.map((_, i) => 
          `$${queryParams.length + i + 1} = ANY(d.languages)`
        ).join(' AND ');
        scheduleQuery += ` AND ${languageConditions}`;
        queryParams.push(...languages);
      }

      scheduleQuery += ` ORDER BY s.price_per_person ASC, s.departure_time ASC`;

      const scheduleResult = await query<{
        id: string; route_id: string; name: string; from_location: string; to_location: string;
        from_coordinates: { x: string; y: string }; to_coordinates: { x: string; y: string };
        distance_km: string; estimated_duration_minutes: number; is_active: boolean;
        vehicle_id: string; operator_id: string; vehicle_type: string; make: string; model: string;
        year: number; capacity: number; features: string[]; license_plate: string;
        driver_id: string; phone: string; email: string | null; license_number: string;
        languages: string[]; rating: string; total_trips: number;
        departure_time: string; arrival_time: string; price_per_person: string;
        available_seats: number; operator_name: string; operator_phone: string; operator_email: string;
        created_at: Date; updated_at: Date;
      }>(scheduleQuery, queryParams);

      // Преобразуем результаты в формат API
      const availableTransfers: TransferOption[] = scheduleResult.rows.map(row => ({
        scheduleId: row.id,
        route: {
          id: row.route_id,
          name: row.name,
          fromLocation: row.from_location,
          toLocation: row.to_location,
          fromCoordinates: {
            lat: parseFloat(row.from_coordinates.y),
            lng: parseFloat(row.from_coordinates.x)
          },
          toCoordinates: {
            lat: parseFloat(row.to_coordinates.y),
            lng: parseFloat(row.to_coordinates.x)
          },
          distanceKm: parseFloat(row.distance_km),
          estimatedDurationMinutes: row.estimated_duration_minutes,
          isActive: row.is_active,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        },
        vehicle: {
          id: row.vehicle_id,
          operatorId: row.operator_id,
          vehicleType: row.vehicle_type as TransferVehicle['vehicleType'],
          make: row.make,
          model: row.model,
          year: row.year,
          capacity: row.capacity,
          features: row.features || [],
          licensePlate: row.license_plate,
          isActive: row.is_active,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        },
        driver: {
          id: row.driver_id,
          operatorId: row.operator_id,
          name: row.name,
          phone: row.phone,
          email: row.email ?? undefined,
          licenseNumber: row.license_number,
          languages: row.languages || [],
          rating: parseFloat(row.rating),
          totalTrips: row.total_trips,
          isActive: row.is_active,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        },
        departureTime: row.departure_time,
        arrivalTime: row.arrival_time,
        pricePerPerson: parseFloat(row.price_per_person),
        totalPrice: parseFloat(row.price_per_person) * passengers,
        availableSeats: row.available_seats,
        features: row.features || [],
        languages: row.languages || [],
        operator: {
          id: row.operator_id,
          name: row.operator_name,
          phone: row.operator_phone,
          email: row.operator_email,
          rating: 4.5 // Заглушка, нужно получать из таблицы операторов
        },
        stops: [] // Заглушка, нужно получать из таблицы остановок
      }));

      const searchMetadata: SearchMetadata = {
        searchId: `search_${Date.now()}`,
        searchTime: new Date(),
        resultsCount: availableTransfers.length,
        minPrice: availableTransfers.length > 0 ? Math.min(...availableTransfers.map(t => t.pricePerPerson)) : 0,
        maxPrice: availableTransfers.length > 0 ? Math.max(...availableTransfers.map(t => t.pricePerPerson)) : 0,
        averagePrice: availableTransfers.length > 0 ? 
          availableTransfers.reduce((sum, t) => sum + t.pricePerPerson, 0) / availableTransfers.length : 0,
        searchDuration: Date.now() - startTime
      };

      return NextResponse.json({
        success: true,
        data: {
          availableTransfers,
          totalCount: availableTransfers.length,
          searchMetadata
        }
      });

    } catch (dbError) {
      const msg = dbError instanceof Error ? dbError.message : 'Ошибка базы данных';
      return NextResponse.json({
        success: false,
        error: `Ошибка поиска трансферов: ${msg}`
      }, { status: 503 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера при поиске трансферов'
    }, { status: 500 });
  }
}
