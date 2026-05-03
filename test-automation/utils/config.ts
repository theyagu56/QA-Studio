/**
 * Shared Configuration
 * -----------------------------------------------------------
 * Update BASE_URL to match your local or deployed website URL.
 * You can also use environment variables for different environments:
 *   BASE_URL=http://staging.mysite.com npx playwright test
 */

// ─── Base URL ─────────────────────────────────────────────────────────────────
// Change port (3000) to match your dev server (e.g. 3000, 4200, 5173, 8080)
export const BASE_URL: string = process.env.BASE_URL || 'https://automationexercise.com/';

// ─── API Base URL ─────────────────────────────────────────────────────────────
// If your API runs on a different port or path, update this
export const API_BASE_URL: string = process.env.API_BASE_URL || `${BASE_URL}/api`;

// ─── Timeouts ─────────────────────────────────────────────────────────────────
export const TIMEOUT: number = 30_000;        // Global test timeout (ms)
export const SLOW_MO: number = 0;             // Set to 500 to slow down browser (for debugging)

// ─── Test Users ───────────────────────────────────────────────────────────────
// Replace with your test account credentials
export const TEST_USER = {
  email: 'testuser@example.com',
  password: 'Test@1234',
  name: 'Test User',
};

export const ADMIN_USER = {
  email: 'admin@example.com',
  password: 'Admin@1234',
  name: 'Admin User',
};

// ─── Common Routes ────────────────────────────────────────────────────────────
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  profile: '/profile',
  contact: '/contact',
};
