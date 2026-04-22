import { test, expect } from '@playwright/test';

test.describe('AIMS Platform Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass the disclaimer modal by setting session storage before navigation
    await page.addInitScript(() => {
      window.sessionStorage.setItem('aims_demo_agreed', 'true');
    });
  });

  test('should load the login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login heading or logo
    await expect(page).toHaveTitle(/AIMS/i);
    
    // Check if login form is present
    const usernameInput = page.locator('input[name="username"]');
    const passwordInput = page.locator('input[name="password"]');
    const loginButton = page.locator('button[type="submit"]');
    
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
  });

  test('should allow login with demo credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Use the demo login bypass
    await page.click('text="👑 Administrator"');
    
    // After login, we should see the dashboard
    await expect(page).toHaveURL(/.*dashboard|.*home/);
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });
});
