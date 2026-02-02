import { test, expect } from '@playwright/test';

test.describe('Магазин сувениров - E2E', () => {
  test('Покупка сувениров с применением купона', async ({ page }) => {
    // 1. Переход в магазин
    await page.goto('/shop');
    await expect(page).toHaveTitle(/Сувениры/);

    // 2. Просмотр каталога
    await expect(page.locator('[data-testid="souvenir-card"]')).toBeVisible();

    // 3. Фильтрация по категории
    await page.click('[data-testid="category-magnets"]');
    await page.waitForSelector('[data-testid="souvenir-card"]');

    // 4. Добавление товаров в корзину
    await page.click('[data-testid="add-to-cart"]:first-child');
    await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1');
    
    await page.click('[data-testid="add-to-cart"]:nth-child(2)');
    await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('2');

    // 5. Переход в корзину
    await page.click('[data-testid="cart-button"]');
    await expect(page.locator('[data-testid="cart-items"]')).toBeVisible();

    // 6. Изменение количества
    await page.fill('[data-testid="item-quantity"]:first-child', '3');
    await page.click('[data-testid="update-cart"]');

    // 7. Применение купона на скидку
    await page.fill('[data-testid="coupon-code"]', 'SAVE10');
    await page.click('[data-testid="apply-coupon"]');
    await expect(page.locator('[data-testid="discount-applied"]')).toBeVisible();

    // 8. Заполнение адреса доставки
    await page.fill('[data-testid="shipping-address"]', 'ул. Ленина, 123');
    await page.fill('[data-testid="shipping-city"]', 'Петропавловск-Камчатский');
    await page.fill('[data-testid="shipping-phone"]', '+79001234567');

    // 9. Выбор способа оплаты
    await page.click('[data-testid="payment-card"]');

    // 10. Оформление заказа
    await page.click('[data-testid="place-order"]');
    await page.waitForSelector('[data-testid="order-confirmation"]');
    
    // Проверка номера заказа
    const orderNumber = await page.textContent('[data-testid="order-number"]');
    expect(orderNumber).toMatch(/SO-\d{4}-\d{3}/);
  });

  test('Управление магазином партнером', async ({ page }) => {
    // Логин как партнер
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'souvenirs-partner@test.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');

    // Переход в кабинет магазина
    await page.goto('/hub/souvenirs');
    
    // Просмотр статистики
    await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="orders-count"]')).toBeVisible();

    // Добавление нового товара
    await page.click('[data-testid="add-product"]');
    await page.fill('[data-testid="product-name"]', 'Магнит "Медведь"');
    await page.fill('[data-testid="product-description"]', 'Красивый магнит');
    await page.selectOption('[data-testid="product-category"]', 'magnets');
    await page.fill('[data-testid="product-price"]', '250');
    await page.fill('[data-testid="product-stock"]', '100');
    await page.fill('[data-testid="product-sku"]', 'MAG-BEAR-001');
    
    await page.click('[data-testid="save-product"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // Просмотр заказов
    await page.click('[data-testid="orders-tab"]');
    await expect(page.locator('[data-testid="order-row"]')).toBeVisible();

    // Обработка заказа
    await page.click('[data-testid="order-row"]:first-child');
    await page.selectOption('[data-testid="order-status"]', 'processing');
    await page.click('[data-testid="update-order"]');
    await expect(page.locator('text=Обновлено')).toBeVisible();
  });
});
