/**
 * Souvenir System Helper Functions
 * Provides utilities for souvenir partner operations with validation
 */

import { query } from '@/lib/database';

/**
 * Get partner ID for souvenir category
 */
export async function getSouvenirPartnerId(userId: string): Promise<string | null> {
  try {
    const result = await query(
      `SELECT id FROM partners WHERE user_id = $1 AND category = 'souvenir' LIMIT 1`,
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    console.error('Error getting souvenir partner ID:', error);
    return null;
  }
}

/**
 * Ensure souvenir partner exists
 */
export async function ensureSouvenirPartnerExists(userId: string): Promise<string> {
  let partnerId = await getSouvenirPartnerId(userId);
  
  if (!partnerId) {
    const result = await query(
      `INSERT INTO partners (user_id, category, is_active) VALUES ($1, 'souvenir', TRUE) RETURNING id`,
      [userId]
    );
    partnerId = result.rows[0].id;
  }
  
  return partnerId;
}

/**
 * Verify souvenir ownership
 */
export async function verifySouvenirOwnership(userId: string, souvenirId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT s.id 
       FROM souvenirs s
       JOIN partners p ON s.partner_id = p.id
       WHERE p.user_id = $1 AND s.id = $2`,
      [userId, souvenirId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying souvenir ownership:', error);
    return false;
  }
}

/**
 * Verify order ownership
 */
export async function verifySouvenirOrderOwnership(userId: string, orderId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT so.id 
       FROM souvenir_orders so
       JOIN partners p ON so.partner_id = p.id
       WHERE p.user_id = $1 AND so.id = $2`,
      [userId, orderId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying order ownership:', error);
    return false;
  }
}

/**
 * Check stock availability
 */
export async function checkSouvenirStock(souvenirId: string, quantity: number): Promise<{
  available: boolean;
  currentStock: number;
  availableQuantity: number;
}> {
  try {
    const result = await query(
      `SELECT stock_quantity, reserved_quantity, available_quantity, is_active
       FROM souvenirs
       WHERE id = $1`,
      [souvenirId]
    );

    if (result.rows.length === 0) {
      return { available: false, currentStock: 0, availableQuantity: 0 };
    }

    const item = result.rows[0];
    
    return {
      available: item.is_active && item.available_quantity >= quantity,
      currentStock: item.stock_quantity,
      availableQuantity: item.available_quantity
    };
  } catch (error) {
    console.error('Error checking souvenir stock:', error);
    return { available: false, currentStock: 0, availableQuantity: 0 };
  }
}

/**
 * Calculate order total
 */
export async function calculateOrderTotal(items: Array<{
  souvenirId: string;
  quantity: number;
}>): Promise<{
  subtotal: number;
  items: Array<{ id: string; name: string; price: number; quantity: number; total: number }>;
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const orderItems: Array<{ id: string; name: string; price: number; quantity: number; total: number }> = [];
  let subtotal = 0;

  for (const item of items) {
    try {
      const result = await query(
        `SELECT id, name, price, discount_price, is_active, available_quantity
         FROM souvenirs
         WHERE id = $1`,
        [item.souvenirId]
      );

      if (result.rows.length === 0) {
        errors.push(`Товар ${item.souvenirId} не найден`);
        continue;
      }

      const souvenir = result.rows[0];

      if (!souvenir.is_active) {
        errors.push(`Товар "${souvenir.name}" недоступен`);
        continue;
      }

      if (souvenir.available_quantity < item.quantity) {
        errors.push(`Товар "${souvenir.name}" доступен только в количестве ${souvenir.available_quantity}`);
        continue;
      }

      const price = souvenir.discount_price || souvenir.price;
      const itemTotal = price * item.quantity;

      orderItems.push({
        id: souvenir.id,
        name: souvenir.name,
        price,
        quantity: item.quantity,
        total: itemTotal
      });

      subtotal += itemTotal;
    } catch (error) {
      console.error('Error processing item:', error);
      errors.push(`Ошибка обработки товара ${item.souvenirId}`);
    }
  }

  return {
    subtotal,
    items: orderItems,
    valid: errors.length === 0 && orderItems.length > 0,
    errors
  };
}

/**
 * Apply coupon discount
 */
export async function applyCouponDiscount(
  couponCode: string,
  subtotal: number,
  items: Array<{ id: string; quantity: number }>
): Promise<{
  valid: boolean;
  discountAmount: number;
  error?: string;
}> {
  try {
    const result = await query(
      `SELECT 
        id, discount_type, discount_value, min_purchase, max_discount,
        valid_from, valid_to, usage_limit, used_count,
        applicable_categories, applicable_products, excluded_products,
        is_active
       FROM souvenir_coupons
       WHERE code = $1`,
      [couponCode]
    );

    if (result.rows.length === 0) {
      return { valid: false, discountAmount: 0, error: 'Купон не найден' };
    }

    const coupon = result.rows[0];
    const now = new Date();

    if (!coupon.is_active) {
      return { valid: false, discountAmount: 0, error: 'Купон неактивен' };
    }

    if (new Date(coupon.valid_from) > now) {
      return { valid: false, discountAmount: 0, error: 'Купон еще не действует' };
    }

    if (new Date(coupon.valid_to) < now) {
      return { valid: false, discountAmount: 0, error: 'Срок действия купона истек' };
    }

    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return { valid: false, discountAmount: 0, error: 'Лимит использования купона исчерпан' };
    }

    if (coupon.min_purchase && subtotal < coupon.min_purchase) {
      return { valid: false, discountAmount: 0, error: `Минимальная сумма покупки: ${coupon.min_purchase} руб.` };
    }

    let discountAmount = 0;

    if (coupon.discount_type === 'percentage') {
      discountAmount = (subtotal * coupon.discount_value) / 100;
    } else if (coupon.discount_type === 'fixed') {
      discountAmount = coupon.discount_value;
    }

    if (coupon.max_discount && discountAmount > coupon.max_discount) {
      discountAmount = coupon.max_discount;
    }

    discountAmount = Math.min(discountAmount, subtotal);

    return { valid: true, discountAmount };
  } catch (error) {
    console.error('Error applying coupon:', error);
    return { valid: false, discountAmount: 0, error: 'Ошибка применения купона' };
  }
}

/**
 * Find available souvenirs with filters
 */
export async function findAvailableSouvenirs(filters: {
  category?: string;
  subcategory?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  isHandmade?: boolean;
  isFeatured?: boolean;
  inStock?: boolean;
  partnerId?: string;
  searchQuery?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  try {
    let queryText = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.short_description,
        s.category,
        s.subcategory,
        s.price,
        s.discount_price,
        s.images,
        s.tags,
        s.is_handmade,
        s.is_exclusive,
        s.is_featured,
        s.available_quantity,
        s.rating,
        s.review_count,
        s.sales_count,
        s.artisan_name,
        p.company_name as partner_name
      FROM souvenirs s
      JOIN partners p ON s.partner_id = p.id
      WHERE s.is_active = TRUE
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters.partnerId) {
      queryText += ` AND s.partner_id = $${paramIndex}`;
      params.push(filters.partnerId);
      paramIndex++;
    }

    if (filters.category) {
      queryText += ` AND s.category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    if (filters.subcategory) {
      queryText += ` AND s.subcategory = $${paramIndex}`;
      params.push(filters.subcategory);
      paramIndex++;
    }

    if (filters.tags && filters.tags.length > 0) {
      queryText += ` AND s.tags && $${paramIndex}::text[]`;
      params.push(filters.tags);
      paramIndex++;
    }

    if (filters.minPrice !== undefined) {
      queryText += ` AND s.price >= $${paramIndex}`;
      params.push(filters.minPrice);
      paramIndex++;
    }

    if (filters.maxPrice !== undefined) {
      queryText += ` AND s.price <= $${paramIndex}`;
      params.push(filters.maxPrice);
      paramIndex++;
    }

    if (filters.isHandmade !== undefined) {
      queryText += ` AND s.is_handmade = $${paramIndex}`;
      params.push(filters.isHandmade);
      paramIndex++;
    }

    if (filters.isFeatured !== undefined) {
      queryText += ` AND s.is_featured = $${paramIndex}`;
      params.push(filters.isFeatured);
      paramIndex++;
    }

    if (filters.inStock) {
      queryText += ` AND s.available_quantity > 0`;
    }

    if (filters.searchQuery) {
      queryText += ` AND (
        s.name ILIKE $${paramIndex} OR 
        s.description ILIKE $${paramIndex} OR
        s.artisan_name ILIKE $${paramIndex}
      )`;
      params.push(`%${filters.searchQuery}%`);
      paramIndex++;
    }

    // Sorting
    switch (filters.sortBy) {
      case 'price_asc':
        queryText += ' ORDER BY s.price ASC';
        break;
      case 'price_desc':
        queryText += ' ORDER BY s.price DESC';
        break;
      case 'rating':
        queryText += ' ORDER BY s.rating DESC, s.review_count DESC';
        break;
      case 'newest':
        queryText += ' ORDER BY s.created_at DESC';
        break;
      case 'popular':
        queryText += ' ORDER BY s.sales_count DESC, s.rating DESC';
        break;
      default:
        queryText += ' ORDER BY s.is_featured DESC, s.rating DESC, s.created_at DESC';
    }

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);
    return result.rows;
  } catch (error) {
    console.error('Error finding available souvenirs:', error);
    return [];
  }
}

/**
 * Get souvenir partner statistics
 */
export async function getSouvenirStats(partnerId: string): Promise<any> {
  try {
    const result = await query(
      `SELECT
        COUNT(DISTINCT s.id) as total_products,
        SUM(CASE WHEN s.is_active THEN 1 ELSE 0 END) as active_products,
        SUM(CASE WHEN s.available_quantity > 0 THEN 1 ELSE 0 END) as in_stock_products,
        SUM(CASE WHEN s.available_quantity <= s.low_stock_threshold AND s.available_quantity > 0 THEN 1 ELSE 0 END) as low_stock_products,
        AVG(s.rating) as avg_rating,
        SUM(s.review_count) as total_reviews,
        SUM(s.sales_count) as total_sales,
        SUM(s.stock_quantity) as total_stock,
        SUM(s.reserved_quantity) as total_reserved,
        
        COUNT(DISTINCT so.id) as total_orders,
        SUM(CASE WHEN so.status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN so.status = 'processing' THEN 1 ELSE 0 END) as processing_orders,
        SUM(CASE WHEN so.status = 'shipped' THEN 1 ELSE 0 END) as shipped_orders,
        SUM(CASE WHEN so.status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
        
        COALESCE(SUM(CASE WHEN so.payment_status = 'paid' THEN so.total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN so.payment_status = 'paid' AND so.created_at >= NOW() - INTERVAL '30 days' THEN so.total_amount ELSE 0 END), 0) as revenue_last_30_days,
        COALESCE(SUM(CASE WHEN so.payment_status = 'paid' AND so.created_at >= NOW() - INTERVAL '7 days' THEN so.total_amount ELSE 0 END), 0) as revenue_last_7_days
        
       FROM souvenirs s
       LEFT JOIN souvenir_orders so ON so.partner_id = s.partner_id
       WHERE s.partner_id = $1`,
      [partnerId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error getting souvenir stats:', error);
    throw error;
  }
}

/**
 * Update stock quantity
 */
export async function updateSouvenirStock(
  souvenirId: string,
  quantityChange: number,
  transactionType: string,
  notes?: string
): Promise<void> {
  try {
    await query('BEGIN');

    const currentResult = await query(
      `SELECT stock_quantity FROM souvenirs WHERE id = $1`,
      [souvenirId]
    );

    if (currentResult.rows.length === 0) {
      throw new Error('Souvenir not found');
    }

    const newQuantity = Math.max(0, currentResult.rows[0].stock_quantity + quantityChange);

    await query(
      `UPDATE souvenirs SET stock_quantity = $1 WHERE id = $2`,
      [newQuantity, souvenirId]
    );

    await query(
      `INSERT INTO souvenir_inventory (souvenir_id, transaction_type, quantity_change, quantity_after, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [souvenirId, transactionType, quantityChange, newQuantity, notes || null]
    );

    await query('COMMIT');
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error updating souvenir stock:', error);
    throw error;
  }
}

/**
 * Validate order data
 */
export function validateOrderData(data: {
  items: Array<{ souvenirId: string; quantity: number }>;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.items || data.items.length === 0) {
    errors.push('Корзина пуста');
  }

  if (!data.customerName || data.customerName.length < 2) {
    errors.push('Укажите полное имя');
  }

  if (!data.customerEmail || !data.customerEmail.includes('@')) {
    errors.push('Укажите корректный email');
  }

  if (!data.customerPhone || data.customerPhone.length < 10) {
    errors.push('Укажите корректный номер телефона');
  }

  if (!data.shippingAddress || data.shippingAddress.length < 5) {
    errors.push('Укажите адрес доставки');
  }

  if (!data.shippingCity || data.shippingCity.length < 2) {
    errors.push('Укажите город');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
