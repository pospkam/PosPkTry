import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register new user', async ({ page }) => {
    await page.goto('/');
    
    // Click registration button
    await page.click('text=Регистрация');
    
    // Fill form
    await page.fill('input[name="email"]', `test-${Date.now()}@test.com`);
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify redirect
    await expect(page).toHaveURL('/dashboard');
  });

  test('should login existing user', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[name="email"]', 'test@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify redirect
    await expect(page).toHaveURL('/');
  });
});
