import { describe, it, expect, beforeEach } from 'vitest';
import { resetFetchMock, mockApiSuccess, mockApiError } from '../setup';

describe('Souvenirs API Tests', () => {
  beforeEach(() => {
    resetFetchMock();
  });

  describe('GET /api/souvenirs - Каталог сувениров', () => {
    it('должен вернуть список доступных сувениров', async () => {
      const mockSouvenirs = [
        {
          id: '1',
          name: 'Магнит "Вулкан"',
          category: 'magnets',
          price: 250,
          stock_quantity: 100,
          available_quantity: 95,
        },
        {
          id: '2',
          name: 'Керамическая чашка',
          category: 'ceramics',
          price: 800,
          stock_quantity: 50,
          available_quantity: 45,
        },
      ];

      mockApiSuccess(mockSouvenirs);

      const response = await fetch('/api/souvenirs');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].category).toBe('magnets');
    });

    it('должен фильтровать по категории', async () => {
      mockApiSuccess([
        { name: 'Магнит 1', category: 'magnets' },
        { name: 'Магнит 2', category: 'magnets' },
      ]);

      const response = await fetch('/api/souvenirs?category=magnets');
      const data = await response.json();

      expect(data.data.every((item: any) => item.category === 'magnets')).toBe(true);
    });

    it('должен фильтровать по цене', async () => {
      mockApiSuccess([{ price: 500 }]);

      const response = await fetch('/api/souvenirs?minPrice=400&maxPrice=600');
      const data = await response.json();

      expect(data.data[0].price).toBeGreaterThanOrEqual(400);
      expect(data.data[0].price).toBeLessThanOrEqual(600);
    });

    it('должен показывать только товары в наличии', async () => {
      mockApiSuccess([
        { available_quantity: 10 },
        { available_quantity: 5 },
      ]);

      const response = await fetch('/api/souvenirs?inStock=true');
      const data = await response.json();

      expect(data.data.every((item: any) => item.available_quantity > 0)).toBe(true);
    });
  });

  describe('POST /api/souvenirs/orders - Создание заказа', () => {
    it('должен успешно создать заказ', async () => {
      const order = {
        items: [
          { souvenir_id: '1', quantity: 2, unit_price: 250 },
          { souvenir_id: '2', quantity: 1, unit_price: 800 },
        ],
        shipping_address: 'ул. Ленина, 123',
        payment_method: 'card',
      };

      mockApiSuccess({
        ...order,
        order_number: 'SO-2024-001',
        total_amount: 1300,
      });

      const response = await fetch('/api/souvenirs/orders', {
        method: 'POST',
        body: JSON.stringify(order),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.order_number).toMatch(/^SO-\d{4}-\d{3}$/);
      expect(data.data.total_amount).toBe(1300);
    });

    it('должен применить купон на скидку', async () => {
      const order = {
        items: [{ souvenir_id: '1', quantity: 2, unit_price: 500 }],
        coupon_code: 'SAVE10',
      };

      mockApiSuccess({
        ...order,
        total_amount: 900, // 1000 - 10%
        discount_amount: 100,
      });

      const response = await fetch('/api/souvenirs/orders', {
        method: 'POST',
        body: JSON.stringify(order),
      });

      const data = await response.json();

      expect(data.data.discount_amount).toBe(100);
      expect(data.data.total_amount).toBe(900);
    });

    it('должен проверить наличие товара на складе', async () => {
      mockApiError('Недостаточно товара на складе', 400);

      const order = {
        items: [{ souvenir_id: '1', quantity: 1000 }],
      };

      const response = await fetch('/api/souvenirs/orders', {
        method: 'POST',
        body: JSON.stringify(order),
      });

      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toContain('складе');
    });

    it('должен резервировать товар при создании заказа', async () => {
      const order = {
        items: [{ souvenir_id: '1', quantity: 5 }],
      };

      mockApiSuccess({
        ...order,
        status: 'pending',
        reserved_until: '2024-12-25T12:00:00Z',
      });

      const response = await fetch('/api/souvenirs/orders', {
        method: 'POST',
        body: JSON.stringify(order),
      });

      const data = await response.json();

      expect(data.data.status).toBe('pending');
      expect(data.data.reserved_until).toBeDefined();
    });
  });

  describe('GET /api/souvenirs/items - Управление товарами (партнер)', () => {
    it('должен вернуть товары партнера', async () => {
      mockApiSuccess([
        { id: '1', name: 'Товар 1', partner_id: 'partner-1' },
        { id: '2', name: 'Товар 2', partner_id: 'partner-1' },
      ]);

      const response = await fetch('/api/souvenirs/items', {
        headers: { Authorization: 'Bearer partner-token' },
      });

      const data = await response.json();

      expect(data.data).toHaveLength(2);
    });

    it('должен требовать аутентификацию', async () => {
      mockApiError('Unauthorized', 401);

      const response = await fetch('/api/souvenirs/items');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/souvenirs/items - Добавление товара', () => {
    it('должен добавить новый товар', async () => {
      const newItem = {
        name: 'Магнит "Медведь"',
        description: 'Красивый магнит с изображением медведя',
        category: 'magnets',
        price: 300,
        stock_quantity: 50,
        sku: 'MAG-001',
      };

      mockApiSuccess({ ...newItem, id: 'new-item-id' });

      const response = await fetch('/api/souvenirs/items', {
        method: 'POST',
        headers: { Authorization: 'Bearer partner-token' },
        body: JSON.stringify(newItem),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
    });

    it('должен валидировать уникальность SKU', async () => {
      mockApiError('SKU уже существует', 400);

      const response = await fetch('/api/souvenirs/items', {
        method: 'POST',
        headers: { Authorization: 'Bearer partner-token' },
        body: JSON.stringify({ sku: 'EXISTING-SKU' }),
      });

      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toContain('существует');
    });
  });

  describe('GET /api/souvenirs/stats - Статистика продаж', () => {
    it('должен вернуть статистику магазина', async () => {
      const mockStats = {
        total_products: 50,
        total_orders: 120,
        total_revenue: 45000,
        average_order_value: 375,
        top_products: [
          { id: '1', name: 'Магнит', sales_count: 45 },
          { id: '2', name: 'Чашка', sales_count: 30 },
        ],
        low_stock_items: [
          { id: '3', name: 'Футболка', stock: 2 },
        ],
      };

      mockApiSuccess(mockStats);

      const response = await fetch('/api/souvenirs/stats', {
        headers: { Authorization: 'Bearer partner-token' },
      });

      const data = await response.json();

      expect(data.data.total_products).toBe(50);
      expect(data.data.total_revenue).toBeGreaterThan(0);
      expect(data.data.top_products).toHaveLength(2);
    });
  });
});
