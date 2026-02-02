import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getTransferPartnerId } from '@/lib/auth/transfer-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/analytics/dashboard
 * Get comprehensive dashboard analytics
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'transfer') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const operatorId = await getTransferPartnerId(userId);
    
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль трансферного оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    // Overview stats
    const overviewResult = await query(
      `SELECT 
        COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'active') as active_vehicles,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'active') as active_drivers,
        COUNT(DISTINCT t.id) as total_transfers,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_transfers,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('pending', 'assigned', 'confirmed')) as pending_transfers,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in_progress') as active_transfers,
        COALESCE(SUM(t.price) FILTER (WHERE t.payment_status = 'paid'), 0) as total_revenue,
        COALESCE(SUM(t.price) FILTER (WHERE t.payment_status = 'paid' AND t.completed_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as revenue_30d,
        COALESCE(AVG(t.rating) FILTER (WHERE t.rating IS NOT NULL), 0) as avg_rating
      FROM partners p
      LEFT JOIN vehicles v ON p.id = v.operator_id
      LEFT JOIN drivers d ON p.id = d.operator_id
      LEFT JOIN transfers t ON p.id = t.operator_id
      WHERE p.id = $1`,
      [operatorId]
    );

    const overview = overviewResult.rows[0];

    // Daily trends (last 30 days)
    const trendsResult = await query(
      `SELECT 
        DATE(t.created_at) as date,
        COUNT(*) as bookings,
        COUNT(*) FILTER (WHERE t.status = 'completed') as completed,
        COALESCE(SUM(t.price) FILTER (WHERE t.payment_status = 'paid'), 0) as revenue
      FROM transfers t
      WHERE t.operator_id = $1 
      AND t.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(t.created_at)
      ORDER BY date ASC`,
      [operatorId]
    );

    const dailyTrends = trendsResult.rows.map(row => ({
      date: row.date,
      bookings: parseInt(row.bookings),
      completed: parseInt(row.completed),
      revenue: parseFloat(row.revenue)
    }));

    // Top routes
    const topRoutesResult = await query(
      `SELECT 
        r.id,
        r.name,
        r.from_location,
        r.to_location,
        COUNT(t.id) as transfers_count,
        COALESCE(SUM(t.price) FILTER (WHERE t.payment_status = 'paid'), 0) as revenue,
        COALESCE(AVG(t.rating) FILTER (WHERE t.rating IS NOT NULL), 0) as avg_rating
      FROM transfer_routes r
      LEFT JOIN transfers t ON r.id = t.route_id
      WHERE r.operator_id = $1
      GROUP BY r.id
      ORDER BY transfers_count DESC, revenue DESC
      LIMIT 10`,
      [operatorId]
    );

    const topRoutes = topRoutesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      fromLocation: row.from_location,
      toLocation: row.to_location,
      transfersCount: parseInt(row.transfers_count),
      revenue: parseFloat(row.revenue),
      avgRating: parseFloat(row.avg_rating)
    }));

    // Top drivers
    const topDriversResult = await query(
      `SELECT 
        d.id,
        d.first_name || ' ' || d.last_name as name,
        d.rating,
        d.completed_trips,
        COALESCE(AVG(tr.driver_rating), 0) as avg_driver_rating,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as transfers_count
      FROM drivers d
      LEFT JOIN transfers t ON d.id = t.driver_id
      LEFT JOIN transfer_reviews tr ON d.id = tr.driver_id
      WHERE d.operator_id = $1
      GROUP BY d.id
      ORDER BY d.rating DESC, transfers_count DESC
      LIMIT 10`,
      [operatorId]
    );

    const topDrivers = topDriversResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      rating: parseFloat(row.rating),
      completedTrips: row.completed_trips,
      avgDriverRating: parseFloat(row.avg_driver_rating),
      transfersCount: parseInt(row.transfers_count || 0)
    }));

    // Recent transfers
    const recentResult = await query(
      `SELECT 
        t.id,
        t.booking_reference,
        t.client_name,
        t.pickup_location,
        t.dropoff_location,
        t.pickup_datetime,
        t.status,
        t.price,
        d.first_name || ' ' || d.last_name as driver_name
      FROM transfers t
      LEFT JOIN drivers d ON t.driver_id = d.id
      WHERE t.operator_id = $1
      ORDER BY t.created_at DESC
      LIMIT 10`,
      [operatorId]
    );

    const recentTransfers = recentResult.rows.map(row => ({
      id: row.id,
      bookingReference: row.booking_reference,
      clientName: row.client_name,
      pickupLocation: row.pickup_location,
      dropoffLocation: row.dropoff_location,
      pickupDatetime: row.pickup_datetime,
      status: row.status,
      price: parseFloat(row.price),
      driverName: row.driver_name
    }));

    // Vehicle utilization
    const utilizationResult = await query(
      `SELECT 
        v.id,
        v.name,
        v.license_plate,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_trips,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('pending', 'assigned', 'confirmed', 'in_progress')) as active_trips,
        COALESCE(SUM(t.price) FILTER (WHERE t.payment_status = 'paid'), 0) as revenue
      FROM vehicles v
      LEFT JOIN transfers t ON v.id = t.vehicle_id
      WHERE v.operator_id = $1 AND v.status = 'active'
      GROUP BY v.id
      ORDER BY completed_trips DESC`,
      [operatorId]
    );

    const vehicleUtilization = utilizationResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      licensePlate: row.license_plate,
      completedTrips: parseInt(row.completed_trips || 0),
      activeTrips: parseInt(row.active_trips || 0),
      revenue: parseFloat(row.revenue)
    }));

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          activeVehicles: parseInt(overview.active_vehicles || 0),
          activeDrivers: parseInt(overview.active_drivers || 0),
          totalTransfers: parseInt(overview.total_transfers || 0),
          completedTransfers: parseInt(overview.completed_transfers || 0),
          pendingTransfers: parseInt(overview.pending_transfers || 0),
          activeTransfers: parseInt(overview.active_transfers || 0),
          totalRevenue: parseFloat(overview.total_revenue || 0),
          revenue30d: parseFloat(overview.revenue_30d || 0),
          avgRating: parseFloat(overview.avg_rating || 0)
        },
        dailyTrends,
        topRoutes,
        topDrivers,
        recentTransfers,
        vehicleUtilization
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении аналитики'
    } as ApiResponse<null>, { status: 500 });
  }
}
