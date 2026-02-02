import { test, expect } from '@playwright/test';

test.describe('Полный цикл туриста', () => {
  test('Регистрация, поиск тура и бронирование', async ({ page }) => {
    // 1. Переход на главную страницу
    await page.goto('/');
    await expect(page).toHaveTitle(/Kamchatour Hub/);

    // 2. Поиск тура
    await page.fill('[data-testid="search-input"]', 'Вулканы');
    await page.click('[data-testid="search-button"]');
    
    // Ожидание результатов поиска
    await page.waitForSelector('[data-testid="tour-card"]', { timeout: 5000 });
    const tourCards = await page.$$('[data-testid="tour-card"]');
    expect(tourCards.length).toBeGreaterThan(0);

    // 3. Просмотр деталей тура
    await page.click('[data-testid="tour-card"]:first-child');
    await expect(page).toHaveURL(/\/tours\/.+/);
    await expect(page.locator('[data-testid="tour-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="tour-price"]')).toBeVisible();

    // 4. Добавление в избранное
    await page.click('[data-testid="add-to-wishlist"]');
    await expect(page.locator('[data-testid="wishlist-confirmation"]')).toBeVisible();

    // 5. Переход к бронированию
    await page.click('[data-testid="book-button"]');
    
    // Если не авторизован, перенаправит на логин
    if (page.url().includes('/auth/login')) {
      // Регистрация нового пользователя
      await page.click('[data-testid="register-tab"]');
      await page.fill('[data-testid="email-input"]', `test-${Date.now()}@example.com`);
      await page.fill('[data-testid="password-input"]', 'Test123456!');
      await page.fill('[data-testid="name-input"]', 'Тестовый Турист');
      await page.click('[data-testid="register-button"]');
      
      // Ожидание редиректа на профиль
      await page.waitForURL(/\/profile/, { timeout: 10000 });
    }

    // 6. Заполнение формы бронирования
    await page.fill('[data-testid="booking-date"]', '2024-12-25');
    await page.fill('[data-testid="participants-count"]', '2');
    await page.fill('[data-testid="special-requests"]', 'Просьба предоставить вегетарианское питание');
    
    // 7. Подтверждение бронирования
    await page.click('[data-testid="confirm-booking"]');
    await page.waitForSelector('[data-testid="booking-confirmation"]', { timeout: 10000 });
    
    // Проверка номера бронирования
    const bookingNumber = await page.textContent('[data-testid="booking-number"]');
    expect(bookingNumber).toMatch(/BK-\d{4}-\d{5}/);
  });

  test('Просмотр профиля туриста и статистики', async ({ page }) => {
    // Логин как турист
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'tourist@test.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');

    // Переход в профиль
    await page.goto('/hub/tourist');
    await expect(page.locator('[data-testid="tourist-profile"]')).toBeVisible();

    // Проверка отображения статистики
    await expect(page.locator('[data-testid="loyalty-tier"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-trips"]')).toBeVisible();
    await expect(page.locator('[data-testid="loyalty-points"]')).toBeVisible();

    // Проверка списка поездок
    await page.click('[data-testid="trips-tab"]');
    await expect(page.locator('[data-testid="trip-card"]')).toBeVisible();

    // Проверка достижений
    await page.click('[data-testid="achievements-tab"]');
    await expect(page.locator('[data-testid="achievement-badge"]')).toBeVisible();
  });

  test('Управление документами туриста', async ({ page }) => {
    await page.goto('/hub/tourist');
    
    // Переход к разделу документов
    await page.click('[data-testid="documents-tab"]');
    
    // Добавление нового документа
    await page.click('[data-testid="add-document"]');
    await page.selectOption('[data-testid="document-type"]', 'passport');
    await page.fill('[data-testid="document-number"]', '1234 567890');
    await page.fill('[data-testid="expiry-date"]', '2030-12-31');
    await page.click('[data-testid="save-document"]');
    
    // Проверка добавления
    await expect(page.locator('[data-testid="document-card"]')).toBeVisible();
    await expect(page.locator('text=1234 567890')).toBeVisible();
  });
});
