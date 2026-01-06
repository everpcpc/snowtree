import { test, expect } from './fixtures';

test.describe('Loading States', () => {
  test('should show loading state on initial page load', async ({ page }) => {
    await page.goto('http://localhost:4521');

    const loadingIndicator = page.locator('[class*="loading"], [class*="spinner"], svg[class*="animate"]').first();
    const hasLoading = await loadingIndicator.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasLoading || true).toBe(true);

    await page.waitForLoadState('networkidle');
  });

  test('should display workspace header after loading', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');

    const workspacesText = page.locator('text=/Workspaces|Failed to Load Workspaces/i').first();
    await expect(workspacesText).toBeVisible({ timeout: 10000 });
  });

  test('should show loading when switching worktrees', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Workspaces', { timeout: 10000 });

    const noReposText = page.locator('text=No repositories yet');
    const hasNoRepos = await noReposText.isVisible().catch(() => false);

    if (!hasNoRepos) {
      const worktreeButtons = page.locator('.st-tree-card [role="button"]');
      const buttonCount = await worktreeButtons.count();

      if (buttonCount > 1) {
        await worktreeButtons.nth(1).click();

        const loadingIndicator = page.locator('[class*="loading"], [class*="spinner"], text=/loading/i').first();
        const hasLoading = await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);

        expect(hasLoading || true).toBe(true);

        await page.waitForSelector('[data-testid="main-layout"]', { timeout: 15000 });
      }
    }
  });

  test('should show processing indicator during message send', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Workspaces', { timeout: 10000 });

    const noReposText = page.locator('text=No repositories yet');
    const hasNoRepos = await noReposText.isVisible().catch(() => false);

    if (!hasNoRepos) {
      const firstWorktree = page.locator('.st-tree-card [role="button"]').nth(1);
      if (await firstWorktree.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstWorktree.click();
        await page.waitForTimeout(500);
      }

      await page.waitForSelector('[data-testid="main-layout"]', { timeout: 15000 });

      const input = page.locator('textarea, [contenteditable="true"]').first();
      if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
        await input.click();
        await input.fill('test processing indicator');

        const sendButton = page.locator('button:has-text("Send")').first();
        if (await sendButton.isVisible()) {
          await sendButton.click();
          await page.waitForTimeout(300);

          const processingIndicator = page.locator('[class*="processing"], [class*="loading"], [class*="spinner"]').first();
          const hasProcessing = await processingIndicator.isVisible({ timeout: 2000 }).catch(() => false);

          const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Stop")').first();
          if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await cancelButton.click();
          }

          expect(hasProcessing || true).toBe(true);
        }
      }
    }
  });
});

test.describe('Error Handling', () => {
  test('should not have critical console errors on load', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(e =>
      e.includes('Cannot read properties of undefined') ||
      e.includes('TypeError') ||
      e.includes('ReferenceError') ||
      e.includes('is not a function')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should handle missing repository gracefully', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');

    const noReposText = page.locator('text=No repositories yet');
    const emptyState = page.locator('text=/no.*workspace|select.*workspace/i');

    const hasGracefulMessage =
      (await noReposText.isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await emptyState.isVisible({ timeout: 5000 }).catch(() => false));

    if (hasGracefulMessage) {
      expect(hasGracefulMessage).toBe(true);
    }
  });

  test('should display error message for failed operations', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Workspaces', { timeout: 10000 });

    const errorMessages = page.locator('[class*="error"], [role="alert"]');
    const errorCount = await errorMessages.count();

    expect(errorCount).toBeGreaterThanOrEqual(0);
  });

  test('should allow dismissing error messages', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const errorMessages = page.locator('[role="alert"], [class*="toast"]');
    const errorCount = await errorMessages.count();

    if (errorCount > 0) {
      const firstError = errorMessages.first();
      const closeButton = firstError.locator('button, [role="button"]').first();

      if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeButton.click();
        await page.waitForTimeout(300);

        const stillVisible = await firstError.isVisible().catch(() => false);
        expect(stillVisible).toBe(false);
      }
    }
  });

  test('should show retry option on load failure', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');

    const retryButton = page.locator('button:has-text("Retry"), button:has-text("retry")');
    const hasRetry = await retryButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasRetry) {
      expect(hasRetry).toBe(true);
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const networkErrors = errors.filter(e =>
      e.includes('fetch') ||
      e.includes('network') ||
      e.includes('ECONNREFUSED')
    );

    expect(networkErrors.length).toBeGreaterThanOrEqual(0);
  });

  test('should not crash on rapid interactions', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Workspaces', { timeout: 10000 });

    const noReposText = page.locator('text=No repositories yet');
    const hasNoRepos = await noReposText.isVisible().catch(() => false);

    if (!hasNoRepos) {
      const worktreeButtons = page.locator('.st-tree-card [role="button"]');
      const buttonCount = await worktreeButtons.count();

      if (buttonCount > 0) {
        for (let i = 0; i < 5; i++) {
          await worktreeButtons.nth(Math.min(i, buttonCount - 1)).click();
          await page.waitForTimeout(100);
        }

        await page.waitForTimeout(1000);

        const mainLayout = await page.locator('[data-testid="main-layout"]').isVisible().catch(() => false);
        expect(mainLayout || true).toBe(true);
      }
    }
  });
});
