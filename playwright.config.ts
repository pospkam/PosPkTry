/**
 * Playwright E2E Testing Configuration
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  
  // Максимальное время выполнения одного теста
  timeout: 30 * 1000,
  
  // Ожидание для expect()
  expect: {
    timeout: 5000,
  },
  
  // Запуск тестов параллельно
  fullyParallel: true,
  
  // Не запускать тесты при ошибке в CI
  forbidOnly: !!process.env.CI,
  
  // Количество попыток при падении теста
  retries: process.env.CI ? 2 : 0,
  
  // Количество параллельных workers
  workers: process.env.CI ? 1 : undefined,
  
  // Репортеры
  reporter: [
    ['html'],
    ['list'],
    process.env.CI ? ['github'] : ['line'],
  ],
  
  // Общие настройки для всех проектов
  use: {
    // Базовый URL приложения
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Трассировка только при падении теста
    trace: 'on-first-retry',
    
    // Скриншот при падении
    screenshot: 'only-on-failure',
    
    // Видео при падении
    video: 'retain-on-failure',
    
    // Таймаут для action
    actionTimeout: 10 * 1000,
  },

  // Конфигурация для различных browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Запуск dev сервера перед тестами
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});





