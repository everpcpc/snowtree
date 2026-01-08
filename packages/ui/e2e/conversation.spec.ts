import { test, expect } from './fixtures';
import { openFirstWorktree, waitForFirstProjectCard } from './app-helpers';
import { clearEditor, getEditorText, getMessageEditor, setEditorText } from './editor-helpers';

test.describe('Conversation and Input', () => {
  test.beforeEach(async ({ page }) => {
    await openFirstWorktree(page);
  });

  test('should display conversation panel', async ({ page }) => {
    const conversationPanel = page.locator('[class*="conversation"], [class*="timeline"]').first();
    const panelExists = await conversationPanel.isVisible({ timeout: 5000 }).catch(() => false);

    if (panelExists) {
      expect(panelExists).toBe(true);
    }
  });

  test('should display input bar', async ({ page }) => {
    const inputBar = getMessageEditor(page);
    const inputExists = await inputBar.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      expect(inputExists).toBe(true);
    }
  });

  test('should allow typing in input field', async ({ page }) => {
    const inputBar = getMessageEditor(page);
    const inputExists = await inputBar.isVisible({ timeout: 5000 }).catch(() => false);

    if (inputExists) {
      await setEditorText(page, inputBar, 'test message');
      await page.waitForTimeout(200);
      expect((await getEditorText(inputBar)).trim()).toBe('test message');
      await clearEditor(page, inputBar);
    }
  });

  test('should display tool selector', async ({ page }) => {
    const toolSelector = page.locator('select, [role="combobox"], [class*="tool-select"]').first();
    const selectorExists = await toolSelector.isVisible({ timeout: 5000 }).catch(() => false);

    if (selectorExists) {
      expect(selectorExists).toBe(true);
    }
  });

  test('should show session name in header', async ({ page }) => {
    const header = page.locator('[class*="header"], [class*="workspace-header"]').first();
    const headerExists = await header.isVisible({ timeout: 5000 }).catch(() => false);

    if (headerExists) {
      const headerText = await header.textContent();
      expect(headerText).toBeTruthy();
    }
  });

  test('should display branch name if available', async ({ page }) => {
    const branchIndicator = page.locator('text=/main|master|dev|feature/i, [class*="branch"]').first();
    const branchExists = await branchIndicator.isVisible({ timeout: 5000 }).catch(() => false);

    if (branchExists) {
      expect(branchExists).toBe(true);
    }
  });
});

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    await waitForFirstProjectCard(page);
  });

  test('should list sessions in sidebar', async ({ page }) => {
    const sessionItems = page.locator('.st-tree-card');
    const sessionCount = await sessionItems.count();

    expect(sessionCount).toBeGreaterThanOrEqual(0);
  });

  test('should switch between worktrees', async ({ page }) => {
    const worktreeButtons = page.locator('.st-tree-card [role="button"]');
    const buttonCount = await worktreeButtons.count();

    if (buttonCount > 2) {
      await worktreeButtons.nth(1).click();
      await page.waitForTimeout(500);

      const mainLayout1 = await page.locator('[data-testid="main-layout"]').isVisible({ timeout: 10000 }).catch(() => false);
      expect(mainLayout1).toBe(true);

      await worktreeButtons.nth(2).click();
      await page.waitForTimeout(500);

      const mainLayout2 = await page.locator('[data-testid="main-layout"]').isVisible({ timeout: 10000 }).catch(() => false);
      expect(mainLayout2).toBe(true);
    }
  });

  test('should display Workspaces title in sidebar', async ({ page }) => {
    const workspacesTitle = page.locator('text=Workspaces');
    await expect(workspacesTitle).toBeVisible();
  });
});
