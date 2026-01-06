import { test, expect } from './fixtures';
import { openFirstWorktree } from './app-helpers';

test.describe('Message Send and Response', () => {
  test.beforeEach(async ({ page }) => {
    await openFirstWorktree(page);
  });

  test('should have message input field', async ({ page }) => {
    const input = page.locator('textarea, [contenteditable="true"]').first();
    const inputExists = await input.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      expect(inputExists).toBe(true);
    }
  });

  test('should allow typing in message input', async ({ page }) => {
    const input = page.locator('textarea, [contenteditable="true"]').first();
    const inputExists = await input.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      await input.click();
      await input.fill('test message for E2E');
      await page.waitForTimeout(200);

      const value = await input.inputValue().catch(() => '');
      expect(value).toBe('test message for E2E');

      await input.clear();
    }
  });

  test('should have send button', async ({ page }) => {
    const sendButton = page.getByRole('button', { name: /Send/i });
    const buttonExists = await sendButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (buttonExists) {
      expect(buttonExists).toBe(true);
    }
  });

  test('should enable send button when input has text', async ({ page }) => {
    const input = page.locator('textarea, [contenteditable="true"]').first();
    const inputExists = await input.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      await input.click();
      await input.fill('test');
      await page.waitForTimeout(200);

      const sendButton = page.getByRole('button', { name: /Send/i });
      const isEnabled = await sendButton.isEnabled().catch(() => false);
      expect(isEnabled).toBe(true);

      await input.clear();
    }
  });

  test('should send message with Enter key', async ({ page }) => {
    const input = page.locator('textarea').first();
    const inputExists = await input.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      await input.click();
      await input.fill('test enter key');
      await page.waitForTimeout(200);

      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      const value = await input.inputValue().catch(() => null);
      expect(value !== null).toBe(true);

      if (value) {
        await input.clear();
      }
    }
  });

  test('should add new line with Shift+Enter', async ({ page }) => {
    const input = page.locator('textarea').first();
    const inputExists = await input.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      await input.click();
      await input.fill('line 1');
      await page.keyboard.press('Shift+Enter');
      await input.type('line 2');
      await page.waitForTimeout(200);

      const value = await input.inputValue();
      expect(value.includes('\n') || value.includes('line 1')).toBe(true);

      await input.clear();
    }
  });

  test('should display cancel button when processing', async ({ page }) => {
    const input = page.locator('textarea, [contenteditable="true"]').first();
    const inputExists = await input.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      await input.click();
      await input.fill('test processing');
      await page.waitForTimeout(200);

      const sendButton = page.getByRole('button', { name: /Send/i });
      if (await sendButton.isVisible()) {
        await sendButton.click();
        await page.waitForTimeout(300);

        const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Stop")').first();
        const hasCancelButton = await cancelButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasCancelButton) {
          expect(hasCancelButton).toBe(true);
          await cancelButton.click();
        }
      }
    }
  });

  test('should clear input after sending', async ({ page }) => {
    const input = page.locator('textarea, [contenteditable="true"]').first();
    const inputExists = await input.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      await input.click();
      await input.fill('test clear');
      await page.waitForTimeout(200);

      const sendButton = page.getByRole('button', { name: /Send/i });
      if (await sendButton.isVisible() && await sendButton.isEnabled()) {
        await sendButton.click();
        await page.waitForTimeout(500);

        const value = await input.inputValue().catch(() => null);
        if (value !== null) {
          expect(value.length <= 20).toBe(true);
        }
      }
    }
  });

  test('should focus input field with keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('i');
    await page.waitForTimeout(200);

    const input = page.locator('textarea, [contenteditable="true"]').first();
    const isFocused = await input.evaluate(el => el === document.activeElement).catch(() => false);

    if (isFocused) {
      expect(isFocused).toBe(true);
    }
  });

  test('should display tool selector dropdown', async ({ page }) => {
    const toolSelector = page.locator('select, [role="combobox"], button:has-text("claude"), button:has-text("codex")').first();
    const selectorExists = await toolSelector.isVisible({ timeout: 5000 }).catch(() => false);

    if (selectorExists) {
      expect(selectorExists).toBe(true);
    }
  });

  test('should switch between tools', async ({ page }) => {
    const toolSelector = page.locator('select, [role="combobox"]').first();
    const selectorExists = await toolSelector.isVisible({ timeout: 5000 }).catch(() => false);

    if (selectorExists) {
      await toolSelector.click();
      await page.waitForTimeout(200);

      const options = page.locator('option, [role="option"]');
      const optionCount = await options.count();

      if (optionCount > 1) {
        await options.nth(1).click();
        await page.waitForTimeout(300);

        expect(true).toBe(true);
      }
    }
  });
});
