/**
 * Recorder Engine
 * ------------------------------------------------------
 * Launches a real Chrome browser, injects event listeners
 * into every page, and captures clicks / fills / selects /
 * navigation as structured steps.
 */

const { chromium } = require('playwright');

class RecorderEngine {
  constructor(onStep) {
    this.browser  = null;
    this.context  = null;
    this.page     = null;
    this.steps    = [];
    this.isPaused = false;
    this.onStep   = onStep || (() => {}); // callback for live UI updates
    this._fillTimers = {};
    this._lastUrl = null;
  }

  async start(startUrl) {
    this.browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized'],
    });

    this.context = await this.browser.newContext({
      viewport: null, // Use full screen size
    });

    // ── Expose a function the injected script can call ──────────────────
    await this.context.exposeFunction('__recordStep', (step) => {
      if (this.isPaused) return;
      this._addStep(step);
    });

    // ── Inject recorder script into EVERY page & frame ──────────────────
    await this.context.addInitScript(() => {
      // ── Helpers ─────────────────────────────────────────────────────
      function getBestSelector(el) {
        if (!el || el === document.body) return 'body';

        // 1. ID
        if (el.id && !/^\d/.test(el.id)) return `#${el.id}`;

        // 2. data-testid / data-cy / data-qa
        for (const attr of ['data-testid', 'data-cy', 'data-qa', 'data-id']) {
          const val = el.getAttribute(attr);
          if (val) return `[${attr}="${val}"]`;
        }

        // 3. aria-label
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) return `[aria-label="${ariaLabel}"]`;

        // 4. name (for inputs/selects)
        if (el.name) return `[name="${el.name}"]`;

        // 5. placeholder (for inputs)
        const ph = el.getAttribute('placeholder');
        if (ph) return `[placeholder="${ph}"]`;

        // 6. button / link text
        const tag = el.tagName.toLowerCase();
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 40);
        if ((tag === 'button' || tag === 'a') && text) {
          return `${tag}:has-text("${text}")`;
        }

        // 7. type + value for submit buttons
        if (tag === 'input' && el.type === 'submit' && el.value) {
          return `input[type="submit"][value="${el.value}"]`;
        }

        // 8. class-based fallback
        const cls = Array.from(el.classList)
          .filter(c => c && !/^\d/.test(c))
          .slice(0, 2)
          .map(c => `.${CSS.escape(c)}`)
          .join('');
        if (cls) return `${tag}${cls}`;

        return tag;
      }

      function getNearestInteractive(el) {
        const INTERACTIVE = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'SUMMARY'];
        let node = el;
        while (node && node !== document.body) {
          if (INTERACTIVE.includes(node.tagName)) return node;
          if (node.getAttribute('role') === 'button') return node;
          if (node.getAttribute('onclick')) return node;
          node = node.parentElement;
        }
        return el;
      }

      // ── Click ────────────────────────────────────────────────────────
      document.addEventListener('click', (e) => {
        const el    = getNearestInteractive(e.target);
        const tag   = el.tagName.toLowerCase();

        // Skip inputs — those are captured by fill/change events
        if (tag === 'input' && ['text','email','password','number','search','tel','url'].includes(el.type)) return;
        if (tag === 'textarea' || tag === 'select') return;

        const selector = getBestSelector(el);
        const label    = (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().substring(0, 60);

        window.__recordStep({
          type: 'click',
          selector,
          label,
          timestamp: Date.now(),
        });
      }, true);

      // ── Fill (debounced — captures final typed value) ─────────────────
      const _fillTimers = {};
      document.addEventListener('input', (e) => {
        const el = e.target;
        if (!['INPUT', 'TEXTAREA'].includes(el.tagName)) return;
        if (el.type === 'file') return;

        const selector = getBestSelector(el);
        clearTimeout(_fillTimers[selector]);
        _fillTimers[selector] = setTimeout(() => {
          window.__recordStep({
            type: 'fill',
            selector,
            value: el.value,
            label: el.getAttribute('placeholder') || el.name || el.id || '',
            timestamp: Date.now(),
          });
        }, 800); // 800ms after user stops typing
      }, true);

      // ── Select / Dropdown ─────────────────────────────────────────────
      document.addEventListener('change', (e) => {
        const el = e.target;
        if (el.tagName !== 'SELECT') return;
        const selector = getBestSelector(el);
        const selectedOption = el.options[el.selectedIndex];
        window.__recordStep({
          type: 'selectOption',
          selector,
          value: el.value,
          label: selectedOption ? selectedOption.text : el.value,
          timestamp: Date.now(),
        });
      }, true);

      // ── Checkbox / Radio ──────────────────────────────────────────────
      document.addEventListener('change', (e) => {
        const el = e.target;
        if (!['checkbox', 'radio'].includes(el.type)) return;
        const selector = getBestSelector(el);
        window.__recordStep({
          type: el.checked ? 'check' : 'uncheck',
          selector,
          label: el.getAttribute('aria-label') || el.name || el.id || '',
          timestamp: Date.now(),
        });
      }, true);
    });

    // ── Track navigation (URL changes) ──────────────────────────────────
    this.page = await this.context.newPage();

    this.page.on('framenavigated', (frame) => {
      if (frame !== this.page.mainFrame()) return;
      const url = frame.url();
      if (!url || url === 'about:blank' || url === this._lastUrl) return;
      this._lastUrl = url;
      this._addStep({ type: 'goto', url, label: url, timestamp: Date.now() });
    });

    // Handle new tabs/popups
    this.context.on('page', (newPage) => {
      newPage.on('framenavigated', (frame) => {
        if (frame !== newPage.mainFrame()) return;
        const url = frame.url();
        if (!url || url === 'about:blank') return;
        this._addStep({ type: 'goto', url, label: url, timestamp: Date.now() });
      });
    });

    // Navigate to start URL
    if (startUrl && startUrl !== 'about:blank') {
      await this.page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
  }

  _addStep(step) {
    // Deduplicate: skip consecutive identical clicks
    const last = this.steps[this.steps.length - 1];
    if (last && last.type === step.type && last.selector === step.selector && last.type === 'click') {
      const timeDiff = step.timestamp - last.timestamp;
      if (timeDiff < 300) return; // double-click protection
    }

    // For fill: replace previous fill on same selector instead of duplicating
    if (step.type === 'fill') {
      const idx = this.steps.map(s => s.selector).lastIndexOf(step.selector);
      if (idx !== -1 && this.steps[idx].type === 'fill') {
        this.steps[idx] = step;
        this.onStep(this.steps);
        return;
      }
    }

    this.steps.push(step);
    this.onStep(this.steps);
  }

  pause()  { this.isPaused = true;  }
  resume() { this.isPaused = false; }

  async stop() {
    const steps = [...this.steps];
    try {
      if (this.browser) await this.browser.close();
    } catch (_) {}
    this.browser = null;
    this.context = null;
    this.page    = null;
    return steps;
  }
}

module.exports = { RecorderEngine };
