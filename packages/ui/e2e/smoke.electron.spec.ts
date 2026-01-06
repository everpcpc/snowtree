import { test, expect } from '@playwright/test';
import { launchElectronApp, closeElectronApp } from './electron-helpers';

test.describe('Electron Smoke Tests', () => {
  test('should launch Electron app and access electronAPI', async () => {
    const { app, page } = await launchElectronApp();

    const hasElectronAPI = await page.evaluate(() => {
      return typeof (window as any).electronAPI !== 'undefined';
    });

    expect(hasElectronAPI).toBe(true);

    const workspacesText = page.locator('text=/Workspaces|Failed to Load Workspaces/i').first();
    const isVisible = await workspacesText.isVisible({ timeout: 10000 }).catch(() => false);

    expect(isVisible).toBe(true);

    await closeElectronApp(app);
  });

  test('should load E2E test repository from database', async () => {
    const { app, page } = await launchElectronApp();

    const repoCard = page.locator('text=/E2E Test Repository/i').first();
    const hasRepo = await repoCard.isVisible({ timeout: 10000 }).catch(() => false);

    expect(hasRepo).toBe(true);

    await closeElectronApp(app);
  });

  test('should create session when clicking worktree', async () => {
    const { app, page } = await launchElectronApp();

    const newWorkspaceButton = page.locator('.st-tree-card').first().locator('button[title="New workspace"]');
    await expect(newWorkspaceButton).toBeVisible({ timeout: 20000 });
    await newWorkspaceButton.click();

    const mainLayout = page.locator('[data-testid="main-layout"]');
    await expect(mainLayout).toBeVisible({ timeout: 20000 });

    await closeElectronApp(app);
  });
});
