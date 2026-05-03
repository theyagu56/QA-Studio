import { Page, Locator, expect } from '@playwright/test';
import { BASE_URL } from '../utils/config';

/**
 * BasePage — Page Object Model base class
 * -----------------------------------------------------------
 * All page classes should extend this. It provides shared helpers
 * for navigation, waiting, visibility checks, and screenshot capture.
 *
 * Usage:
 *   import { LoginPage } from './LoginPage';
 *   const loginPage = new LoginPage(page);
 *   await loginPage.goto();
 *   await loginPage.login('user@example.com', 'password');
 */
export class BasePage {
  protected readonly page: Page;
  protected readonly baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = BASE_URL;
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  /** Navigate to a path relative to the base URL */
  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(`${this.baseURL}${path}`);
    await this.waitForPageLoad();
  }

  /** Wait until network is idle (page fully loaded) */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Reload the current page */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  // ─── Element Interactions ───────────────────────────────────────────────────

  /** Click an element by CSS selector */
  async clickBySelector(selector: string): Promise<void> {
    await this.page.locator(selector).click();
  }

  /** Fill a text field by CSS selector */
  async fillBySelector(selector: string, value: string): Promise<void> {
    await this.page.locator(selector).clear();
    await this.page.locator(selector).fill(value);
  }

  /** Get text content of an element */
  async getText(selector: string): Promise<string | null> {
    return await this.page.locator(selector).textContent();
  }

  /** Check if an element is visible on the page */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isVisible();
  }

  // ─── Assertions ─────────────────────────────────────────────────────────────

  /** Assert the current URL contains a path */
  async assertURL(pathOrPattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pathOrPattern);
  }

  /** Assert the page title matches */
  async assertTitle(titleOrPattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(titleOrPattern);
  }

  /** Assert an element is visible */
  async assertVisible(selector: string, message?: string): Promise<void> {
    await expect(this.page.locator(selector), message).toBeVisible();
  }

  /** Assert an element contains expected text */
  async assertText(selector: string, text: string | RegExp): Promise<void> {
    await expect(this.page.locator(selector)).toContainText(text);
  }

  /** Assert an element is NOT visible */
  async assertNotVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).not.toBeVisible();
  }

  // ─── Utilities ──────────────────────────────────────────────────────────────

  /** Take a screenshot and save it */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
  }

  /** Get the current page URL */
  getCurrentURL(): string {
    return this.page.url();
  }

  /** Wait for a specific element to appear */
  async waitForElement(selector: string, timeout = 10000): Promise<Locator> {
    const locator = this.page.locator(selector);
    await locator.waitFor({ state: 'visible', timeout });
    return locator;
  }

  /** Wait for a toast / notification message */
  async waitForToast(selector: string = '.toast, [role="alert"]'): Promise<string | null> {
    const toast = this.page.locator(selector);
    await toast.waitFor({ state: 'visible', timeout: 5000 });
    return await toast.textContent();
  }
}
