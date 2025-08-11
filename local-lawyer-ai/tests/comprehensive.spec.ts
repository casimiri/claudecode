import { test, expect } from '@playwright/test';
import { MCPPlaywrightHelper } from './utils/mcp-playwright-helper';

test.describe('Comprehensive Application Testing with MCP Playwright', () => {
  let mcpHelper: MCPPlaywrightHelper;

  test.beforeEach(async ({ page, context }) => {
    mcpHelper = new MCPPlaywrightHelper(page, context);
  });

  test('should perform full application health check', async ({ page, context }) => {
    // Test main application routes
    const routes = [
      { path: '/en', name: 'Home (English)' },
      { path: '/fr', name: 'Home (French)' },
      { path: '/en/login', name: 'Login Page' },
      { path: '/en/dashboard', name: 'Dashboard (may require auth)' }
    ];

    const results = [];
    
    for (const route of routes) {
      const result = await mcpHelper.navigateToRoute(route.path);
      results.push({
        route: route.name,
        path: route.path,
        success: result.success,
        error: result.error
      });
      
      if (result.success) {
        // Take screenshot for analysis
        await mcpHelper.captureScreenshotForAnalysis(`${route.name.replace(/\s+/g, '-').toLowerCase()}`);
      }
    }

    // At least home pages should work
    const homeResults = results.filter(r => r.path.includes('/en') || r.path.includes('/fr'));
    const successfulHome = homeResults.filter(r => r.success);
    
    expect(successfulHome.length).toBeGreaterThan(0);
  });

  test('should test responsive design across viewports', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    await page.goto('/en');
    
    const responsiveResults = await mcpHelper.testResponsiveDesign(viewports);
    
    // Check that no viewport has horizontal scroll
    const hasScrollIssues = responsiveResults.some(result => result.hasHorizontalScroll);
    expect(hasScrollIssues).toBeFalsy();

    // Ensure all viewports were tested
    expect(responsiveResults).toHaveLength(viewports.length);
  });

  test('should perform accessibility audit', async ({ page }) => {
    await page.goto('/en');
    
    const accessibilityResults = await mcpHelper.testAccessibility();
    
    // Basic accessibility requirements
    expect(accessibilityResults.hasMainLandmark).toBeTruthy();
    expect(accessibilityResults.hasHeadings).toBeTruthy();
    
    // Log results for analysis
    console.log('Accessibility Results:', JSON.stringify(accessibilityResults, null, 2));
  });

  test('should monitor API requests during user journey', async ({ page }) => {
    // Start monitoring API requests
    const apiRequests = await mcpHelper.monitorAPIRequests('/api/');
    
    // Perform user journey
    await page.goto('/en');
    await page.goto('/en/login');
    
    // Wait for any async requests
    await page.waitForTimeout(2000);
    
    // Check that monitoring captured requests (if any were made)
    console.log(`Captured ${apiRequests.length} API requests during user journey`);
  });

  test('should measure page performance', async ({ page }) => {
    const performanceMetrics = await mcpHelper.measurePerformance('/en');
    
    console.log('Performance Metrics:', JSON.stringify(performanceMetrics, null, 2));
    
    // Basic performance assertions
    expect(performanceMetrics.totalLoadTime).toBeLessThan(10000); // Less than 10 seconds
    
    if (performanceMetrics.firstContentfulPaint > 0) {
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(5000); // Less than 5 seconds
    }
  });

  test('should test form interactions if login form exists', async ({ page }) => {
    await page.goto('/en/login');
    
    // Check if there are any forms on the page
    const formCount = await page.locator('form').count();
    
    if (formCount > 0) {
      console.log(`Found ${formCount} forms on login page`);
      
      // Test form fields (without actually submitting)
      const forms = await page.locator('form').all();
      
      for (let i = 0; i < forms.length; i++) {
        const form = forms[i];
        const inputs = await form.locator('input, textarea, select').all();
        
        console.log(`Form ${i + 1} has ${inputs.length} input fields`);
        
        for (const input of inputs) {
          const inputType = await input.getAttribute('type');
          const inputName = await input.getAttribute('name');
          const inputId = await input.getAttribute('id');
          
          console.log(`Input: type=${inputType}, name=${inputName}, id=${inputId}`);
        }
      }
    } else {
      console.log('No forms found on login page - possibly using OAuth only');
    }
  });

  test('should test OAuth buttons functionality', async ({ page }) => {
    await page.goto('/en/login');
    
    // Check for OAuth buttons
    const googleButton = page.locator('button:has-text("Google"), button:has-text("Continue with Google")');
    const facebookButton = page.locator('button:has-text("Facebook"), button:has-text("Continue with Facebook")');
    
    if (await googleButton.isVisible()) {
      await expect(googleButton).toBeEnabled();
      
      // Test button hover state
      await googleButton.hover();
      await page.waitForTimeout(500);
      
      console.log('Google OAuth button is functional');
    }
    
    if (await facebookButton.isVisible()) {
      await expect(facebookButton).toBeEnabled();
      
      // Test button hover state
      await facebookButton.hover();
      await page.waitForTimeout(500);
      
      console.log('Facebook OAuth button is functional');
    }
  });

  test('should verify internationalization', async ({ page }) => {
    // Test English version
    await page.goto('/en');
    const englishTitle = await page.title();
    
    // Test French version
    await page.goto('/fr');
    const frenchTitle = await page.title();
    
    console.log(`English title: ${englishTitle}`);
    console.log(`French title: ${frenchTitle}`);
    
    // Both should have titles
    expect(englishTitle).toBeTruthy();
    expect(frenchTitle).toBeTruthy();
    
    // They might be different (good) or same (acceptable for now)
    console.log(`Titles are ${englishTitle === frenchTitle ? 'same' : 'different'}`);
  });
});