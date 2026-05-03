/**
 * Player Engine
 * Replays one or more test cases sequentially in a visible browser.
 * Supports both recorded steps AND toolbox steps.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

// Ensure screenshots folder exists
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR);

class PlayerEngine {

  async play(testCases) {
    const browser = await chromium.launch({ headless: false, slowMo: 200, args: ['--start-maximized'] });
    const context = await browser.newContext({ viewport: null });
    let page      = await context.newPage();

    for (const tc of testCases) {
      console.log(`\n${'─'.repeat(55)}`);
      console.log(`  ▶  Test Case : ${tc.name}`);
      console.log(`  Steps        : ${tc.steps.length}`);
      console.log('─'.repeat(55));

      let passed = 0, failed = 0;

      for (let i = 0; i < tc.steps.length; i++) {
        const step  = tc.steps[i];
        const label = step.label || step.selector || step.url || step.text || step.key || '';
        console.log(`  [${String(i+1).padStart(2)}/${tc.steps.length}] ${step.type.toUpperCase().padEnd(16)} ${String(label).substring(0, 50)}`);

        try {
          await this._runStep(page, step);
          passed++;
          await page.waitForTimeout(300);
        } catch (err) {
          failed++;
          console.error(`        ✗ ${err.message.split('\n')[0]}`);
        }
      }

      console.log(`\n  Result → ✓ ${passed} passed   ✗ ${failed} failed`);

      if (testCases.length > 1) {
        console.log('  ⏳ Next test case in 2s...');
        await page.waitForTimeout(2000);
      }
    }

    console.log(`\n${'═'.repeat(55)}`);
    console.log(`  ✅  All ${testCases.length} test case(s) complete.`);
    console.log(`  Closing in 5 seconds...`);
    console.log('═'.repeat(55));
    await page.waitForTimeout(5000);
    await browser.close();
  }

  async _runStep(page, step) {
    switch (step.type) {

      // ── Recorded steps ───────────────────────────────────────────────────
      case 'goto':
        await page.goto(step.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        break;

      case 'click':
        await page.locator(step.selector).first().click({ timeout: 15000 });
        break;

      case 'fill':
        await page.locator(step.selector).first().click({ timeout: 10000 });
        await page.locator(step.selector).first().fill(step.value, { timeout: 10000 });
        break;

      case 'selectOption':
        await page.locator(step.selector).first().selectOption(step.value, { timeout: 10000 });
        break;

      case 'check':
        await page.locator(step.selector).first().check({ timeout: 10000 });
        break;

      case 'uncheck':
        await page.locator(step.selector).first().uncheck({ timeout: 10000 });
        break;

      // ── Toolbox: Timing ──────────────────────────────────────────────────
      case 'wait':
        // Wait for N seconds
        await page.waitForTimeout((Number(step.seconds) || 3) * 1000);
        break;

      case 'waitForElement':
        // Wait until an element appears on screen
        await page.waitForSelector(step.selector, {
          state: 'visible',
          timeout: (Number(step.timeout) || 10) * 1000
        });
        break;

      // ── Toolbox: Assertions ──────────────────────────────────────────────
      case 'assertText': {
        const { expect } = require('@playwright/test');
        await expect(page.locator(step.selector).first()).toContainText(step.text, { timeout: 10000 });
        break;
      }

      case 'assertVisible': {
        const { expect } = require('@playwright/test');
        await expect(page.locator(step.selector).first()).toBeVisible({ timeout: 10000 });
        break;
      }

      case 'assertNotVisible': {
        const { expect } = require('@playwright/test');
        await expect(page.locator(step.selector).first()).not.toBeVisible({ timeout: 10000 });
        break;
      }

      case 'assertURL':
        if (!page.url().includes(step.url)) {
          throw new Error(`URL assertion failed. Expected to contain "${step.url}", got "${page.url()}"`);
        }
        break;

      case 'assertTitle': {
        const title = await page.title();
        if (!title.toLowerCase().includes((step.text || '').toLowerCase())) {
          throw new Error(`Title assertion failed. Expected to contain "${step.text}", got "${title}"`);
        }
        break;
      }

      // ── Toolbox: Actions ─────────────────────────────────────────────────
      case 'scroll':
        await page.locator(step.selector).first().scrollIntoViewIfNeeded({ timeout: 10000 });
        break;

      case 'hover':
        await page.locator(step.selector).first().hover({ timeout: 10000 });
        break;

      case 'pressKey':
        await page.keyboard.press(step.key || 'Enter');
        break;

      case 'clearField':
        await page.locator(step.selector).first().clear({ timeout: 10000 });
        break;

      case 'screenshot': {
        const name = (step.name || `step_${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
        const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
        await page.screenshot({ path: filePath, fullPage: false });
        console.log(`        📷 Saved: ${filePath}`);
        break;
      }

      case 'scrollPage':
        await page.evaluate((dir) => {
          window.scrollBy(0, dir === 'down' ? window.innerHeight : -window.innerHeight);
        }, step.direction || 'down');
        break;

      // ── Toolbox: Conditional ─────────────────────────────────────────────
      case 'ifExists': {
        const count = await page.locator(step.selector).count();
        if (count > 0) {
          if (step.action === 'click')  await page.locator(step.selector).first().click({ timeout: 10000 });
          if (step.action === 'fill')   await page.locator(step.selector).first().fill(step.value || '', { timeout: 10000 });
          if (step.action === 'check')  await page.locator(step.selector).first().check({ timeout: 10000 });
          console.log(`        ✓ Element found — action "${step.action}" performed`);
        } else {
          console.log(`        ℹ Element not found — step skipped`);
        }
        break;
      }

      case 'ifNotExists': {
        const count2 = await page.locator(step.selector).count();
        if (count2 === 0) {
          console.log(`        ✓ Element absent (as expected)`);
        } else {
          throw new Error(`Element "${step.selector}" was expected to be absent but was found.`);
        }
        break;
      }

      default:
        console.warn(`        ⚠ Unknown step type: "${step.type}" — skipped`);
    }
  }
}

module.exports = { PlayerEngine };
