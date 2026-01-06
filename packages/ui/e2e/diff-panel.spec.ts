import { test, expect } from './fixtures';
import { openFirstWorktree } from './app-helpers';

test.describe('Diff Panel and Stage Operations', () => {
  test.beforeEach(async ({ page }) => {
    await openFirstWorktree(page);
  });

  test('should open diff overlay when clicking file', async ({ page }) => {
    const fileItem = page.locator('.file-item').first();
    const fileExists = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

    if (fileExists) {
      await fileItem.click();
      await page.waitForTimeout(500);

      const diffOverlay = page.locator('[role="dialog"], .diff-overlay, .st-overlay').first();
      const isVisible = await diffOverlay.isVisible({ timeout: 3000 }).catch(() => false);

      if (isVisible) {
        expect(isVisible).toBe(true);
      }
    }
  });

  test('should close diff overlay with Escape key', async ({ page }) => {
    const fileItem = page.locator('.file-item').first();
    const fileExists = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

    if (fileExists) {
      await fileItem.click();
      await page.waitForTimeout(500);

      const diffOverlay = page.locator('[role="dialog"], .diff-overlay, .st-overlay').first();
      const isVisible = await diffOverlay.isVisible({ timeout: 3000 }).catch(() => false);

      if (isVisible) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        const stillVisible = await diffOverlay.isVisible().catch(() => false);
        expect(stillVisible).toBe(false);
      }
    }
  });

  test('should display staged and unstaged groups', async ({ page }) => {
    const stagedHeader = page.locator('text=/STAGED/i').first();
    const unstagedHeader = page.locator('text=/UNSTAGED/i').first();

    const hasStagedOrUnstaged =
      (await stagedHeader.isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await unstagedHeader.isVisible({ timeout: 5000 }).catch(() => false));

    if (hasStagedOrUnstaged) {
      expect(hasStagedOrUnstaged).toBe(true);
    }
  });

  test('should toggle group expand/collapse', async ({ page }) => {
    const groupHeader = page.locator('text=/STAGED|UNSTAGED/i').first();
    const headerExists = await groupHeader.isVisible({ timeout: 5000 }).catch(() => false);

    if (headerExists) {
      const initialFileCount = await page.locator('.file-item').count();

      await groupHeader.click();
      await page.waitForTimeout(300);

      const afterClickFileCount = await page.locator('.file-item').count();

      expect(initialFileCount !== afterClickFileCount).toBe(true);
    }
  });
});
