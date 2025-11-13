/**
 * Тесты для Souvenir Shop API
 */

import { describe, it, expect } from 'vitest';

describe('Souvenir Shop API', () => {
  describe('GET /api/souvenirs', () => {
    it('должен вернуть список сувениров', async () => {
      const response = await fetch('http://localhost:3000/api/souvenirs');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.souvenirs)).toBe(true);
    });

    it('должен фильтровать по категории', async () => {
      const response = await fetch('http://localhost:3000/api/souvenirs?category=traditional_art');
      const data = await response.json();

      expect(data.success).toBe(true);
      if (data.data.souvenirs.length > 0) {
        expect(data.data.souvenirs[0].category).toBe('traditional_art');
      }
    });
  });

  describe('POST /api/souvenirs', () => {
    it('должен создать новый сувенир', async () => {
      const newSouvenir = {
        name: 'Тестовый сувенир',
        description: 'Описание',
        category: 'traditional_art',
        price: 1000,
        stockQuantity: 10
      };

      const response = await fetch('http://localhost:3000/api/souvenirs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSouvenir)
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.souvenirId).toBeDefined();
    });
  });
});

