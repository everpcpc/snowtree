import { expect, type Locator, type Page } from '@playwright/test';

export async function gotoApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('text=Workspaces')).toBeVisible({ timeout: 15000 });
}

export async function waitForFirstProjectCard(page: Page): Promise<Locator> {
  const emptyState = page.locator('text=No repositories yet.');
  const firstProjectCard = page.locator('.st-tree-card').first();

  await gotoApp(page);

  // The UI may briefly render the empty state before the initial IPC call resolves.
  // For E2E we require a project to be present; if it never shows up, fail loudly.
  await expect(emptyState).toHaveCount(0, { timeout: 15000 });
  await expect(firstProjectCard).toBeVisible({ timeout: 15000 });

  return firstProjectCard;
}

export async function openFirstWorktree(page: Page): Promise<void> {
  const firstProjectCard = await waitForFirstProjectCard(page);

  // In the Sidebar, the first role=button inside a project card is the project header,
  // the second is the first worktree row.
  const firstWorktreeRow = firstProjectCard.locator('[role="button"]').nth(1);
  await expect(firstWorktreeRow).toBeVisible({ timeout: 15000 });

  await firstWorktreeRow.click();
  await expect(page.locator('[data-testid="main-layout"]')).toBeVisible({ timeout: 20000 });
}

