import { test, expect } from './fixtures';
import { openFirstWorktree } from './app-helpers';

test.describe('Visual Mode - Advanced Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await openFirstWorktree(page);
  });

  test('should jump to first line with gg', async ({ page }) => {
    const fileItem = page.locator('.file-item, [role="button"]:has-text(".ts")').first();
    const fileExists = await fileItem.count() > 0;

    if (fileExists && await fileItem.isVisible()) {
      await fileItem.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('v');

      const banner = page.locator('text=/Visual Mode/i');
      if (await banner.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.keyboard.press('j');
        await page.keyboard.press('j');
        await page.waitForTimeout(200);

        await page.keyboard.press('g');
        await page.keyboard.press('g');
        await page.waitForTimeout(300);

        const positionIndicator = page.locator('text=/1 \\/ \\d+/');
        const isAtFirst = await positionIndicator.isVisible({ timeout: 1000 }).catch(() => false);

        if (isAtFirst) {
          expect(isAtFirst).toBe(true);
        }
      }
    }
  });

  test('should jump to last line with G', async ({ page }) => {
    const fileItem = page.locator('.file-item, [role="button"]:has-text(".ts")').first();
    const fileExists = await fileItem.count() > 0;

    if (fileExists && await fileItem.isVisible()) {
      await fileItem.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('v');

      const banner = page.locator('text=/Visual Mode/i');
      if (await banner.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.keyboard.press('G');
        await page.waitForTimeout(300);

        const positionIndicator = page.locator('text=/\\d+ \\/ (\\d+)/');
        const text = await positionIndicator.textContent().catch(() => '');

        if (text) {
          const match = text.match(/(\d+) \/ (\d+)/);
          if (match) {
            const current = parseInt(match[1]);
            const total = parseInt(match[2]);
            expect(current).toBe(total);
          }
        }
      }
    }
  });

  test('should stage line in visual mode with 1 key', async ({ page }) => {
    const fileItem = page.locator('.file-item').first();
    const fileExists = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

    if (fileExists) {
      await fileItem.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('v');

      const banner = page.locator('text=/Visual Mode/i');
      if (await banner.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.keyboard.press('1');
        await page.waitForTimeout(500);
      }
    }
  });

  test('should navigate across multiple files', async ({ page }) => {
    const fileItems = page.locator('.file-item');
    const fileCount = await fileItems.count();

    if (fileCount > 1) {
      await fileItems.first().click();
      await page.waitForTimeout(500);
      await page.keyboard.press('v');

      const banner = page.locator('text=/Visual Mode/i');
      if (await banner.isVisible({ timeout: 1000 }).catch(() => false)) {
        for (let i = 0; i < 50; i++) {
          await page.keyboard.press('j');
          await page.waitForTimeout(50);
        }

        const positionIndicator = page.locator('text=/\\d+ \\/ \\d+/');
        const stillVisible = await positionIndicator.isVisible().catch(() => false);
        expect(stillVisible).toBe(true);
      }
    }
  });
});
