import type { Locator, Page } from '@playwright/test';

export function getMessageEditor(page: Page): Locator {
  return page.getByTestId('input-editor');
}

export async function setEditorText(page: Page, editor: Locator, text: string): Promise<void> {
  await editor.click();
  await editor.fill(text);
}

export async function getEditorText(editor: Locator): Promise<string> {
  return editor.evaluate((el) => (el as HTMLElement).innerText || '');
}

export async function clearEditor(page: Page, editor: Locator): Promise<void> {
  await editor.click();
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${modifier}+A`);
  await page.keyboard.press('Backspace');
}
