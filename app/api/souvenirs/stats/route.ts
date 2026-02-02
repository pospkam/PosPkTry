import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getSouvenirPartnerId, getSouvenirStats } from '@/lib/auth/souvenir-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/souvenirs/stats - Get comprehensive statistics for souvenir partner
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const partnerId = await getSouvenirPartnerId(userOrResponse.id);
    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Партнер не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30';

    const basicStats = await getSouvenirStats(partnerId);

    const revenueByPeriod = await query(
      `SELECT
        DATE(so.created_at) as date,
        COUNT(DISTINCT so.id) as orders_count,
        SUM(so.total_amount) as revenue,
        SUM(soi.quantity) as items_sold
       FROM souvenir_orders so
       JOIN souvenir_order_items soi ON soi.order_id = so.id
       WHERE so.partner_id = $1
         AND so.payment_status = 'paid'
         AND so.created_at >= NOW() - INTERVAL '${parseInt(period)} days'
       GROUP BY DATE(so.created_at)
       ORDER BY date DESC`,
      [partnerId]
    );

    const topProducts = await query(
      `SELECT
        s.id,
        s.name,
        s.category,
        s.price,
        s.discount_price,
        s.images,
        s.sales_count,
        s.total_revenue,
        s.rating,
        s.review_count,
        s.available_quantity
       FROM souvenirs s
       WHERE s.partner_id = $1
       ORDER BY s.total_revenue DESC
       LIMIT 10`,
      [partnerId]
    );

    const orderStatusDistribution = await query(
      `SELECT
        status,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
       FROM souvenir_orders
       WHERE partner_id = $1
       GROUP BY status`,
      [partnerId]
    );

    const categoryPerformance = await query(
      `SELECT
        s.category,
        COUNT(DISTINCT s.id) as product_count,
        SUM(s.sales_count) as total_sales,
        SUM(s.total_revenue) as total_revenue,
        AVG(s.rating) as avg_rating,
        SUM(s.stock_quantity) as total_stock
       FROM souvenirs s
       WHERE s.partner_id = $1
       GROUP BY s.category
       ORDER BY total_revenue DESC`,
      [partnerId]
    );

    const lowStockProducts = await query(
      `SELECT
        id, name, category, price, stock_quantity, reserved_quantity,
        available_quantity, low_stock_threshold, is_active
       FROM souvenirs
       WHERE partner_id = $1
         AND is_active = TRUE
         AND available_quantity > 0
         AND available_quantity <= low_stock_threshold
       ORDER BY available_quantity ASC
       LIMIT 20`,
      [partnerId]
    );

    const outOfStockProducts = await query(
      `SELECT
        id, name, category, price, last_sold_at, sales_count
       FROM souvenirs
       WHERE partner_id = $1
         AND is_active = TRUE
         AND available_quantity = 0
       ORDER BY last_sold_at DESC NULLS LAST
       LIMIT 20`,
      [partnerId]
    );

    const recentOrders = await query(
      `SELECT
        so.id,
        so.order_number,
        so.customer_name,
        so.customer_email,
        so.total_amount,
        so.status,
        so.payment_status,
        so.created_at,
        so.shipping_method,
        json_agg(json_build_object(
          'name', soi.product_name,
          'quantity', soi.quantity,
          'price', soi.unit_price
        )) as items
       FROM souvenir_orders so
       JOIN souvenir_order_items soi ON soi.order_id = so.id
       WHERE so.partner_id = $1
       GROUP BY so.id
       ORDER BY so.created_at DESC
       LIMIT 10`,
      [partnerId]
    );

    const recentReviews = await query(
      `SELECT
        sr.id,
        sr.rating,
        sr.title,
        sr.comment,
        sr.created_at,
        s.name as product_name,
        sr.customer_name
       FROM souvenir_reviews sr
       JOIN souvenirs s ON sr.souvenir_id = s.id
       WHERE s.partner_id = $1
         AND sr.is_published = TRUE
       ORDER BY sr.created_at DESC
       LIMIT 10`,
      [partnerId]
    );

    const inventoryActivity = await query(
      `SELECT
        si.transaction_type,
        COUNT(*) as transaction_count,
        SUM(si.quantity_change) as total_quantity_change
       FROM souvenir_inventory si
       JOIN souvenirs s ON si.souvenir_id = s.id
       WHERE s.partner_id = $1
         AND si.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY si.transaction_type
       ORDER BY transaction_count DESC`,
      [partnerId]
    );

    const popularTags = await query(
      `SELECT
        unnest(tags) as tag,
        COUNT(*) as product_count,
        SUM(sales_count) as total_sales
       FROM souvenirs
       WHERE partner_id = $1
         AND is_active = TRUE
       GROUP BY tag
       ORDER BY total_sales DESC
       LIMIT 20`,
      [partnerId]
    );

    return NextResponse.json({
      success: true,
      data: {
        overview: basicStats,
        revenueByPeriod: revenueByPeriod.rows,
        topProducts: topProducts.rows,
        orderStatusDistribution: orderStatusDistribution.rows,
        categoryPerformance: categoryPerformance.rows,
        lowStockProducts: lowStockProducts.rows,
        outOfStockProducts: outOfStockProducts.rows,
        recentOrders: recentOrders.rows,
        recentReviews: recentReviews.rows,
        inventoryActivity: inventoryActivity.rows,
        popularTags: popularTags.rows
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching souvenir stats:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении статистики' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
