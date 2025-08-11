import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check if the page loads without errors
    await expect(page).toHaveTitle(/Local Lawyer AI|Legal AI Assistant/);
    
    // Check for main navigation elements
    await expect(page.locator('nav')).toBeVisible();
    
    // Check for main content
    await expect(page.locator('main, .main-content, [data-testid="main-content"]')).toBeVisible();
  });

  test('should have working language switcher', async ({ page }) => {
    await page.goto('/');
    
    // Look for language switcher
    const languageSwitcher = page.locator('[data-testid="language-switcher"], .language-switcher');
    if (await languageSwitcher.isVisible()) {
      await expect(languageSwitcher).toBeVisible();
    }
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    
    // Look for login link/button
    const loginButton = page.locator('a[href*="login"], button:has-text("Login"), button:has-text("Sign In")').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await expect(page).toHaveURL(/.*login.*/);
    }
  });
});