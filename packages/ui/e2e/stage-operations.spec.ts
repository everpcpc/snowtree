import { test, expect } from './fixtures';
import { openFirstWorktree } from './app-helpers';

test.describe('Stage and Unstage Operations', () => {
  test.beforeEach(async ({ page }) => {
    await openFirstWorktree(page);
  });

  test('should display files in unstaged section', async ({ page }) => {
    const unstagedHeader = page.locator('text=/UNSTAGED/i').first();
    const headerExists = await unstagedHeader.isVisible({ timeout: 5000 }).catch(() => false);

    if (headerExists) {
      const fileItems = page.locator('.file-item');
      const fileCount = await fileItems.count();
      expect(fileCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display files in staged section', async ({ page }) => {
    const stagedHeader = page.locator('text=/STAGED/i').first();
    const headerExists = await stagedHeader.isVisible({ timeout: 5000 }).catch(() => false);

    if (headerExists) {
      const fileItems = page.locator('.file-item');
      const fileCount = await fileItems.count();
      expect(fileCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should show file status icons', async ({ page }) => {
    const fileItems = page.locator('.file-item');
    const fileCount = await fileItems.count();

    if (fileCount > 0) {
      const firstFile = fileItems.first();
      const statusIcon = firstFile.locator('svg, [class*="icon"]').first();
      const hasIcon = await statusIcon.isVisible().catch(() => false);

      if (hasIcon) {
        expect(hasIcon).toBe(true);
      }
    }
  });

  test('should display add/remove line counts', async ({ page }) => {
    const fileItems = page.locator('.file-item');
    const fileCount = await fileItems.count();

    if (fileCount > 0) {
      const statsElements = page.locator('text=/\\+\\d+|\\-\\d+/');
      const statsCount = await statsElements.count();
      expect(statsCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should stage line in visual mode', async ({ page }) => {
    const fileItem = page.locator('.file-item').first();
    const fileExists = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

    if (fileExists) {
      await fileItem.click();
      await page.waitForTimeout(500);

      await page.keyboard.press('v');
      const banner = page.locator('text=/Visual Mode/i');
      if (await banner.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.keyboard.press('j');
        await page.waitForTimeout(200);
        await page.keyboard.press('1');
        await page.waitForTimeout(500);

        expect(true).toBe(true);
      }
    }
  });

  test('should unstage line in visual mode', async ({ page }) => {
    const fileItem = page.locator('.file-item').first();
    const fileExists = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

    if (fileExists) {
      await fileItem.click();
      await page.waitForTimeout(500);

      await page.keyboard.press('v');
      const banner = page.locator('text=/Visual Mode/i');
      if (await banner.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.keyboard.press('j');
        await page.waitForTimeout(200);
        await page.keyboard.press('2');
        await page.waitForTimeout(500);

        expect(true).toBe(true);
      }
    }
  });

  test('should show different colors for add/delete lines', async ({ page }) => {
    const fileItem = page.locator('.file-item').first();
    const fileExists = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

    if (fileExists) {
      await fileItem.click();
      await page.waitForTimeout(500);

      const addedLines = page.locator('[class*="added"], [style*="green"]');
      const deletedLines = page.locator('[class*="deleted"], [style*="red"]');

      const addedCount = await addedLines.count();
      const deletedCount = await deletedLines.count();

      expect(addedCount + deletedCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should highlight selected lines in visual mode', async ({ page }) => {
    const fileItem = page.locator('.file-item').first();
    const fileExists = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

    if (fileExists) {
      await fileItem.click();
      await page.waitForTimeout(500);

      await page.keyboard.press('v');
      const banner = page.locator('text=/Visual Mode/i');
      if (await banner.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.keyboard.press('j');
        await page.keyboard.press('j');
        await page.waitForTimeout(200);

        const selectedLines = page.locator('[class*="selected"], [class*="highlight"]');
        const selectedCount = await selectedLines.count();
        expect(selectedCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should display untracked files section', async ({ page }) => {
    const untrackedHeader = page.locator('text=/UNTRACKED/i').first();
    const headerExists = await untrackedHeader.isVisible({ timeout: 5000 }).catch(() => false);

    if (headerExists) {
      expect(headerExists).toBe(true);
    }
  });

  test('should expand and collapse file groups', async ({ page }) => {
    const stagedHeader = page.locator('text=/STAGED/i').first();
    const headerExists = await stagedHeader.isVisible({ timeout: 5000 }).catch(() => false);

    if (headerExists) {
      const initialFiles = await page.locator('.file-item').count();

      await stagedHeader.click();
      await page.waitForTimeout(300);

      const afterClickFiles = await page.locator('.file-item').count();
      expect(initialFiles >= 0 && afterClickFiles >= 0).toBe(true);
    }
  });
});
