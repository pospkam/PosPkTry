import { test, expect } from '@playwright/test';

test.describe('Аренда автомобилей - E2E', () => {
  test('Поиск и бронирование автомобиля', async ({ page }) => {
    // 1. Переход на страницу аренды автомобилей
    await page.goto('/cars');
    await expect(page).toHaveTitle(/Аренда автомобилей/);

    // 2. Применение фильтров
    await page.selectOption('[data-testid="brand-filter"]', 'Toyota');
    await page.fill('[data-testid="min-price"]', '3000');
    await page.fill('[data-testid="max-price"]', '7000');
    await page.click('[data-testid="apply-filters"]');

    // 3. Просмотр доступных автомобилей
    await page.waitForSelector('[data-testid="car-card"]');
    const carCards = await page.$$('[data-testid="car-card"]');
    expect(carCards.length).toBeGreaterThan(0);

    // 4. Выбор автомобиля
    await page.click('[data-testid="car-card"]:first-child');
    
    // 5. Проверка деталей автомобиля
    await expect(page.locator('[data-testid="car-brand"]')).toBeVisible();
    await expect(page.locator('[data-testid="car-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="car-features"]')).toBeVisible();

    // 6. Выбор дат аренды
    await page.fill('[data-testid="start-date"]', '2024-12-25');
    await page.fill('[data-testid="end-date"]', '2024-12-30');
    
    // 7. Заполнение данных водителя
    await page.fill('[data-testid="driver-license"]', 'AB123456');
    await page.fill('[data-testid="driver-experience"]', '5');
    
    // 8. Просмотр расчета стоимости
    await page.click('[data-testid="calculate-price"]');
    await expect(page.locator('[data-testid="total-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="deposit-amount"]')).toBeVisible();

    // 9. Подтверждение бронирования
    await page.click('[data-testid="confirm-rental"]');
    await page.waitForSelector('[data-testid="rental-confirmation"]');
    
    // Проверка номера аренды
    const rentalNumber = await page.textContent('[data-testid="rental-number"]');
    expect(rentalNumber).toMatch(/CR-\d{4}-\d{3}/);
  });

  test('Управление автопарком партнером', async ({ page }) => {
    // Логин как партнер
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'cars-partner@test.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');

    // Переход в кабинет партнера
    await page.goto('/hub/cars');
    await expect(page.locator('[data-testid="partner-dashboard"]')).toBeVisible();

    // Добавление нового автомобиля
    await page.click('[data-testid="add-car"]');
    await page.selectOption('[data-testid="car-brand"]', 'Toyota');
    await page.fill('[data-testid="car-model"]', 'Land Cruiser');
    await page.fill('[data-testid="car-year"]', '2023');
    await page.fill('[data-testid="license-plate"]', 'А123БВ41');
    await page.fill('[data-testid="price-per-day"]', '5000');
    await page.fill('[data-testid="deposit-amount"]', '20000');
    await page.fill('[data-testid="quantity"]', '2');
    
    // Сохранение
    await page.click('[data-testid="save-car"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // Проверка добавления в список
    await expect(page.locator('text=Land Cruiser')).toBeVisible();
  });
});
