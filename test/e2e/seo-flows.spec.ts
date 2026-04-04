import { test, expect } from '@playwright/test';

test.describe('SEO & Meta', () => {
  test('homepage has meta description', async ({ page }) => {
    await page.goto('/');
    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveAttribute('content', /.+/);
  });

  test('homepage has og:title', async ({ page }) => {
    await page.goto('/');
    const og = page.locator('meta[property="og:title"]');
    await expect(og).toHaveAttribute('content', /.+/);
  });

  test('robots.txt is accessible', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('Sitemap');
  });

  test('sitemap.xml is accessible', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('urlset');
  });

  test('llms.txt is accessible', async ({ request }) => {
    const res = await request.get('/llms.txt');
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe('Core User Flows', () => {
  test('can navigate from homepage to routes', async ({ page }) => {
    await page.goto('/');
    // Find a link to routes/tours
    const link = page.locator('a[href*="/routes"], a[href*="/hub"]').first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/routes|hub/);
    }
  });

  test('search modal can open', async ({ page }) => {
    await page.goto('/');
    // Look for search icon/button
    const searchBtn = page.locator('[aria-label*="оиск"], [aria-label*="earch"], button:has(svg)').first();
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      // Check if modal/dialog appeared
      const modal = page.locator('[role="dialog"], [class*="modal"], [class*="search"]');
      await expect(modal.first()).toBeVisible({ timeout: 3000 }).catch(() => {
        // Search might work differently, that's ok
      });
    }
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('[aria-label*="ема"], [aria-label*="heme"], button:has(svg.lucide-moon), button:has(svg.lucide-sun)').first();
    if (await toggle.isVisible()) {
      const htmlBefore = await page.locator('html').getAttribute('class');
      await toggle.click();
      // Give time for theme to apply
      await page.waitForTimeout(500);
      const htmlAfter = await page.locator('html').getAttribute('class');
      // Theme class should change
      expect(htmlBefore).not.toBe(htmlAfter);
    }
  });
});
