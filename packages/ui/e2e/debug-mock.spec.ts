import { test, expect } from './fixtures';

test.describe('Debug Mock electronAPI', () => {
  test('should have electronAPI defined', async ({ page }) => {
    await page.goto('http://localhost:4521');

    const hasAPI = await page.evaluate(() => {
      return typeof (window as any).electronAPI !== 'undefined';
    });

    console.log('[Debug] electronAPI exists:', hasAPI);
    expect(hasAPI).toBe(true);
  });

  test('should return projects from mock', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');

    const projects = await page.evaluate(async () => {
      const result = await (window as any).electronAPI.projects.getAll();
      console.log('[Debug] Projects result:', result);
      return result;
    });

    console.log('[Debug] Projects from mock:', projects);
    expect(projects.success).toBe(true);
    expect(projects.data).toBeDefined();
  });

  test('should display Workspaces title', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');

    const workspacesText = await page.locator('text=Workspaces').isVisible({ timeout: 10000 }).catch(() => false);
    console.log('[Debug] Workspaces visible:', workspacesText);

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/debug-workspaces.png' });

    expect(workspacesText).toBe(true);
  });
});
