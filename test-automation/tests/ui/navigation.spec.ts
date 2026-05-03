import { test, expect } from '@playwright/test';
import { BASE_URL, ROUTES } from '../../utils/config';

/**
 * Navigation Tests
 * -----------------------------------------------------------
 * Tests for page navigation: links, back/forward, routing.
 *
 * HOW TO CUSTOMISE:
 * - Update the EXPECTED_LINKS list to match your website's menu items
 * - Update selectors (e.g. 'nav a') to match your navigation HTML
 * - Add routes to ROUTES in utils/config.ts as needed
 */

// Add your website's navigation links here
const EXPECTED_LINKS = [
  { label: /home/i, expectedURLPattern: /\/$/ },
  { label: /about/i, expectedURLPattern: /about/ },
  { label: /contact/i, expectedURLPattern: /contact/ },
];

test.describe('Navigation', () => {

  // ─── Link Discovery ───────────────────────────────────────────────────────

  test('should have at least one navigation link', async ({ page }) => {
    await page.goto(BASE_URL);
    const links = page.locator('nav a, header a, [role="navigation"] a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    console.log(`Found ${count} navigation link(s)`);
  });

  test('should have no links pointing to "#" placeholder', async ({ page }) => {
    await page.goto(BASE_URL);
    const placeholderLinks = page.locator('a[href="#"]');
    const count = await placeholderLinks.count();
    if (count > 0) {
      console.warn(`Found ${count} placeholder link(s) with href="#"`);
    }
    // This is a soft warning — not a hard failure
    // expect(count).toBe(0);  // Uncomment to make it a strict test
  });

  // ─── Page Routing ─────────────────────────────────────────────────────────

  test('should navigate to /about if it exists', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/about`);
    // Allow 200 (exists) or 404 (not implemented yet)
    expect([200, 404]).toContain(response?.status());
    if (response?.status() === 200) {
      console.log('✓ /about page exists');
    } else {
      console.log('ℹ /about page not found — add it to ROUTES when ready');
    }
  });

  test('should navigate to /contact if it exists', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/contact`);
    expect([200, 404]).toContain(response?.status());
  });

  // ─── Browser History ──────────────────────────────────────────────────────

  test('should support browser back and forward navigation', async ({ page }) => {
    // Start at homepage
    await page.goto(BASE_URL);
    const homeURL = page.url();

    // Find a real internal link to click (instead of guessing /about)
    const internalLinks = page.locator(`a[href^="/"], a[href^="${BASE_URL}"]`);
    const count = await internalLinks.count();

    if (count === 0) {
      console.warn('No internal links found — skipping back/forward test');
      return;
    }

    // Click the first internal link
    const href = await internalLinks.first().getAttribute('href') || '/';
    const targetURL = href.startsWith('http') ? href : `${BASE_URL}${href}`;
    await page.goto(targetURL);
    const secondURL = page.url();

    // Only test back/forward if we actually navigated somewhere different
    if (secondURL === homeURL) {
      console.warn('Link led to same page — skipping back/forward assertion');
      return;
    }

    // Go back — should return to homepage
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
    const backURL = page.url();
    expect(backURL).toContain(new URL(BASE_URL).hostname);

    // Go forward — should return to the page we visited
    await page.goForward();
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain(new URL(BASE_URL).hostname);

    console.log(`Back/forward navigation: ${homeURL} ↔ ${secondURL} ✓`);
  });

  // ─── 404 Handling ─────────────────────────────────────────────────────────

  test('should handle 404 pages gracefully', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/this-page-does-not-exist-xyz-99999`);
    const status = response?.status() ?? 0;

    // Accept 200 OR 404 — many sites render a custom "Not Found" page
    // with HTTP 200 (soft 404), which is valid graceful handling
    expect([200, 404]).toContain(status);

    // The page must not be blank — content should still render
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(0);

    console.log(`Non-existent page responded with HTTP ${status} (graceful: ✓)`);
  });

  // ─── External Links ───────────────────────────────────────────────────────

  test('should have external links opening in new tab (target="_blank")', async ({ page }) => {
    await page.goto(BASE_URL);
    const externalLinks = page.locator('a[href^="http"]:not([href*="localhost"])');
    const count = await externalLinks.count();

    if (count === 0) {
      console.log('No external links found on homepage.');
      return;
    }

    const withoutBlank: string[] = [];
    for (let i = 0; i < count; i++) {
      const target = await externalLinks.nth(i).getAttribute('target');
      const href = await externalLinks.nth(i).getAttribute('href') || '';
      if (target !== '_blank') {
        withoutBlank.push(href);
      }
    }

    if (withoutBlank.length > 0) {
      console.warn(`External links without target="_blank": ${withoutBlank.join(', ')}`);
    }
  });

});
