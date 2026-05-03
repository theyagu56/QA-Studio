#!/bin/bash
# ============================================================
#  run_tests.sh — One-command test runner
#  Usage: ./run_tests.sh [all|ui|api|headed|report]
# ============================================================

set -e  # Exit immediately on error

# ─── Colors ────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

MODE=${1:-all}

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Test Automation Tool — Playwright    ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ─── Check Node ────────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed.${NC}"
  echo "  Install it from: https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v)
echo -e "Node.js: ${GREEN}${NODE_VERSION}${NC}"

# ─── Install Dependencies ──────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
  echo -e "${YELLOW}Installing Playwright browsers...${NC}"
  npx playwright install chromium
fi

# ─── Run Tests ─────────────────────────────────────────────
echo ""
echo -e "Mode: ${YELLOW}${MODE}${NC}"
echo ""

case "$MODE" in
  all)
    echo -e "${GREEN}Running all tests...${NC}"
    npx playwright test
    ;;
  ui)
    echo -e "${GREEN}Running UI tests only...${NC}"
    npx playwright test tests/ui/
    ;;
  api)
    echo -e "${GREEN}Running API tests only...${NC}"
    npx playwright test tests/api/
    ;;
  headed)
    echo -e "${GREEN}Running tests in headed (visible browser) mode...${NC}"
    npx playwright test --headed
    ;;
  report)
    echo -e "${GREEN}Opening HTML report...${NC}"
    npx playwright show-report
    ;;
  debug)
    echo -e "${GREEN}Opening Playwright UI mode (interactive)...${NC}"
    npx playwright test --ui
    ;;
  *)
    echo -e "${RED}Unknown mode: ${MODE}${NC}"
    echo ""
    echo "Usage: ./run_tests.sh [mode]"
    echo ""
    echo "Modes:"
    echo "  all      Run all tests (default)"
    echo "  ui       Run only UI/browser tests"
    echo "  api      Run only API tests"
    echo "  headed   Run with visible browser"
    echo "  report   Open HTML report"
    echo "  debug    Open interactive Playwright UI"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}Done! Run './run_tests.sh report' to view the HTML report.${NC}"
echo ""
