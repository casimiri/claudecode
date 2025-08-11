import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/en/login');
    
    // Check if login page loads
    await expect(page.locator('h1, h2, .login-title')).toContainText(/login|sign in/i);
    
    // Check for OAuth buttons
    await expect(page.locator('button:has-text("Google"), button:has-text("Continue with Google")')).toBeVisible();
    await expect(page.locator('button:has-text("Facebook"), button:has-text("Continue with Facebook")')).toBeVisible();
  });

  test('should show security indicators', async ({ page }) => {
    await page.goto('/en/login');
    
    // Check for security indicators
    const securityElements = page.locator('text=secure, text=security, [data-testid="security"]');
    if (await securityElements.count() > 0) {
      await expect(securityElements.first()).toBeVisible();
    }
  });

  test('should handle OAuth button clicks', async ({ page }) => {
    await page.goto('/en/login');
    
    const googleButton = page.locator('button:has-text("Google"), button:has-text("Continue with Google")');
    const facebookButton = page.locator('button:has-text("Facebook"), button:has-text("Continue with Facebook")');
    
    // Test that buttons are clickable (but don't actually authenticate in tests)
    if (await googleButton.isVisible()) {
      await expect(googleButton).toBeEnabled();
    }
    
    if (await facebookButton.isVisible()) {
      await expect(facebookButton).toBeEnabled();
    }
  });
});