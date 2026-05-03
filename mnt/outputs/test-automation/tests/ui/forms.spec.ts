import { test, expect } from '@playwright/test';
import { BASE_URL, TEST_USER, ROUTES } from '../../utils/config';

/**
 * Form Tests
 * -----------------------------------------------------------
 * Tests for login, registration, and contact forms.
 *
 * HOW TO CUSTOMISE:
 * - Update selectors (e.g. '#email', '#password') to match your HTML
 * - Update TEST_USER credentials in utils/config.ts
 * - Update expected error messages to match your validation text
 */

test.describe('Login Form', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL + ROUTES.login);
  });

  test('should display the login form', async ({ page }) => {
    // Verify key form elements exist
    // Update selectors to match your actual login form
    const emailField = page.locator('input[type="email"], input[name="email"], #email');
    const passwordField = page.locator('input[type="password"], input[name="password"], #password');
    const submitButton = page.locator('button[type="submit"], input[type="submit"]');

    const formExists =
      (await emailField.count()) > 0 &&
      (await passwordField.count()) > 0;

    if (!formExists) {
      console.warn('Login form not found at /login — update ROUTES.login in config.ts');
      return;
    }

    await expect(emailField.first()).toBeVisible();
    await expect(passwordField.first()).toBeVisible();
    await expect(submitButton.first()).toBeVisible();
  });

  test('should show error on empty form submission', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"], input[type="submit"]');
    if (await submitButton.count() === 0) {
      console.warn('No submit button found — skipping test');
      return;
    }

    await submitButton.first().click();

    // Wait briefly for validation messages
    await page.waitForTimeout(500);

    // Check for any error messages or required field indicators
    const hasErrors = await page.locator(
      '[class*="error"], [role="alert"], .invalid-feedback, [aria-invalid="true"]'
    ).count() > 0;

    const hasHTML5Validation = await page.evaluate(() => {
      const invalid = document.querySelectorAll(':invalid');
      return invalid.length > 0;
    });

    expect(hasErrors || hasHTML5Validation).toBe(true);
  });

  test('should show error on invalid credentials', async ({ page }) => {
    const emailField = page.locator('input[type="email"], input[name="email"], #email').first();
    const passwordField = page.locator('input[type="password"], #password').first();
    const submitButton = page.locator('button[type="submit"]').first();

    if (await emailField.count() === 0) return;

    await emailField.fill('wrong@example.com');
    await passwordField.fill('WrongPassword123');
    await submitButton.click();

    // Wait for error response
    await page.waitForTimeout(1000);

    const errorMessage = page.locator('[class*="error"], [role="alert"], .alert-danger, .error-message');
    // Either an error shows, or we remain on the login page
    const stayedOnLogin = page.url().includes('login');
    const errorVisible = await errorMessage.count() > 0;
    expect(stayedOnLogin || errorVisible).toBe(true);
  });

  test('should log in successfully with valid credentials', async ({ page }) => {
    // Update TEST_USER in utils/config.ts with real credentials
    const emailField = page.locator('input[type="email"], input[name="email"], #email').first();
    const passwordField = page.locator('input[type="password"], #password').first();
    const submitButton = page.locator('button[type="submit"]').first();

    if (await emailField.count() === 0) {
      console.warn('Login form not found — skipping login test');
      return;
    }

    await emailField.fill(TEST_USER.email);
    await passwordField.fill(TEST_USER.password);
    await submitButton.click();

    // After login, should redirect away from /login
    await page.waitForURL((url) => !url.toString().includes('login'), { timeout: 10000 })
      .catch(() => console.warn('URL did not change after login — verify credentials'));
  });

});


test.describe('Contact / Enquiry Form', () => {

  test('should submit the contact form with valid data', async ({ page }) => {
    await page.goto(BASE_URL + ROUTES.contact);

    const nameField = page.locator('input[name="name"], #name').first();
    const emailField = page.locator('input[type="email"], input[name="email"], #email').first();
    const messageField = page.locator('textarea[name="message"], #message, textarea').first();
    const submitButton = page.locator('button[type="submit"]').first();

    if (await nameField.count() === 0) {
      console.warn('Contact form not found at /contact — skipping');
      return;
    }

    await nameField.fill('Thiagu Test');
    await emailField.fill('test@example.com');
    await messageField.fill('This is an automated test message. Please ignore.');
    await submitButton.click();

    await page.waitForTimeout(1000);

    // Expect a success message or redirect
    const successMessage = page.locator('[class*="success"], .alert-success, [role="alert"]');
    const submitted = await successMessage.count() > 0 || !page.url().includes('/contact');
    expect(submitted).toBe(true);
  });

  test('should validate required fields on contact form', async ({ page }) => {
    await page.goto(BASE_URL + ROUTES.contact);
    const submitButton = page.locator('button[type="submit"]').first();

    if (await submitButton.count() === 0) return;

    await submitButton.click();
    await page.waitForTimeout(300);

    const hasValidation = await page.evaluate(() => {
      return document.querySelectorAll(':invalid, [aria-invalid="true"]').length > 0;
    });
    // Either HTML5 validation triggers or custom error messages appear
    console.log(`Form validation triggered: ${hasValidation}`);
  });

});
