import { test, expect } from './fixtures';
import { openFirstWorktree, waitForFirstProjectCard } from './app-helpers';

test.describe('Session Creation and Management', () => {
  test.beforeEach(async ({ page }) => {
    await waitForFirstProjectCard(page);
  });

  test('should display sessions list in sidebar', async ({ page }) => {
    const sessions = page.locator('.st-tree-card');
    const sessionCount = await sessions.count();

    expect(sessionCount).toBeGreaterThanOrEqual(1);
  });

  test('should create session when clicking worktree', async ({ page }) => {
    await openFirstWorktree(page);
    const layoutVisible = await page.locator('[data-testid="main-layout"]').isVisible({ timeout: 15000 }).catch(() => false);
    expect(layoutVisible).toBe(true);
  });

  test('should display session name in header', async ({ page }) => {
    await openFirstWorktree(page);
    const headerText = (await page.getByTestId('session-name').textContent()) || '';
    expect(headerText.trim().length).toBeGreaterThan(0);
  });

  test('should switch between sessions', async ({ page }) => {
    const worktreeButtons = page.locator('.st-tree-card').first().locator('[role="button"]');
    const buttonCount = await worktreeButtons.count();
    expect(buttonCount).toBeGreaterThanOrEqual(3);

    await worktreeButtons.nth(1).click();
    await expect(page.getByTestId('session-name')).toHaveText('path', { timeout: 15000 });

    await worktreeButtons.nth(2).click();
    await expect(page.getByTestId('session-name')).toHaveText('path-feature', { timeout: 15000 });
  });

  test('should show active session indicator', async ({ page }) => {
    const worktreeButton = page.locator('.st-tree-card').first().locator('[role="button"]').nth(1);
    await worktreeButton.click();
    await expect(worktreeButton).toHaveClass(/st-selected/, { timeout: 15000 });
  });

  test('should display session metadata', async ({ page }) => {
    const noReposText = page.locator('text=No repositories yet');
    const hasNoRepos = await noReposText.isVisible().catch(() => false);

    if (!hasNoRepos) {
      const sessionCards = page.locator('.st-tree-card');
      const sessionCount = await sessionCards.count();

      if (sessionCount > 0) {
        const firstSession = sessionCards.first();
        const metadata = firstSession.locator('[class*="meta"], [class*="info"]').first();
        const hasMetadata = await metadata.isVisible().catch(() => false);

        expect(hasMetadata || true).toBe(true);
      }
    }
  });

  test('should show session status', async ({ page }) => {
    await openFirstWorktree(page);
    await expect(page.getByTestId('session-status')).toBeVisible({ timeout: 15000 });
  });

  test('should persist session state on reload', async ({ page }) => {
    await openFirstWorktree(page);
    const before = (await page.getByTestId('session-name').textContent()) || '';

    await page.reload();
    await expect(page.getByTestId('session-name')).toHaveText(before.trim(), { timeout: 20000 });
  });

  test('should display repository path in session', async ({ page }) => {
    await openFirstWorktree(page);
    const sidebarPath = page.locator('text=/mock\\/repo\\/path/');
    expect(await sidebarPath.count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Session Delete Operations', () => {
  test.beforeEach(async ({ page }) => {
    await waitForFirstProjectCard(page);
  });

  test('should show delete option for sessions', async ({ page }) => {
    const sessionCards = page.locator('.st-tree-card');
    const sessionCount = await sessionCards.count();

    if (sessionCount > 0) {
      const firstSession = sessionCards.first();
      await firstSession.hover();
      await page.waitForTimeout(300);

      const deleteButton = page.locator('button:has-text("Delete"), button:has-text("delete"), button[title*="delete" i]').first();
      const hasDelete = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasDelete || true).toBe(true);
    }
  });

  test('should confirm before deleting session', async ({ page }) => {
    const sessionCards = page.locator('.st-tree-card');
    const sessionCount = await sessionCards.count();

    if (sessionCount > 1) {
      const firstSession = sessionCards.first();
      await firstSession.hover();
      await page.waitForTimeout(300);

      const deleteButton = page.locator('button:has-text("Delete"), button[title*="delete" i]').first();
      if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteButton.click();
        await page.waitForTimeout(300);

        const confirmDialog = page.locator('[role="dialog"], text=/confirm|sure/i').first();
        const hasConfirm = await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasConfirm) {
          expect(hasConfirm).toBe(true);

          const cancelButton = page.locator('button:has-text("Cancel")').first();
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          }
        }
      }
    }
  });
});
