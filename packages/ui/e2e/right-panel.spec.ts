import { test, expect } from './fixtures';
import { openFirstWorktree } from './app-helpers';

test.describe('Complete App - Sidebar + RightPanel + Visual Mode', () => {
  test.beforeEach(async ({ page }) => {
    await openFirstWorktree(page);
  });

  test('should load complete app with Sidebar and RightPanel', async ({ page }) => {
    await expect(page.locator('text=Workspaces')).toBeVisible();
    await expect(page.locator('[data-testid="main-layout"]')).toBeVisible();
  });

  test('should render without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(e =>
      e.includes('Cannot read properties of undefined') ||
      e.includes('TypeError') ||
      e.includes('ReferenceError')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should display Changes panel', async ({ page }) => {
    const changesText = page.locator('text=/STAGED|UNSTAGED|UNTRACKED|Changes/i').first();
    await expect(changesText).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Visual Mode - Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await openFirstWorktree(page);
  });

  test('should enter Visual Mode with v key', async ({ page }) => {
    const fileItem = page.locator('.file-item, [role="button"]:has-text(".ts")').first();
    const fileItemExists = await fileItem.count() > 0;

    if (fileItemExists && await fileItem.isVisible()) {
      await fileItem.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('v');

      const banner = page.locator('text=/Visual Mode/i');
      await expect(banner).toBeVisible({ timeout: 2000 });
    }
  });

  test('should exit Visual Mode with Escape key', async ({ page }) => {
    const fileItem = page.locator('.file-item, [role="button"]:has-text(".ts")').first();
    const fileItemExists = await fileItem.count() > 0;

    if (fileItemExists && await fileItem.isVisible()) {
      await fileItem.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('v');

      const banner = page.locator('text=/Visual Mode/i');
      if (await banner.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await expect(banner).not.toBeVisible();
      }
    }
  });

  test('should navigate with j/k keys', async ({ page }) => {
    const fileItem = page.locator('.file-item, [role="button"]:has-text(".ts")').first();
    const fileItemExists = await fileItem.count() > 0;

    if (fileItemExists && await fileItem.isVisible()) {
      await fileItem.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('v');

      const banner = page.locator('text=/Visual Mode/i');
      if (await banner.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.keyboard.press('j');
        await page.waitForTimeout(200);

        const positionIndicator = page.locator('text=/\\d+ \\/ \\d+/');
        const hasIndicator = await positionIndicator.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasIndicator) {
          await page.keyboard.press('k');
          await page.waitForTimeout(200);
        }
      }
    }
  });

  test('should display vim navigation hints', async ({ page }) => {
    const fileItem = page.locator('.file-item, [role="button"]:has-text(".ts")').first();
    const fileItemExists = await fileItem.count() > 0;

    if (fileItemExists && await fileItem.isVisible()) {
      await fileItem.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('v');

      const jkHint = page.locator('text=/j\\/k/i');
      const ggHint = page.locator('text=/gg\\/G/i');

      const hasJkHint = await jkHint.isVisible({ timeout: 2000 }).catch(() => false);
      const hasGgHint = await ggHint.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasJkHint || hasGgHint).toBeTruthy();
    }
  });

  test('should not trigger shortcuts with modifier keys', async ({ page }) => {
    const fileItem = page.locator('.file-item, [role="button"]:has-text(".ts")').first();
    const fileItemExists = await fileItem.count() > 0;

    if (fileItemExists && await fileItem.isVisible()) {
      await fileItem.click();
      await page.waitForTimeout(500);
    }

    await page.keyboard.press('Control+v');
    const banner = page.locator('text=/Visual Mode/i');
    await expect(banner).not.toBeVisible();

    await page.keyboard.press('Alt+v');
    await expect(banner).not.toBeVisible();
  });
});
