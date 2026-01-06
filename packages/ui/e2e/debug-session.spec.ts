import { test, expect } from './fixtures';

test.describe('Debug Session Creation', () => {
  test('should create session when clicking worktree button', async ({ page }) => {
    // Set up console listener BEFORE navigation
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(text);
      console.log(`[Browser Console] ${text}`);
    });

    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Workspaces', { timeout: 10000 });

    // Take screenshot before click
    await page.screenshot({ path: 'test-results/debug-before-click.png' });

    // Find worktree buttons (they're nested inside st-tree-card, not direct children)
    // First button in each st-tree-card is the project header, subsequent ones are worktrees
    const worktreeButton = page.locator('.st-tree-card [role="button"]').nth(1); // Second button = first worktree
    const buttonVisible = await worktreeButton.isVisible({ timeout: 5000 }).catch(() => false);

    console.log('[Debug] Worktree button visible:', buttonVisible);

    if (!buttonVisible) {
      // Try to find any button-like element
      const allButtons = await page.locator('.st-tree-card [role="button"]').count();
      console.log('[Debug] Total st-tree-card buttons found:', allButtons);

      // List all buttons
      for (let i = 0; i < Math.min(allButtons, 5); i++) {
        const text = await page.locator('.st-tree-card [role="button"]').nth(i).textContent();
        const classes = await page.locator('.st-tree-card [role="button"]').nth(i).getAttribute('class');
        console.log(`[Debug] Button ${i}:`, text?.substring(0, 50), 'classes:', classes);
      }
    }

    expect(buttonVisible).toBe(true);

    // Track if openWorktree was called
    await page.evaluate(() => {
      const originalOpen = (window as any).electronAPI.sessions.openWorktree;
      (window as any).electronAPI.sessions.openWorktree = async (...args: any[]) => {
        console.log('[Debug] openWorktree called with:', args);
        const result = await originalOpen(...args);
        console.log('[Debug] openWorktree returned:', result);
        return result;
      };
    });

    // Click the button
    await worktreeButton.click();
    console.log('[Debug] Clicked worktree button');

    // Wait for store to update
    await page.waitForTimeout(1000);

    // Check store state
    const storeState = await page.evaluate(() => {
      const store = (window as any).__sessionStore;
      if (store) {
        const state = store.getState();
        console.log('[Debug] Store state after click:', {
          sessionsCount: state.sessions.length,
          activeSessionId: state.activeSessionId,
        });
        return state;
      }
      return null;
    });
    console.log('[Debug] Store has activeSessionId:', !!storeState?.activeSessionId);

    // Take screenshot after click
    await page.screenshot({ path: 'test-results/debug-after-click.png' });

    // Wait longer for React to re-render
    await page.waitForTimeout(2000);

    // Check if main-layout appears
    const mainLayoutCount = await page.locator('[data-testid="main-layout"]').count();
    console.log('[Debug] Main layout count:', mainLayoutCount);

    const mainLayoutVisible = await page.locator('[data-testid="main-layout"]').isVisible({ timeout: 10000 }).catch(() => false);
    console.log('[Debug] Main layout visible:', mainLayoutVisible);

    if (mainLayoutCount > 0 && !mainLayoutVisible) {
      const styles = await page.locator('[data-testid="main-layout"]').evaluate(el => ({
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility,
        opacity: window.getComputedStyle(el).opacity,
      }));
      console.log('[Debug] Main layout styles:', styles);
    }

    // Print console messages
    console.log('[Debug] Console messages captured:', consoleMessages.length);
    consoleMessages.slice(-20).forEach(msg => console.log('[Debug]', msg));

    expect(mainLayoutVisible).toBe(true);
  });
});
