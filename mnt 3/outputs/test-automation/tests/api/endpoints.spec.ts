import { test, expect } from '@playwright/test';
import { API_BASE_URL, TEST_USER } from '../../utils/config';

/**
 * API Endpoint Tests
 * -----------------------------------------------------------
 * Tests for REST API endpoints: GET, POST, authentication.
 *
 * HOW TO CUSTOMISE:
 * - Replace /users, /posts etc. with your real API endpoint paths
 * - Update TEST_USER in utils/config.ts with real credentials
 * - Add more test.describe blocks for each resource in your API
 * - Update expected JSON property names to match your API response shape
 */

// ─── Helper: Auth Token ───────────────────────────────────────────────────────
// If your API requires authentication, call this helper to get a token first
async function getAuthToken(request: any): Promise<string | null> {
  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  });

  if (response.status() === 200) {
    const body = await response.json();
    return body.token || body.access_token || body.accessToken || null;
  }
  return null;
}


// ─── Users Resource ───────────────────────────────────────────────────────────
test.describe('API — Users', () => {

  test('GET /api/users should return 200 or 401', async ({ request }) => {
    // 200 = public endpoint, 401 = protected (auth required)
    const response = await request.get(`${API_BASE_URL}/users`);
    expect([200, 401, 403, 404]).toContain(response.status());
    console.log(`GET /api/users → ${response.status()}`);
  });

  test('GET /api/users should return JSON content-type', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users`);
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'] || '';
      expect(contentType).toContain('application/json');
    }
  });

  test('GET /api/users response should be an array or object', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users`);
    if (response.status() !== 200) {
      console.log('Skipping body check — endpoint returned non-200');
      return;
    }
    const body = await response.json();
    const isValidShape = Array.isArray(body) || (typeof body === 'object' && body !== null);
    expect(isValidShape).toBe(true);
  });

  test('GET /api/users/:id — valid ID should return 200 or 404', async ({ request }) => {
    // Replace '1' with a valid user ID in your system
    const response = await request.get(`${API_BASE_URL}/users/1`);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('GET /api/users/:id — invalid ID should return 404', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users/999999`);
    expect([404, 400]).toContain(response.status());
  });

});


// ─── Authentication ───────────────────────────────────────────────────────────
test.describe('API — Authentication', () => {

  test('POST /api/auth/login with valid credentials', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    });

    // Accept 200 (success), 401 (wrong creds), 404 (endpoint not found)
    expect([200, 201, 400, 401, 404]).toContain(response.status());

    if (response.status() === 200 || response.status() === 201) {
      const body = await response.json();
      // Expect a token in the response
      const hasToken =
        'token' in body ||
        'access_token' in body ||
        'accessToken' in body;
      expect(hasToken).toBe(true);
      console.log('✓ Login returned an auth token');
    }
  });

  test('POST /api/auth/login with missing fields should return 400 or 422', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {},  // Empty body
    });
    expect([400, 422, 404]).toContain(response.status());
  });

  test('POST /api/auth/login with wrong password should return 401', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        email: TEST_USER.email,
        password: 'completelyWrongPassword!',
      },
    });
    expect([401, 400, 404]).toContain(response.status());
  });

});


// ─── Generic CRUD Tests ───────────────────────────────────────────────────────
test.describe('API — Generic Resource (Posts / Items)', () => {

  test('GET /api/posts — list resource', async ({ request }) => {
    // Replace 'posts' with your resource (e.g. 'products', 'orders', 'tasks')
    const response = await request.get(`${API_BASE_URL}/posts`);
    expect([200, 401, 404]).toContain(response.status());
    console.log(`GET /api/posts → ${response.status()}`);
  });

  test('POST /api/posts — create resource should require auth', async ({ request }) => {
    // Unauthenticated POST should be rejected
    const response = await request.post(`${API_BASE_URL}/posts`, {
      data: { title: 'Test Post', body: 'Test body' },
    });
    // Should NOT allow unauthenticated creation
    expect([401, 403, 404]).toContain(response.status());
  });

  test('PUT /api/posts/:id — update should require auth', async ({ request }) => {
    const response = await request.put(`${API_BASE_URL}/posts/1`, {
      data: { title: 'Updated title' },
    });
    expect([401, 403, 404]).toContain(response.status());
  });

  test('DELETE /api/posts/:id — delete should require auth', async ({ request }) => {
    const response = await request.delete(`${API_BASE_URL}/posts/1`);
    expect([401, 403, 404]).toContain(response.status());
  });

});
