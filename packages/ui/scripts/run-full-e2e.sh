#!/bin/bash

set -e

echo "=== Snowtree E2E Full Test Setup ==="
echo ""

cd "$(dirname "$0")/.."

echo "[1/4] Creating test repository..."
node scripts/setup-e2e-repo.mjs

echo ""
echo "[2/4] Test repository created at: $(pwd)/.e2e-test-repo"
echo "Database entry added to: ~/.snowtree_dev/sessions.db"
echo ""

echo "[3/4] Instructions to run full E2E tests:"
echo ""
echo "  1. Start the Electron app in another terminal:"
echo "     cd /Users/bohu/github/datafuselabs/snowtree && pnpm dev"
echo ""
echo "  2. In the app UI, verify the 'E2E Test Repository' appears in the Workspaces panel"
echo "     (It should load automatically from the database)"
echo ""
echo "  3. If it doesn't appear, manually add it:"
echo "     - Click 'Add Repository'"
echo "     - Select: $(pwd)/.e2e-test-repo"
echo ""
echo "  4. Run the E2E tests:"
echo "     cd $(pwd) && pnpm test:e2e"
echo ""
echo "[4/4] Expected result: All 116 tests should execute (not skip)"
echo ""
echo "=== Setup Complete ==="
echo ""
echo "Ready to run tests! Follow the instructions above."
