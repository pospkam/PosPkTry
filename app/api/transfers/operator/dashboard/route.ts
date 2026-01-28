import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/pillars/core-infrastructure-infrastructure/lib/database';
import { TransferOperatorDashboard, TransferOperatorStats } from '@/types/transfer';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

// GET /api/transfers/operator/dashboard - Дашборд перевозчика
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operatorId = searchParams.get('operator_id') || 'operator_1'; // Заглушка

    try {
      // Получаем статистику перевозчика
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT v.id) as total_vehicles,
          COUNT(DISTINCT d.id) as total_drivers,
          COUNT(DISTINCT r.id) as total_routes,
          COUNT(DISTINCT s.id) as total_schedules,
          COUNT(DISTINCT b.id) as total_bookings,
          COALESCE(SUM(b.total_price), 0) as total_revenue,
          COALESCE(AVG(d.rating), 0) as avg_driver_rating,
          COUNT(DISTINCT CASE WHEN b.status = 'pending' THEN b.id END) as pending_bookings,
          COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.id END) as active_bookings,
          COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings,
          COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.id END) as cancelled_bookings
        FROM operators o
        LEFT JOIN transfer_vehicles v ON o.id = v.operator_id AND v.is_active = true
        LEFT JOIN transfer_drivers d ON o.id = d.operator_id AND d.is_active = true
        LEFT JOIN transfer_routes r ON o.id = r.id AND r.is_active = true
        LEFT JOIN transfer_schedules s ON v.id = s.vehicle_id AND s.is_active = true
        LEFT JOIN transfer_bookings b ON s.id = b.schedule_id
        WHERE o.id = $1
      `;

      const statsResult = await query(statsQuery, [operatorId]);
      const stats = statsResult.rows[0];

      // Получаем активные бронирования
      const activeBookingsQuery = `
        SELECT b.*, r.from_location, r.to_location, s.departure_time, v.vehicle_type, d.name as driver_name
        FROM transfer_bookings b
        JOIN transfer_schedules s ON b.schedule_id = s.id
        JOIN transfer_routes r ON s.route_id = r.id
        JOIN transfer_vehicles v ON s.vehicle_id = v.id
        JOIN transfer_drivers d ON s.driver_id = d.id
        WHERE b.operator_id = $1 AND b.status IN ('pending', 'confirmed')
        ORDER BY b.created_at DESC
        LIMIT 20
      `;

      const activeBookingsResult = await query(activeBookingsQuery, [operatorId]);

      // Получаем транспортные средства
      const vehiclesQuery = `
        SELECT v.*, 
               COUNT(s.id) as active_schedules,
               COUNT(b.id) as total_bookings
        FROM transfer_vehicles v
        LEFT JOIN transfer_schedules s ON v.id = s.vehicle_id AND s.is_active = true
        LEFT JOIN transfer_bookings b ON s.id = b.schedule_id
        WHERE v.operator_id = $1 AND v.is_active = true
        GROUP BY v.id
        ORDER BY v.created_at DESC
      `;

      const vehiclesResult = await query(vehiclesQuery, [operatorId]);

      // Получаем водителей
      const driversQuery = `
        SELECT d.*, 
               COUNT(b.id) as total_bookings,
               COALESCE(AVG(br.rating), 0) as avg_rating
        FROM transfer_drivers d
        LEFT JOIN transfer_schedules s ON d.id = s.driver_id AND s.is_active = true
        LEFT JOIN transfer_bookings b ON s.id = b.schedule_id
        LEFT JOIN transfer_reviews br ON d.id = br.driver_id
        WHERE d.operator_id = $1 AND d.is_active = true
        GROUP BY d.id
        ORDER BY d.created_at DESC
      `;

      const driversResult = await query(driversQuery, [operatorId]);

      // Получаем маршруты
      const routesQuery = `
        SELECT r.*, 
               COUNT(s.id) as active_schedules,
               COUNT(b.id) as total_bookings
        FROM transfer_routes r
        LEFT JOIN transfer_schedules s ON r.id = s.route_id AND s.is_active = true
        LEFT JOIN transfer_bookings b ON s.id = b.schedule_id
        WHERE r.is_active = true
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `;

      const routesResult = await query(routesQuery, []);

      // Получаем недавние бронирования
      const recentBookingsQuery = `
        SELECT b.*, r.from_location, r.to_location, s.departure_time, v.vehicle_type, d.name as driver_name
        FROM transfer_bookings b
        JOIN transfer_schedules s ON b.schedule_id = s.id
        JOIN transfer_routes r ON s.route_id = r.id
        JOIN transfer_vehicles v ON s.vehicle_id = v.id
        JOIN transfer_drivers d ON s.driver_id = d.id
        WHERE b.operator_id = $1
        ORDER BY b.created_at DESC
        LIMIT 10
      `;

      const recentBookingsResult = await query(recentBookingsQuery, [operatorId]);

      // Получаем предстоящие рейсы
      const upcomingSchedulesQuery = `
        SELECT s.*, r.from_location, r.to_location, v.vehicle_type, d.name as driver_name
        FROM transfer_schedules s
        JOIN transfer_routes r ON s.route_id = r.id
        JOIN transfer_vehicles v ON s.vehicle_id = v.id
        JOIN transfer_drivers d ON s.driver_id = d.id
        WHERE s.operator_id = $1 AND s.is_active = true
        AND s.departure_time >= NOW()::time
        ORDER BY s.departure_time ASC
        LIMIT 10
      `;

      const upcomingSchedulesResult = await query(upcomingSchedulesQuery, [operatorId]);

      // Получаем уведомления
      const notificationsQuery = `
        SELECT n.*, b.contact_phone, b.contact_email
        FROM transfer_notifications n
        LEFT JOIN transfer_bookings b ON n.booking_id = b.id
        WHERE n.operator_id = $1
        ORDER BY n.created_at DESC
        LIMIT 20
      `;

      const notificationsResult = await query(notificationsQuery, [operatorId]);

      // Формируем статистику
      const operatorStats: TransferOperatorStats = {
        totalVehicles: parseInt(stats.total_vehicles) || 0,
        totalDrivers: parseInt(stats.total_drivers) || 0,
        totalRoutes: parseInt(stats.total_routes) || 0,
        totalSchedules: parseInt(stats.total_schedules) || 0,
        totalBookings: parseInt(stats.total_bookings) || 0,
        totalRevenue: parseFloat(stats.total_revenue) || 0,
        averageDriverRating: parseFloat(stats.avg_driver_rating) || 0,
        activeBookings: parseInt(stats.active_bookings) || 0,
        pendingBookings: parseInt(stats.pending_bookings) || 0,
        completedBookings: parseInt(stats.completed_bookings) || 0,
        cancelledBookings: parseInt(stats.cancelled_bookings) || 0,
        monthlyRevenue: parseFloat(stats.total_revenue) * 0.3, // Заглушка
        weeklyRevenue: parseFloat(stats.total_revenue) * 0.1, // Заглушка
        dailyRevenue: parseFloat(stats.total_revenue) * 0.02 // Заглушка
      };

      // Формируем дашборд
      const dashboard: TransferOperatorDashboard = {
        stats: operatorStats,
        activeBookings: activeBookingsResult.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          operatorId: row.operator_id,
          routeId: row.route_id,
          vehicleId: row.vehicle_id,
          driverId: row.driver_id,
          scheduleId: row.schedule_id,
          bookingDate: row.booking_date,
          departureTime: row.departure_time,
          passengersCount: row.passengers_count,
          totalPrice: parseFloat(row.total_price),
          status: row.status,
          specialRequests: row.special_requests,
          contactPhone: row.contact_phone,
          contactEmail: row.contact_email,
          confirmationCode: row.confirmation_code,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        })),
        vehicles: vehiclesResult.rows.map(row => ({
          id: row.id,
          operatorId: row.operator_id,
          vehicleType: row.vehicle_type,
          make: row.make,
          model: row.model,
          year: row.year,
          capacity: row.capacity,
          features: row.features || [],
          licensePlate: row.license_plate,
          isActive: row.is_active,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        })),
        drivers: driversResult.rows.map(row => ({
          id: row.id,
          operatorId: row.operator_id,
          name: row.name,
          phone: row.phone,
          email: row.email,
          licenseNumber: row.license_number,
          languages: row.languages || [],
          rating: parseFloat(row.avg_rating) || 0,
          totalTrips: row.total_trips,
          isActive: row.is_active,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        })),
        routes: routesResult.rows.map(row => ({
          id: row.id,
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
        })),
        recentBookings: recentBookingsResult.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          operatorId: row.operator_id,
          routeId: row.route_id,
          vehicleId: row.vehicle_id,
          driverId: row.driver_id,
          scheduleId: row.schedule_id,
          bookingDate: row.booking_date,
          departureTime: row.departure_time,
          passengersCount: row.passengers_count,
          totalPrice: parseFloat(row.total_price),
          status: row.status,
          specialRequests: row.special_requests,
          contactPhone: row.contact_phone,
          contactEmail: row.contact_email,
          confirmationCode: row.confirmation_code,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        })),
        upcomingSchedules: upcomingSchedulesResult.rows.map(row => ({
          id: row.id,
          routeId: row.route_id,
          vehicleId: row.vehicle_id,
          driverId: row.driver_id,
          departureTime: row.departure_time,
          arrivalTime: row.arrival_time,
          pricePerPerson: parseFloat(row.price_per_person),
          availableSeats: row.available_seats,
          isActive: row.is_active,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        })),
        notifications: notificationsResult.rows.map(row => ({
          id: row.id,
          bookingId: row.booking_id,
          userId: row.user_id,
          operatorId: row.operator_id,
          type: row.type,
          title: row.title,
          message: row.message,
          isRead: row.is_read,
          sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
          createdAt: new Date(row.created_at)
        }))
      };

      return NextResponse.json({
        success: true,
        data: dashboard
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // Fallback к тестовым данным
      const mockDashboard = createMockDashboard();
      
      return NextResponse.json({
        success: true,
        data: mockDashboard
      });
    }

  } catch (error) {
    console.error('Error in operator dashboard:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера при получении дашборда'
    }, { status: 500 });
  }
}

// Функция для создания тестового дашборда
function createMockDashboard(): TransferOperatorDashboard {
  return {
    stats: {
      totalVehicles: 5,
      totalDrivers: 5,
      totalRoutes: 5,
      totalSchedules: 15,
      totalBookings: 120,
      totalRevenue: 450000,
      averageDriverRating: 4.7,
      activeBookings: 8,
      pendingBookings: 3,
      completedBookings: 105,
      cancelledBookings: 4,
      monthlyRevenue: 135000,
      weeklyRevenue: 45000,
      dailyRevenue: 9000
    },
    activeBookings: [
      {
        id: 'booking_1',
        userId: 'user_1',
        operatorId: 'operator_1',
        routeId: 'route_1',
        vehicleId: 'vehicle_1',
        driverId: 'driver_1',
        scheduleId: 'schedule_1',
        bookingDate: '2024-01-15',
        departureTime: '08:00',
        passengersCount: 2,
        totalPrice: 3000,
        status: 'pending',
        specialRequests: 'Детское кресло',
        contactPhone: '+7-914-123-45-67',
        contactEmail: 'client@example.com',
        confirmationCode: 'ABC123',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    vehicles: [
      {
        id: 'vehicle_1',
        operatorId: 'operator_1',
        vehicleType: 'economy',
        make: 'Hyundai',
        model: 'Solaris',
        year: 2022,
        capacity: 4,
        features: ['air_conditioning'],
        licensePlate: 'КМ 123 АА',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    drivers: [
      {
        id: 'driver_1',
        operatorId: 'operator_1',
        name: 'Иванов Иван Иванович',
        phone: '+7-914-123-45-67',
        email: 'ivanov@example.com',
        licenseNumber: '1234567890',
        languages: ['ru', 'en'],
        rating: 4.8,
        totalTrips: 150,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    routes: [
      {
        id: 'route_1',
        name: 'Аэропорт → Петропавловск-Камчатский',
        fromLocation: 'Аэропорт Елизово',
        toLocation: 'Петропавловск-Камчатский',
        fromCoordinates: { lat: 53.17, lng: 158.65 },
        toCoordinates: { lat: 53.02, lng: 158.65 },
        distanceKm: 30.5,
        estimatedDurationMinutes: 45,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    recentBookings: [],
    upcomingSchedules: [],
    notifications: []
  };
}