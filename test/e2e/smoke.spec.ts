import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads and has title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/TourHab|Камчатка/i);
  });

  test('homepage has hero section', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('section').first();
    await expect(hero).toBeVisible();
  });

  test('homepage has navigation', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('header, nav').first();
    await expect(nav).toBeVisible();
  });

  test('routes page loads', async ({ page }) => {
    await page.goto('/routes');
    await expect(page.locator('body')).toContainText(/маршрут|тур|route/i);
  });

  test('map page loads', async ({ page }) => {
    await page.goto('/map');
    await expect(page).toHaveURL(/map/);
  });

  test('auth page loads', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('body')).toContainText(/вход|регистрация|войти/i);
  });

  test('safety page loads', async ({ page }) => {
    await page.goto('/safety');
    await expect(page.locator('body')).toContainText(/безопасность|SOS|safety/i);
  });
});

test.describe('API Smoke Tests', () => {
  test('GET /api/routes returns JSON', async ({ request }) => {
    const res = await request.get('/api/routes');
    expect(res.status()).toBeLessThan(500);
    expect(res.headers()['content-type']).toContain('application/json');
  });

  test('GET /api/public/stats returns data', async ({ request }) => {
    const res = await request.get('/api/public/stats');
    expect(res.status()).toBeLessThan(500);
  });

  test('GET /api/weather returns data', async ({ request }) => {
    const res = await request.get('/api/weather');
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/leads accepts lead', async ({ request }) => {
    const res = await request.post('/api/leads', {
      data: {
        name: 'E2E Test',
        phone: '+79001234567',
        source: 'e2e-test',
      },
    });
    // Should not be 500 (may be 400 if validation fails, that's ok)
    expect(res.status()).toBeLessThan(500);
  });

  test('protected API returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/admin/operators');
    expect(res.status()).toBe(401);
  });
});
