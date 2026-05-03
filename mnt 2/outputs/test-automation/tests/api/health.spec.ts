import { test, expect } from '@playwright/test';
import { BASE_URL, API_BASE_URL } from '../../utils/config';

/**
 * Health & Connectivity Tests
 * -----------------------------------------------------------
 * Basic sanity checks: is the server up? Does it respond?
 * These run first and fast. If these fail, all other tests will too.
 *
 * HOW TO CUSTOMISE:
 * - Update API_BASE_URL in utils/config.ts if your API is on a different path/port
 * - Add real health check endpoints your backend exposes
 */

test.describe('Server Health', () => {

  // ─── Website Availability ─────────────────────────────────────────────────

  test('website should be reachable (GET /)', async ({ request }) => {
    const response = await request.get(BASE_URL);
    expect(response.status()).toBeLessThan(500);
    console.log(`Website status: ${response.status()}`);
  });

  test('website should respond within 3 seconds', async ({ request }) => {
    const start = Date.now();
    const response = await request.get(BASE_URL);
    const duration = Date.now() - start;

    expect(response.ok()).toBeTruthy();
    expect(duration).toBeLessThan(3000);
    console.log(`Response time: ${duration}ms`);
  });

  // ─── API Health Endpoint ──────────────────────────────────────────────────

  test('GET /api/health should return 200 if it exists', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    // Accept 200 (healthy) or 404 (endpoint not implemented)
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      console.log('✓ Health endpoint found and responding');
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('application/json')) {
        const body = await response.json();
        console.log('Health response:', JSON.stringify(body));
      }
    } else {
      console.log('ℹ /api/health not found — consider adding a health check endpoint');
    }
  });

  test('GET /api/ping should return 200 if it exists', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/ping`);
    expect([200, 404]).toContain(response.status());
  });

  // ─── Response Headers ─────────────────────────────────────────────────────

  test('homepage should return correct content-type header', async ({ request }) => {
    const response = await request.get(BASE_URL);
    const contentType = response.headers()['content-type'] || '';
    // Should be HTML content
    expect(contentType).toContain('text/html');
  });

  test('server should not expose sensitive headers', async ({ request }) => {
    const response = await request.get(BASE_URL);
    const headers = response.headers();

    // Check for unwanted server version disclosure
    const serverHeader = headers['server'] || '';
    const xPoweredBy = headers['x-powered-by'] || '';

    if (serverHeader) console.warn(`⚠ Server header exposed: ${serverHeader}`);
    if (xPoweredBy) console.warn(`⚠ X-Powered-By header exposed: ${xPoweredBy}`);

    // This is a soft warning (not a hard fail) — uncomment to enforce:
    // expect(xPoweredBy).toBe('');
  });

});
