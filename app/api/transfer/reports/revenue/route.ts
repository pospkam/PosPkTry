import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getTransferPartnerId } from '@/lib/auth/transfer-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/reports/revenue
 * Get revenue reports
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

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = searchParams.get('dateTo') || new Date().toISOString().split('T')[0];

    // Revenue by date
    const timelineResult = await query(
      `SELECT 
        DATE(t.completed_at) as date,
        COUNT(*) as transfers_count,
        SUM(t.price) as total_revenue,
        SUM(t.price) FILTER (WHERE t.payment_status = 'paid') as paid_revenue,
        SUM(t.price) FILTER (WHERE t.payment_status = 'pending') as pending_revenue
      FROM transfers t
      WHERE t.operator_id = $1 
      AND t.completed_at IS NOT NULL
      AND DATE(t.completed_at) >= $2
      AND DATE(t.completed_at) <= $3
      GROUP BY DATE(t.completed_at)
      ORDER BY date ASC`,
      [operatorId, dateFrom, dateTo]
    );

    const timeline = timelineResult.rows.map(row => ({
      date: row.date,
      transfersCount: parseInt(row.transfers_count),
      totalRevenue: parseFloat(row.total_revenue || 0),
      paidRevenue: parseFloat(row.paid_revenue || 0),
      pendingRevenue: parseFloat(row.pending_revenue || 0)
    }));

    // Revenue by route
    const byRouteResult = await query(
      `SELECT 
        r.id,
        r.name,
        r.from_location,
        r.to_location,
        COUNT(t.id) as transfers_count,
        SUM(t.price) as total_revenue,
        SUM(t.price) FILTER (WHERE t.payment_status = 'paid') as paid_revenue,
        AVG(t.price) as avg_price
      FROM transfers t
      LEFT JOIN transfer_routes r ON t.route_id = r.id
      WHERE t.operator_id = $1
      AND DATE(t.created_at) >= $2
      AND DATE(t.created_at) <= $3
      GROUP BY r.id, r.name, r.from_location, r.to_location
      ORDER BY total_revenue DESC`,
      [operatorId, dateFrom, dateTo]
    );

    const byRoute = byRouteResult.rows.map(row => ({
      routeId: row.id,
      routeName: row.name || 'Без маршрута',
      fromLocation: row.from_location,
      toLocation: row.to_location,
      transfersCount: parseInt(row.transfers_count),
      totalRevenue: parseFloat(row.total_revenue || 0),
      paidRevenue: parseFloat(row.paid_revenue || 0),
      avgPrice: parseFloat(row.avg_price || 0)
    }));

    // Revenue by driver
    const byDriverResult = await query(
      `SELECT 
        d.id,
        d.first_name || ' ' || d.last_name as name,
        COUNT(t.id) as transfers_count,
        SUM(t.price) as total_revenue,
        SUM(t.price) FILTER (WHERE t.payment_status = 'paid') as paid_revenue
      FROM transfers t
      JOIN drivers d ON t.driver_id = d.id
      WHERE t.operator_id = $1
      AND DATE(t.created_at) >= $2
      AND DATE(t.created_at) <= $3
      GROUP BY d.id, d.first_name, d.last_name
      ORDER BY total_revenue DESC`,
      [operatorId, dateFrom, dateTo]
    );

    const byDriver = byDriverResult.rows.map(row => ({
      driverId: row.id,
      driverName: row.name,
      transfersCount: parseInt(row.transfers_count),
      totalRevenue: parseFloat(row.total_revenue || 0),
      paidRevenue: parseFloat(row.paid_revenue || 0)
    }));

    // Revenue by vehicle
    const byVehicleResult = await query(
      `SELECT 
        v.id,
        v.name,
        v.license_plate,
        COUNT(t.id) as transfers_count,
        SUM(t.price) as total_revenue,
        SUM(t.price) FILTER (WHERE t.payment_status = 'paid') as paid_revenue
      FROM transfers t
      JOIN vehicles v ON t.vehicle_id = v.id
      WHERE t.operator_id = $1
      AND DATE(t.created_at) >= $2
      AND DATE(t.created_at) <= $3
      GROUP BY v.id, v.name, v.license_plate
      ORDER BY total_revenue DESC`,
      [operatorId, dateFrom, dateTo]
    );

    const byVehicle = byVehicleResult.rows.map(row => ({
      vehicleId: row.id,
      vehicleName: row.name,
      licensePlate: row.license_plate,
      transfersCount: parseInt(row.transfers_count),
      totalRevenue: parseFloat(row.total_revenue || 0),
      paidRevenue: parseFloat(row.paid_revenue || 0)
    }));

    // Payment status distribution
    const paymentStatsResult = await query(
      `SELECT 
        payment_status,
        COUNT(*) as count,
        SUM(price) as total
      FROM transfers
      WHERE operator_id = $1
      AND DATE(created_at) >= $2
      AND DATE(created_at) <= $3
      GROUP BY payment_status`,
      [operatorId, dateFrom, dateTo]
    );

    const paymentDistribution = paymentStatsResult.rows.map(row => ({
      status: row.payment_status,
      count: parseInt(row.count),
      total: parseFloat(row.total || 0)
    }));

    // Summary
    const summaryResult = await query(
      `SELECT 
        COUNT(*) as total_transfers,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_transfers,
        SUM(price) as total_revenue,
        SUM(price) FILTER (WHERE payment_status = 'paid') as paid_revenue,
        SUM(price) FILTER (WHERE payment_status = 'pending') as pending_revenue,
        AVG(price) as avg_transfer_price
      FROM transfers
      WHERE operator_id = $1
      AND DATE(created_at) >= $2
      AND DATE(created_at) <= $3`,
      [operatorId, dateFrom, dateTo]
    );

    const summary = summaryResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        period: { from: dateFrom, to: dateTo },
        summary: {
          totalTransfers: parseInt(summary.total_transfers || 0),
          completedTransfers: parseInt(summary.completed_transfers || 0),
          totalRevenue: parseFloat(summary.total_revenue || 0),
          paidRevenue: parseFloat(summary.paid_revenue || 0),
          pendingRevenue: parseFloat(summary.pending_revenue || 0),
          avgTransferPrice: parseFloat(summary.avg_transfer_price || 0)
        },
        timeline,
        byRoute,
        byDriver,
        byVehicle,
        paymentDistribution
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Revenue report error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при формировании отчёта'
    } as ApiResponse<null>, { status: 500 });
  }
}
