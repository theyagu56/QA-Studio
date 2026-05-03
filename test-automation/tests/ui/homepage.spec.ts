import { test, expect } from '@playwright/test';
import { BASE_URL, ROUTES } from '../../utils/config';

/**
 * Homepage Tests
 * -----------------------------------------------------------
 * Tests for the homepage / landing page of your website.
 * Covers: page load, title, core elements, and basic navigation.
 *
 * Customise the selectors and text to match your actual website.
 */

test.describe('Homepage', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage before each test
    await page.goto(BASE_URL + ROUTES.home);
  });

  // ─── Page Load ────────────────────────────────────────────────────────────

  test('should load successfully with status 200', async ({ page }) => {
    // Verify the page loaded without errors
    const response = await page.goto(BASE_URL + ROUTES.home);
    expect(response?.status()).toBeLessThan(400);
  });

  test('should have a non-empty page title', async ({ page }) => {
    // Verify the browser tab has a title
    const title = await page.title();
    expect(title).not.toBe('');
    expect(title.length).toBeGreaterThan(0);
    console.log(`Page title: "${title}"`);
  });

  test('should have correct page URL', async ({ page }) => {
    // Confirm we are on the expected base URL (works for localhost AND live sites)
    const currentURL = page.url();
    const expectedHost = new URL(BASE_URL).hostname;
    expect(currentURL).toContain(expectedHost);
    console.log(`Current URL: ${currentURL} (host: ${expectedHost})`);
  });

  // ─── Core Content ─────────────────────────────────────────────────────────

  test('should have a visible header or navbar', async ({ page }) => {
    // Look for a header or navigation bar
    // Update the selector to match your site's header
    const headerSelectors = ['header', 'nav', '[role="navigation"]', '.navbar', '.header'];
    let found = false;
    for (const selector of headerSelectors) {
      if (await page.locator(selector).count() > 0) {
        await expect(page.locator(selector).first()).toBeVisible();
        found = true;
        break;
      }
    }
    if (!found) {
      console.warn('No header/nav element found — update selector in homepage.spec.ts');
    }
  });

  test('should display at least one heading', async ({ page }) => {
    // Verify the page has an h1 or h2 heading
    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();
    expect(h1Count + h2Count).toBeGreaterThan(0);
  });

  test('should have no broken images', async ({ page }) => {
    // Check all <img> elements have loaded correctly
    const images = page.locator('img');
    const count = await images.count();

    if (count === 0) {
      console.log('No images found on homepage.');
      return;
    }

    const brokenImages: string[] = [];
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      const src = await img.getAttribute('src') || '';
      if (naturalWidth === 0 && src && !src.startsWith('data:')) {
        brokenImages.push(src);
      }
    }

    expect(brokenImages, `Broken images found: ${brokenImages.join(', ')}`).toHaveLength(0);
  });

  // ─── Responsiveness ───────────────────────────────────────────────────────

  test('should be usable on mobile viewport', async ({ page }) => {
    // Resize to a mobile screen size and check the page loads
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL + ROUTES.home);
    await expect(page).not.toHaveTitle('');
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);
  });

  // ─── Performance ──────────────────────────────────────────────────────────

  test('should load within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE_URL + ROUTES.home);
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - start;

    console.log(`Homepage load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

});
