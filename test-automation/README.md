# RO Test Automation

> A unified test automation platform built with **Playwright + TypeScript + Express.js**
> Combines a browser **Test Recorder** and a **Playwright Test Runner** in one web application.

---

## Suggested Application Names

Below are 10 professional name options for this unified platform, with descriptions:

| # | Name | Description |
|---|---|---|
| 1 | **TestForge** | A powerful tool that forges reliable, repeatable tests from real browser interactions — built for teams who ship fast and break nothing. |
| 2 | **QA Studio** | An all-in-one quality assurance workspace where you record, manage, and run browser tests without writing a single line of code. |
| 3 | **AutoPilot QA** | Put your testing on autopilot — record your browser actions once, and let AutoPilot replay, validate, and report every time. |
| 4 | **TestFlow** | A smooth, end-to-end testing workflow — from recording interactions and organizing test cases to running full suites with live results. |
| 5 | **Nexus QA** | The central hub that connects manual browser recording with automated test execution, giving your QA team one place to work from. |
| 6 | **TestCraft** | Craft precision tests by recording real user journeys, then enhance them with smart toolbox steps like assertions, waits, and conditionals. |
| 7 | **QA Workbench** | A professional-grade workbench for QA engineers — organize test suites, record scenarios, add toolbox steps, and run everything from a browser. |
| 8 | **TestLab** | Your personal testing laboratory — experiment, record, automate, and validate web application behavior in a clean, structured environment. |
| 9 | **Orbit QA** | Keeps your web application quality in orbit — continuously record, organize, and execute tests to catch issues before they reach production. |
| 10 | **TestPulse** | Monitor the pulse of your web application — record live user flows, run automated checks, and see real-time pass/fail results in a single dashboard. |

---

## What This Application Does

This platform merges two tools into one web interface running at `http://localhost:3333`:

### 🎬 Test Recorder (`/recorder`)
Record your browser actions step-by-step and replay them automatically.
- Click Record, browse your website, and every action is captured
- Organize recordings into Test Suites and Test Cases
- Drag-and-drop a Toolbox of ready-made steps (Wait, Assert Text, If Element Exists, etc.)
- Edit, reorder, and save steps after recording
- Replay a single test case or an entire suite

### 🧪 Automated Tests (`/playwright`)
Run pre-written Playwright TypeScript test suites against any website.
- Select individual spec files or run all at once
- Configure the target URL and headed/headless mode
- Watch live terminal output stream in real-time
- View pass ✓ / fail ✗ counts as tests execute
- Open the full HTML report after each run

---

## Quick Start

```bash
# 1. Go to the recorder-app folder
cd recorder-app

# 2. Install dependencies (first time only)
npm install
npx playwright install chromium

# 3. Start the server
node server.js

# 4. Open in browser
# http://localhost:3333
```

---

## Project Structure

```
RO_TEST AUTOMATION/
├── recorder-app/                   # Main web server (port 3333)
│   ├── server.js                   # Express server + all API routes
│   ├── recorder-engine.js          # Playwright-based browser recorder
│   ├── player-engine.js            # Step replay engine (15+ step types)
│   ├── test-data.json              # Saved test suites and test cases
│   └── public/
│       ├── home.html               # Home screen (choose your tool)
│       ├── index.html              # Test Recorder UI
│       └── playwright-runner.html  # Automated Test Runner UI
│
└── test-automation/                # Playwright TypeScript test suite
    ├── playwright.config.ts        # Playwright settings
    ├── utils/config.ts             # BASE_URL, credentials, routes
    ├── pages/BasePage.ts           # Page Object Model base class
    └── tests/
        ├── ui/
        │   ├── homepage.spec.ts    # Homepage load, title, images, mobile
        │   ├── navigation.spec.ts  # Back/forward, 404 handling
        │   └── forms.spec.ts       # Form interactions
        └── api/
            ├── health.spec.ts      # Server health and response time
            └── endpoints.spec.ts   # API endpoint validation
```

---

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/` | Home screen |
| GET | `/recorder` | Test Recorder app |
| GET | `/playwright` | Automated Test Runner |
| GET | `/api/suites` | List all test suites |
| POST | `/api/suites` | Create a new suite |
| GET | `/api/testcases/:id` | Get a test case with steps |
| PUT | `/api/testcases/:id/steps` | Save edited steps |
| POST | `/api/record/start` | Start browser recording |
| POST | `/api/record/stop` | Stop and save recording |
| GET | `/api/playwright/specs` | List all spec files |
| GET | `/api/playwright/run` | Run tests (SSE live stream) |

---

## Configuration

To change the target website for automated tests, edit `test-automation/utils/config.ts`:

```ts
export const BASE_URL = 'https://yourwebsite.com';  // ← your site
export const TEST_USER = {
  email: 'testuser@example.com',
  password: 'Test@1234',
};
```

Or set it directly from the Automated Tests UI without editing any file.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Browser Automation | Playwright |
| Test Language | TypeScript |
| Backend Server | Node.js + Express.js |
| Test Recording | Playwright `exposeFunction` + `addInitScript` |
| Live Output Streaming | Server-Sent Events (SSE) |
| Data Storage | JSON file (`test-data.json`) |
| UI Theme | Dark GitHub-inspired design |

---

## Full Documentation

See `Test_Automation_Architecture.docx` in the root folder for the full architecture document.
