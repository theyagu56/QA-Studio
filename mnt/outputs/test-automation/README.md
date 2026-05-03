# Test Automation Tool

Web test automation using **Playwright + TypeScript**.
Covers: **UI/E2E tests** + **REST API tests** — runs against any website.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install chromium

# 3. Set your website URL (default: http://localhost:3000)
#    Edit utils/config.ts → change BASE_URL

# 4. Run all tests
./run_tests.sh
```

---

## Commands

| Command | What it does |
|---|---|
| `./run_tests.sh` | Run all tests |
| `./run_tests.sh ui` | Run only UI tests |
| `./run_tests.sh api` | Run only API tests |
| `./run_tests.sh headed` | Run with visible browser |
| `./run_tests.sh report` | Open HTML report |
| `./run_tests.sh debug` | Interactive test UI |

---

## Project Structure

```
test-automation/
├── playwright.config.ts     # Playwright settings
├── utils/config.ts          # BASE_URL, credentials, routes
├── pages/BasePage.ts        # Page Object Model base class
├── tests/
│   ├── ui/
│   │   ├── homepage.spec.ts
│   │   ├── navigation.spec.ts
│   │   └── forms.spec.ts
│   └── api/
│       ├── health.spec.ts
│       └── endpoints.spec.ts
└── test-results/            # Auto-generated reports
```

---

## Configuration

Edit `utils/config.ts`:

```ts
export const BASE_URL = 'http://localhost:3000';  // ← your site
export const TEST_USER = {
  email: 'testuser@example.com',
  password: 'Test@1234',
};
```

---

## Full documentation: `Test_Automation_Architecture.docx`
