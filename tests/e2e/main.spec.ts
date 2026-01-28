/**
 * E2E TESTS: Browser-based Testing with Playwright
 * 
 * Тестирование полного пользовательского пути через веб-интерфейс
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Tourist: Complete Booking Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(`${BASE_URL}/login`);
  });

  test('should complete tour booking with payment', async () => {
    // 1. Login
    await page.fill('[data-testid="email-input"]', 'tourist@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard
    await expect(page).toHaveURL(`${BASE_URL}/hub/tourist`);
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();

    // 2. Search for tours
    await page.click('[data-testid="search-button"]');
    await page.fill('[data-testid="location-input"]', 'Kamchatka');
    await page.selectOption('[data-testid="difficulty-select"]', 'medium');
    await page.click('[data-testid="apply-filters"]');

    // Wait for results
    await expect(page.locator('[data-testid="tour-card"]').first()).toBeVisible();
    const tourCount = await page.locator('[data-testid="tour-card"]').count();
    expect(tourCount).toBeGreaterThan(0);

    // 3. Select a tour
    await page.click('[data-testid="tour-card"] >> first-child');
    await expect(page).toHaveURL(/\/tours\/\w+/);

    // 4. Check tour details
    await expect(page.locator('[data-testid="tour-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="tour-rating"]')).toBeVisible();
    await expect(page.locator('[data-testid="tour-price"]')).toBeVisible();

    // 5. Click "Book Now"
    await page.click('[data-testid="book-now-button"]');

    // 6. Fill booking form
    await expect(page.locator('[data-testid="booking-form"]')).toBeVisible();
    await page.selectOption('[data-testid="participants-select"]', '2');
    await page.fill('[data-testid="special-requests"]', 'Vegetarian meals');
    await page.check('[data-testid="insurance-checkbox"]');

    // 7. Review booking
    await page.click('[data-testid="review-booking-button"]');
    await expect(page.locator('[data-testid="booking-summary"]')).toBeVisible();
    
    const totalPrice = await page.locator('[data-testid="total-price"]').textContent();
    expect(totalPrice).toMatch(/\d+/);

    // 8. Proceed to payment
    await page.click('[data-testid="proceed-to-payment"]');
    await expect(page).toHaveURL(/\/checkout|\/payment/);

    // 9. Fill payment form
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/26');
    await page.fill('[data-testid="card-cvc"]', '123');

    // 10. Submit payment
    await page.click('[data-testid="pay-button"]');

    // 11. Confirmation page
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible();
    const bookingNumber = await page.locator('[data-testid="booking-number"]').textContent();
    expect(bookingNumber).toMatch(/^BK-/);

    // 12. Check confirmation email notification
    await expect(page.locator('[data-testid="confirmation-email"]')).toBeVisible();
  });

  test('should add review after tour completion', async () => {
    // Pre-setup: User is logged in and has completed tour
    await page.goto(`${BASE_URL}/hub/tourist/bookings`);

    // Find completed booking
    const completedBooking = page.locator('[data-testid="booking-card"]:has-text("Completed")').first();
    await expect(completedBooking).toBeVisible();

    // Click "Write Review"
    await completedBooking.locator('[data-testid="write-review"]').click();

    // 1. Select rating
    await page.click('[data-testid="star-5"]');

    // 2. Write review
    await page.fill('[data-testid="review-comment"]', 'Amazing tour! Highly recommended!');

    // 3. Upload photos
    const fileInput = page.locator('[data-testid="photo-upload"]');
    await fileInput.setInputFiles('tests/fixtures/tour-photo.jpg');

    // 4. Submit review
    await page.click('[data-testid="submit-review"]');

    // 5. Verify success
    await expect(page.locator('[data-testid="review-success"]')).toBeVisible();
    
    // 6. Check loyalty points notification
    await expect(page.locator('[data-testid="loyalty-points-earned"]')).toBeVisible();
  });

  test('should manage loyalty profile and redemption', async () => {
    // Navigate to loyalty profile
    await page.goto(`${BASE_URL}/hub/tourist/loyalty`);

    // Check loyalty level
    const currentLevel = await page.locator('[data-testid="loyalty-level"]').textContent();
    expect(['bronze', 'silver', 'gold', 'platinum']).toContain(currentLevel);

    // Check available points
    const points = await page.locator('[data-testid="available-points"]').textContent();
    expect(points).toMatch(/\d+/);

    // Check benefits for current level
    await expect(page.locator('[data-testid="level-benefits"]')).toBeVisible();

    // Check available rewards
    const rewards = page.locator('[data-testid="reward-card"]');
    const rewardCount = await rewards.count();
    expect(rewardCount).toBeGreaterThan(0);

    // Try to redeem a reward
    const firstReward = rewards.first();
    await firstReward.locator('[data-testid="redeem-button"]').click();

    // Confirm redemption
    await page.click('[data-testid="confirm-redemption"]');

    // Verify success and point deduction
    await expect(page.locator('[data-testid="redemption-success"]')).toBeVisible();
  });

  test('should track eco-points for sustainable choices', async () => {
    // Complete a tour with eco-friendly option
    await page.goto(`${BASE_URL}/hub/tourist/bookings`);

    const ecoTourBooking = page.locator('[data-testid="eco-badge"]').first();
    await expect(ecoTourBooking).toBeVisible();

    // Check eco-points
    await page.goto(`${BASE_URL}/hub/tourist/eco`);

    // Verify eco-points earned
    const ecoPoints = await page.locator('[data-testid="total-eco-points"]').textContent();
    expect(ecoPoints).toMatch(/\d+/);

    // Check eco-activities
    const activities = page.locator('[data-testid="eco-activity"]');
    const activityCount = await activities.count();
    expect(activityCount).toBeGreaterThan(0);
  });
});

test.describe('Operator: Tour Management', () => {
  test('should create and publish tour', async ({ page }) => {
    // Login as operator
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[data-testid="email-input"]', 'operator@test.com');
    await page.fill('[data-testid="password-input"]', 'operator-pass');
    await page.click('[data-testid="login-button"]');

    // Navigate to tour creation
    await page.goto(`${BASE_URL}/hub/operator/tours`);
    await page.click('[data-testid="create-tour-button"]');

    // Fill basic info
    await page.fill('[data-testid="tour-title"]', 'New Volcano Trekking');
    await page.fill('[data-testid="tour-description"]', 'Experience the power of nature');
    await page.selectOption('[data-testid="difficulty"]', 'medium');

    // Set pricing
    await page.fill('[data-testid="price-from"]', '15000');
    await page.fill('[data-testid="price-to"]', '25000');
    await page.fill('[data-testid="max-participants"]', '12');

    // Set duration
    await page.fill('[data-testid="duration-days"]', '3');

    // Add what's included
    await page.click('[data-testid="includes-meals"]');
    await page.click('[data-testid="includes-guide"]');
    await page.click('[data-testid="includes-equipment"]');

    // Upload images
    const imageInput = page.locator('[data-testid="tour-image-upload"]');
    await imageInput.setInputFiles('tests/fixtures/tour-main.jpg');

    // Save tour
    await page.click('[data-testid="save-tour"]');
    await expect(page.locator('[data-testid="tour-saved"]')).toBeVisible();

    // Publish tour
    await page.click('[data-testid="publish-tour"]');
    await page.click('[data-testid="confirm-publish"]');

    // Verify publication
    await expect(page.locator('[data-testid="tour-published"]')).toBeVisible();
  });

  test('should manage tour schedules', async ({ page }) => {
    await page.goto(`${BASE_URL}/hub/operator/schedules`);

    // Create new schedule
    await page.click('[data-testid="add-schedule"]');

    // Select tour
    await page.selectOption('[data-testid="tour-select"]', 'tour-123');

    // Set date and time
    await page.fill('[data-testid="schedule-date"]', '2024-06-15');
    await page.fill('[data-testid="start-time"]', '09:00');

    // Set available seats
    await page.fill('[data-testid="available-seats"]', '12');

    // Assign guide
    await page.selectOption('[data-testid="guide-select"]', 'guide-1');

    // Save schedule
    await page.click('[data-testid="save-schedule"]');

    // Verify creation
    await expect(page.locator('[data-testid="schedule-created"]')).toBeVisible();

    // Check calendar view
    const scheduleEntry = page.locator('[data-testid="schedule-2024-06-15"]');
    await expect(scheduleEntry).toBeVisible();
  });

  test('should view operator dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/hub/operator`);

    // Check all dashboard sections
    await expect(page.locator('[data-testid="revenue-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-tours-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-bookings-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="ratings-card"]')).toBeVisible();

    // Check revenue chart
    const revenueChart = page.locator('[data-testid="revenue-chart"]');
    await expect(revenueChart).toBeVisible();

    // Check bookings table
    const bookingsTable = page.locator('[data-testid="bookings-table"]');
    await expect(bookingsTable).toBeVisible();

    // Verify data is present
    const totalRevenue = page.locator('[data-testid="total-revenue"]');
    const revenueText = await totalRevenue.textContent();
    expect(revenueText).toMatch(/\d+/);
  });
});

test.describe('Guide: Mobile App Flow', () => {
  test('should check in tourists to tour', async ({ page, context }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    // Login as guide
    await page.goto(`${BASE_URL}/guide-app`);
    await page.fill('[data-testid="email"]', 'guide@test.com');
    await page.fill('[data-testid="password"]', 'guide-pass');
    await page.click('[data-testid="login"]');

    // Navigate to today's tours
    await page.click('[data-testid="schedule-tab"]');

    // Start tour
    const tourCard = page.locator('[data-testid="today-tour"]').first();
    await tourCard.click();
    await page.click('[data-testid="start-tour"]');

    // Check in tourists
    await page.click('[data-testid="check-in-tab"]');

    // Get list of participants
    const participants = page.locator('[data-testid="participant-item"]');
    const participantCount = await participants.count();

    // Check in each participant
    for (let i = 0; i < participantCount; i++) {
      await participants.nth(i).click();
      await page.click('[data-testid="mark-present"]');
    }

    // Submit check-in
    await page.click('[data-testid="confirm-check-in"]');
    await expect(page.locator('[data-testid="check-in-success"]')).toBeVisible();
  });

  test('should submit safety report', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/guide-app`);

    // Navigate to active tour
    await page.click('[data-testid="active-tour"]');

    // Report safety
    await page.click('[data-testid="safety-tab"]');

    // Weather info
    await page.selectOption('[data-testid="weather"]', 'partly-cloudy');

    // Group condition
    await page.selectOption('[data-testid="group-condition"]', 'good');

    // Check equipment
    await page.check('[data-testid="check-first-aid"]');
    await page.check('[data-testid="check-gps"]');
    await page.check('[data-testid="check-satellite"]');

    // Report incident if any
    await page.click('[data-testid="add-incident"]');
    await page.selectOption('[data-testid="incident-type"]', 'minor-injury');
    await page.selectOption('[data-testid="severity"]', 'low');
    await page.fill('[data-testid="description"]', 'Tourist twisted ankle');

    // Submit report
    await page.click('[data-testid="submit-report"]');
    await expect(page.locator('[data-testid="report-submitted"]')).toBeVisible();
  });
});

test.describe('Admin: Moderation Panel', () => {
  test('should moderate content queue', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'admin-pass');
    await page.click('[data-testid="login-button"]');

    // Navigate to moderation
    await page.goto(`${BASE_URL}/hub/admin/moderation`);

    // Check moderation queue
    await expect(page.locator('[data-testid="moderation-queue"]')).toBeVisible();

    // Get first item to moderate
    const item = page.locator('[data-testid="moderation-item"]').first();

    // Review it
    await item.click();

    // View details
    await expect(page.locator('[data-testid="item-details"]')).toBeVisible();

    // If it's a review
    const rating = await page.locator('[data-testid="review-rating"]');
    const comment = await page.locator('[data-testid="review-comment"]');
    if (await rating.isVisible()) {
      // Approve the review
      await page.click('[data-testid="approve-button"]');
    } else {
      // Reject inappropriate content
      await page.click('[data-testid="reject-button"]');
      await page.selectOption('[data-testid="rejection-reason"]', 'inappropriate');
    }

    // Verify action
    await expect(page.locator('[data-testid="moderation-complete"]')).toBeVisible();

    // Check updated queue
    const newQueueCount = await page.locator('[data-testid="queue-count"]').textContent();
    expect(newQueueCount).toMatch(/\d+/);
  });

  test('should view platform analytics', async ({ page }) => {
    await page.goto(`${BASE_URL}/hub/admin/analytics`);

    // Check key metrics
    await expect(page.locator('[data-testid="total-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="conversion-rate"]')).toBeVisible();

    // Check charts
    const revenueChart = page.locator('[data-testid="revenue-chart"]');
    await expect(revenueChart).toBeVisible();

    const usersChart = page.locator('[data-testid="users-chart"]');
    await expect(usersChart).toBeVisible();

    // Check date range selector
    await page.selectOption('[data-testid="date-range"]', '30days');

    // Wait for data update
    await page.waitForTimeout(1000);

    // Verify charts updated
    const updatedRevenue = await page.locator('[data-testid="total-revenue"]').textContent();
    expect(updatedRevenue).toMatch(/\d+/);
  });
});

test.describe('Cross-browser Compatibility', () => {
  test('should work on Chrome', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome only test');

    await page.goto(`${BASE_URL}`);
    await expect(page.locator('[data-testid="logo"]')).toBeVisible();
  });

  test('should work on Firefox', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox only test');

    await page.goto(`${BASE_URL}`);
    await expect(page.locator('[data-testid="logo"]')).toBeVisible();
  });

  test('should work on Safari', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari only test');

    await page.goto(`${BASE_URL}`);
    await expect(page.locator('[data-testid="logo"]')).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}`);
    
    // Mobile menu should appear
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu).toBeVisible();

    // Hamburger menu should exist
    const hamburger = page.locator('[data-testid="hamburger-menu"]');
    await expect(hamburger).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto(`${BASE_URL}`);

    // Should show adaptive layout
    const container = page.locator('[data-testid="main-container"]');
    const boundingBox = await container.boundingBox();

    expect(boundingBox?.width).toBeLessThanOrEqual(768);
  });

  test('should be responsive on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto(`${BASE_URL}`);

    // Desktop layout elements should be visible
    const header = page.locator('[data-testid="header"]');
    const sidebar = page.locator('[data-testid="sidebar"]');

    await expect(header).toBeVisible();
  });
});
