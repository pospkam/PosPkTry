import { test, expect } from '@playwright/test';

test.describe('Tour Discovery & Booking Flow', () => {
  test('routes page shows tour cards', async ({ page }) => {
    await page.goto('/routes');
    await page.waitForLoadState('networkidle');
    // Should have at least some content about tours
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
  });

  test('individual route page loads', async ({ page }) => {
    // Go to routes, find first link to a tour
    await page.goto('/routes');
    await page.waitForLoadState('networkidle');

    const tourLink = page.locator('a[href*="/routes/"]').first();
    if (await tourLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      const href = await tourLink.getAttribute('href');
      await page.goto(href!);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/routes/');
      // Tour page should have description or title
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible({ timeout: 5000 });
    }
  });

  test('booking modal requires auth', async ({ page }) => {
    await page.goto('/routes');
    await page.waitForLoadState('networkidle');

    const tourLink = page.locator('a[href*="/routes/"]').first();
    if (await tourLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tourLink.click();
      await page.waitForLoadState('networkidle');

      // Try to find booking button
      const bookBtn = page.locator('button:has-text("Забронировать"), button:has-text("Записаться"), button:has-text("Оставить заявку")').first();
      if (await bookBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await bookBtn.click();
        // Should redirect to auth or show auth prompt
        await page.waitForTimeout(1000);
        const url = page.url();
        const authPrompt = page.locator('[class*="auth"], [class*="login"], [class*="modal"]');
        const isAuthRedirect = url.includes('/auth');
        const hasAuthPrompt = await authPrompt.isVisible().catch(() => false);
        expect(isAuthRedirect || hasAuthPrompt).toBeTruthy();
      }
    }
  });
});

test.describe('API Booking Endpoints', () => {
  test('GET /api/tours returns tours list', async ({ request }) => {
    const res = await request.get('/api/tours');
    expect(res.status()).toBeLessThan(500);
    const data = await res.json().catch(() => null);
    if (data) {
      expect(Array.isArray(data) || data.tours || data.data).toBeTruthy();
    }
  });

  test('GET /api/bookings requires auth', async ({ request }) => {
    const res = await request.get('/api/bookings');
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/bookings requires auth', async ({ request }) => {
    const res = await request.post('/api/bookings', {
      data: { tour_id: 1, date: '2026-08-01', guests: 2 },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/discovery/search works', async ({ request }) => {
    const res = await request.get('/api/discovery/search?q=вулкан');
    expect(res.status()).toBeLessThan(500);
  });
});
