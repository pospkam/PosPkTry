/**
 * E2E тесты для аутентификации
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register new user', async ({ page }) => {
    await page.goto('/');
    
    // Открываем форму регистрации
    await page.click('text=Регистрация');
    
    // Заполняем форму
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.fill('input[name="name"]', 'Test User');
    
    // Отправляем форму
    await page.click('button:has-text("Зарегистрироваться")');
    
    // Проверяем успешную регистрацию
    await expect(page).toHaveURL(/\/hub\/tourist/);
    await expect(page.locator('text=Test User')).toBeVisible();
  });

  test('should login existing user', async ({ page }) => {
    await page.goto('/');
    
    // Используем demo аккаунт
    await page.click('text=Demo');
    await page.click('text=Турист');
    
    // Проверяем успешный вход
    await expect(page).toHaveURL(/\/hub\/tourist/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    await page.click('text=Вход');
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button:has-text("Войти")');
    
    // Проверяем ошибку
    await expect(page.locator('text=Неверный')).toBeVisible();
  });

  test('should logout user', async ({ page }) => {
    // Входим через demo
    await page.goto('/');
    await page.click('text=Demo');
    await page.click('text=Турист');
    
    // Выходим
    await page.click('[aria-label="User menu"]');
    await page.click('text=Выйти');
    
    // Проверяем редирект
    await expect(page).toHaveURL('/');
  });
});

 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register new user', async ({ page }) => {
    await page.goto('/');
    
    // Открываем форму регистрации
    await page.click('text=Регистрация');
    
    // Заполняем форму
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.fill('input[name="name"]', 'Test User');
    
    // Отправляем форму
    await page.click('button:has-text("Зарегистрироваться")');
    
    // Проверяем успешную регистрацию
    await expect(page).toHaveURL(/\/hub\/tourist/);
    await expect(page.locator('text=Test User')).toBeVisible();
  });

  test('should login existing user', async ({ page }) => {
    await page.goto('/');
    
    // Используем demo аккаунт
    await page.click('text=Demo');
    await page.click('text=Турист');
    
    // Проверяем успешный вход
    await expect(page).toHaveURL(/\/hub\/tourist/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    await page.click('text=Вход');
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button:has-text("Войти")');
    
    // Проверяем ошибку
    await expect(page.locator('text=Неверный')).toBeVisible();
  });

  test('should logout user', async ({ page }) => {
    // Входим через demo
    await page.goto('/');
    await page.click('text=Demo');
    await page.click('text=Турист');
    
    // Выходим
    await page.click('[aria-label="User menu"]');
    await page.click('text=Выйти');
    
    // Проверяем редирект
    await expect(page).toHaveURL('/');
  });
});

test.describe('Authentication Flow', () => {
  test('should register new user', async ({ page }) => {
    await page.goto('/');
    
    // Открываем форму регистрации
    await page.click('text=Регистрация');
    
    // Заполняем форму
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.fill('input[name="name"]', 'Test User');
    
    // Отправляем форму
    await page.click('button:has-text("Зарегистрироваться")');
    
    // Проверяем успешную регистрацию
    await expect(page).toHaveURL(/\/hub\/tourist/);
    await expect(page.locator('text=Test User')).toBeVisible();
  });

  test('should login existing user', async ({ page }) => {
    await page.goto('/');
    
    // Используем demo аккаунт
    await page.click('text=Demo');
    await page.click('text=Турист');
    
    // Проверяем успешный вход
    await expect(page).toHaveURL(/\/hub\/tourist/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    await page.click('text=Вход');
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button:has-text("Войти")');
    
    // Проверяем ошибку
    await expect(page.locator('text=Неверный')).toBeVisible();
  });

  test('should logout user', async ({ page }) => {
    // Входим через demo
    await page.goto('/');
    await page.click('text=Demo');
    await page.click('text=Турист');
    
    // Выходим
    await page.click('[aria-label="User menu"]');
    await page.click('text=Выйти');
    
    // Проверяем редирект
    await expect(page).toHaveURL('/');
  });
});

