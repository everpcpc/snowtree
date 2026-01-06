import { test, expect } from './fixtures';

test.describe('Debug API Calls', () => {
  test('should call openWorktree and set active session', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Workspaces', { timeout: 10000 });

    // Intercept console messages
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    // Call openWorktree directly
    const result = await page.evaluate(async () => {
      console.log('[Test] Calling openWorktree...');
      const res = await (window as any).electronAPI.sessions.openWorktree({
        projectId: 1,
        worktreePath: '/mock/repo/path',
        branch: 'main'
      });
      console.log('[Test] openWorktree result:', res);
      return res;
    });

    console.log('[Test Result]:', result);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.id).toBeDefined();

    // Wait for session to be added to store
    await page.waitForTimeout(1000);

    // Check if activeSessionId is set
    const storeState = await page.evaluate(() => {
      const store = (window as any).__sessionStore;
      if (!store) {
        console.log('[Test] Store not found on window');
        return null;
      }
      const state = store.getState();
      console.log('[Test] Zustand store state:', {
        sessionsCount: state.sessions.length,
        activeSessionId: state.activeSessionId,
        isLoaded: state.isLoaded
      });
      return state;
    });

    console.log('[Test] Store state:', storeState);
    expect(storeState).not.toBeNull();
    expect(storeState.activeSessionId).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: 'test-results/debug-after-api-call.png' });
  });
});
