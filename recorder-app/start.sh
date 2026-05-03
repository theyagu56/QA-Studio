#!/bin/bash
# ─────────────────────────────────────────────
#  Start the Test Recorder App
# ─────────────────────────────────────────────

cd "$(dirname "$0")"

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Installing Playwright browser..."
npx playwright install chromium

echo ""
node server.js
