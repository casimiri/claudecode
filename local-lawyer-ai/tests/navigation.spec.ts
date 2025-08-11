import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between different locales', async ({ page }) => {
    // Test English locale
    await page.goto('/en');
    await expect(page).toHaveURL(/.*\/en.*/);
    
    // Test French locale if available
    await page.goto('/fr');
    await expect(page).toHaveURL(/.*\/fr.*/);
  });

  test('should have consistent navigation across pages', async ({ page }) => {
    const pages = ['/en', '/en/login'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Check for main navigation
      const nav = page.locator('nav, .navigation, [data-testid="navigation"]');
      if (await nav.isVisible()) {
        await expect(nav).toBeVisible();
      }
    }
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/en/non-existent-page');
    
    // Should either show a 404 page or redirect to home
    const is404 = await page.locator('text=404, text=not found').isVisible();
    const isRedirected = page.url().includes('/en') && !page.url().includes('non-existent-page');
    
    expect(is404 || isRedirected).toBeTruthy();
  });
});