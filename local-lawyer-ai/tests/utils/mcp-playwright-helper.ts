/**
 * MCP Playwright Helper Utilities
 * 
 * This file provides utilities to work with MCP (Model Context Protocol) 
 * and Playwright for automated testing and browser interactions.
 */

import { Page, Browser, BrowserContext } from '@playwright/test';

export class MCPPlaywrightHelper {
  private page: Page;
  private context: BrowserContext;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
  }

  /**
   * Navigate to a specific route with error handling
   */
  async navigateToRoute(route: string, options?: { waitFor?: string }) {
    try {
      await this.page.goto(route);
      
      if (options?.waitFor) {
        await this.page.waitForSelector(options.waitFor);
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Take a screenshot for MCP analysis
   */
  async captureScreenshotForAnalysis(filename?: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `tests/screenshots/mcp-analysis-${timestamp}.png`;
    
    await this.page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    return screenshotPath;
  }

  /**
   * Test form interactions with AI assistance
   */
  async testFormInteraction(formSelector: string, fields: Record<string, string>) {
    const form = this.page.locator(formSelector);
    
    if (!(await form.isVisible())) {
      throw new Error(`Form ${formSelector} not found`);
    }

    for (const [fieldName, value] of Object.entries(fields)) {
      const field = form.locator(`[name="${fieldName}"], [data-testid="${fieldName}"]`);
      await field.fill(value);
    }

    return { success: true, form: formSelector };
  }

  /**
   * Monitor network requests for API testing
   */
  async monitorAPIRequests(pattern: string) {
    const requests: any[] = [];
    
    this.page.on('request', (request) => {
      if (request.url().includes(pattern)) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          timestamp: new Date().toISOString()
        });
      }
    });

    return requests;
  }

  /**
   * Test accessibility with automated checks
   */
  async testAccessibility() {
    // Basic accessibility checks that can be enhanced with AI
    const results = {
      hasMainLandmark: await this.page.locator('main, [role="main"]').count() > 0,
      hasNavigation: await this.page.locator('nav, [role="navigation"]').count() > 0,
      hasHeadings: await this.page.locator('h1, h2, h3, h4, h5, h6').count() > 0,
      hasAltTexts: await this.checkImageAltTexts(),
      colorContrast: await this.checkBasicColorContrast()
    };

    return results;
  }

  private async checkImageAltTexts() {
    const images = await this.page.locator('img').all();
    const imagesWithoutAlt = [];
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      if (!alt || alt.trim() === '') {
        const src = await img.getAttribute('src');
        imagesWithoutAlt.push(src);
      }
    }
    
    return {
      totalImages: images.length,
      imagesWithoutAlt: imagesWithoutAlt.length,
      missingAltImages: imagesWithoutAlt
    };
  }

  private async checkBasicColorContrast() {
    // This is a simplified check - in practice, you'd use more sophisticated tools
    const elements = await this.page.locator('button, a, input').all();
    const contrastIssues = [];
    
    for (const element of elements.slice(0, 10)) { // Check first 10 elements
      try {
        const styles = await element.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize
          };
        });
        
        // This would need a proper color contrast calculation
        // For now, just check if we have both color and background
        if (styles.color && styles.backgroundColor) {
          // Placeholder for actual contrast calculation
        }
      } catch (error) {
        // Skip elements that can't be evaluated
      }
    }
    
    return {
      elementsChecked: Math.min(elements.length, 10),
      potentialIssues: contrastIssues.length
    };
  }

  /**
   * Test responsive design across different viewports
   */
  async testResponsiveDesign(viewports: Array<{ width: number; height: number; name: string }>) {
    const results = [];
    
    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Wait for any layout changes
      await this.page.waitForTimeout(500);
      
      const screenshot = await this.page.screenshot({ 
        fullPage: true,
        path: `tests/screenshots/responsive-${viewport.name}.png`
      });
      
      results.push({
        viewport: viewport.name,
        size: `${viewport.width}x${viewport.height}`,
        screenshot: `responsive-${viewport.name}.png`,
        hasHorizontalScroll: await this.checkHorizontalScroll()
      });
    }
    
    return results;
  }

  private async checkHorizontalScroll() {
    return await this.page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
  }

  /**
   * Performance testing with basic metrics
   */
  async measurePerformance(url: string) {
    const startTime = Date.now();
    
    await this.page.goto(url, { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      };
    });

    return {
      totalLoadTime: loadTime,
      ...metrics
    };
  }
}