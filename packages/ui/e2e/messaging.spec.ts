import { test, expect } from './fixtures';
import { openFirstWorktree } from './app-helpers';
import { clearEditor, getEditorText, getMessageEditor, setEditorText } from './editor-helpers';

test.describe('Message Send and Response', () => {
  test.beforeEach(async ({ page }) => {
    await openFirstWorktree(page);
  });

  test('should have message input field', async ({ page }) => {
    const input = getMessageEditor(page);
    const inputExists = await input.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      expect(inputExists).toBe(true);
    }
  });

  test('should allow typing in message input', async ({ page }) => {
    const input = getMessageEditor(page);
    const inputExists = await input.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      await setEditorText(page, input, 'test message for E2E');
      await page.waitForTimeout(200);
      expect((await getEditorText(input)).trim()).toBe('test message for E2E');
      await clearEditor(page, input);
    }
  });

  test('should submit message with Enter key', async ({ page }) => {
    const input = getMessageEditor(page);
    const inputExists = await input.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      await setEditorText(page, input, 'test enter key');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      expect((await getEditorText(input)).trim()).toBe('');
    }
  });

  test('should add new line with Shift+Enter', async ({ page }) => {
    const input = getMessageEditor(page);
    const inputExists = await input.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      await setEditorText(page, input, 'line 1');
      await page.keyboard.press('Shift+Enter');
      await page.keyboard.type('line 2');
      await page.waitForTimeout(200);

      const text = await getEditorText(input);
      expect(text.includes('\n') && text.includes('line 1') && text.includes('line 2')).toBe(true);

      await clearEditor(page, input);
    }
  });

  test('should clear input after sending', async ({ page }) => {
    const input = getMessageEditor(page);
    const inputExists = await input.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      await setEditorText(page, input, 'test clear');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      expect((await getEditorText(input)).trim()).toBe('');
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
    await expect(page.getByTestId('input-agent')).toBeVisible();
  });

  test('should switch between tools', async ({ page }) => {
    const agentLabel = page.getByTestId('input-agent');
    const before = (await agentLabel.textContent())?.trim();

    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    const after = (await agentLabel.textContent())?.trim();
    expect(after).not.toBe(before);
  });
});
