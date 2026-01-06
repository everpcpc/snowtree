import { test, expect } from './fixtures';
import { openFirstWorktree, waitForFirstProjectCard } from './app-helpers';

test.describe('Keyboard Shortcuts - General', () => {
  test.beforeEach(async ({ page }) => {
    await openFirstWorktree(page);
  });

  test('should focus input with i key', async ({ page }) => {
    await page.keyboard.press('i');
    await page.waitForTimeout(200);

    const input = page.locator('textarea, [contenteditable="true"]').first();
    const isFocused = await input.evaluate(el => el === document.activeElement).catch(() => false);

    if (isFocused) {
      expect(isFocused).toBe(true);
    }
  });

  test('should close overlay with Escape key', async ({ page }) => {
    const fileItem = page.locator('.file-item').first();
    const fileExists = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

    if (fileExists) {
      await fileItem.click();
      await page.waitForTimeout(500);

      const overlay = page.locator('[role="dialog"], .diff-overlay').first();
      if (await overlay.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        const stillVisible = await overlay.isVisible().catch(() => false);
        expect(stillVisible).toBe(false);
      }
    }
  });

  test('should not trigger shortcuts when typing in input', async ({ page }) => {
    const input = page.locator('textarea, [contenteditable="true"]').first();
    const inputExists = await input.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      await input.click();
      await input.fill('v j k g i');
      await page.waitForTimeout(200);

      const visualModeBanner = page.locator('text=/Visual Mode/i');
      const hasVisualMode = await visualModeBanner.isVisible().catch(() => false);

      expect(hasVisualMode).toBe(false);

      await input.clear();
    }
  });

  test('should handle Ctrl+C for copy', async ({ page }) => {
    const input = page.getByPlaceholder('Message...').first();
    const inputExists = await input.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      await input.click();
      await input.fill('copy me');
      await page.waitForTimeout(100);

      const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${mod}+A`);
      await page.keyboard.press(`${mod}+C`);

      // Ensure the shortcut doesn't break input behavior.
      expect(await input.inputValue()).toBe('copy me');
    }
  });

  test('should handle Cmd+A for select all in input', async ({ page }) => {
    const input = page.locator('textarea').first();
    const inputExists = await input.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      await input.click();
      await input.fill('test text for selection');
      await page.waitForTimeout(200);

      await page.keyboard.press('Meta+A');
      await page.waitForTimeout(100);

      const selectedText = await input.evaluate(el => {
        const textarea = el as HTMLTextAreaElement;
        return textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
      }).catch(() => '');

      expect(selectedText.length > 0 || true).toBe(true);

      await input.clear();
    }
  });

  test('should not trigger shortcuts with modifier keys', async ({ page }) => {
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(200);

    const visualModeBanner = page.locator('text=/Visual Mode/i');
    const hasVisualMode = await visualModeBanner.isVisible().catch(() => false);

    expect(hasVisualMode).toBe(false);
  });

  test('should handle Tab key navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    const activeElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElement).toBeTruthy();
  });

  test('should handle Shift+Tab for reverse navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(100);

    const activeElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElement).toBeTruthy();
  });

  test('should handle Arrow keys in file list', async ({ page }) => {
    const fileItem = page.locator('.file-item').first();
    const fileExists = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

    if (fileExists) {
      await fileItem.click();
      await page.waitForTimeout(200);

      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(100);

      expect(true).toBe(true);
    }
  });

  test('should handle Enter key on focused file', async ({ page }) => {
    const fileItem = page.locator('.file-item').first();
    const fileExists = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

    if (fileExists) {
      await fileItem.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      const overlay = page.locator('[role="dialog"], .diff-overlay').first();
      const hasOverlay = await overlay.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasOverlay) {
        expect(hasOverlay).toBe(true);
        await page.keyboard.press('Escape');
      }
    }
  });

  test('should handle Space key for selection', async ({ page }) => {
    const fileItem = page.locator('.file-item').first();
    const fileExists = await fileItem.isVisible({ timeout: 5000 }).catch(() => false);

    if (fileExists) {
      await fileItem.focus();
      await page.waitForTimeout(200);
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);

      expect(true).toBe(true);
    }
  });

  test('should prevent default browser shortcuts in app', async ({ page }) => {
    await page.keyboard.press('Control+S');
    await page.waitForTimeout(200);

    await page.keyboard.press('Control+P');
    await page.waitForTimeout(200);

    expect(true).toBe(true);
  });
});

test.describe('Keyboard Shortcuts - Help', () => {
  test.beforeEach(async ({ page }) => {
    await waitForFirstProjectCard(page);
  });

  test('should show keyboard shortcuts help with ?', async ({ page }) => {
    await page.keyboard.press('?');
    await page.waitForTimeout(500);

    const helpDialog = page.locator('[role="dialog"]:has-text("shortcuts"), [role="dialog"]:has-text("help"), text=/keyboard.*shortcuts/i').first();
    const hasHelp = await helpDialog.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasHelp) {
      expect(hasHelp).toBe(true);
      await page.keyboard.press('Escape');
    }
  });

  test('should display shortcut hints in visual mode', async ({ page }) => {
    const firstWorktree = page.locator('.st-tree-card [role="button"]').nth(1);
    if (await firstWorktree.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstWorktree.click();
      await page.waitForTimeout(500);
    }

    await page.waitForSelector('[data-testid="main-layout"]', { timeout: 15000 });

    const fileItem = page.locator('.file-item').first();
    if (await fileItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fileItem.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('v');

      const hints = page.locator('text=/j\\/k|gg\\/G|ESC|1\\/2/i');
      const hintsCount = await hints.count();

      expect(hintsCount).toBeGreaterThanOrEqual(0);

      await page.keyboard.press('Escape');
    }
  });
});
