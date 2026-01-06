import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('[Global Teardown] Cleaning up E2E test data...');

  const devServerProcess = (global as any).__DEV_SERVER__;
  if (devServerProcess) {
    console.log('[Global Teardown] Stopping dev server...');
    try {
      process.kill(-devServerProcess.pid);
    } catch (e) {
      console.log('[Global Teardown] Dev server already stopped');
    }
  }

  const testRepoPath = path.join(process.cwd(), '.e2e-test-repo');
  const snowtreeDir = process.env.SNOWTREE_DIR || path.join(process.env.HOME || '', '.snowtree_dev');

  if (fs.existsSync(testRepoPath)) {
    console.log('[Global Teardown] Removing test repository...');
    fs.rmSync(testRepoPath, { recursive: true, force: true });
    console.log('[Global Teardown] Test repository removed');
  }

  // For E2E, prefer a disposable SNOWTREE_DIR (e.g. ./packages/ui/.snowtree_e2e).
  // If we are using such a directory, remove it to keep runs reproducible.
  try {
    const cwd = process.cwd();
    const normalized = snowtreeDir.replace(/\/+$/, '');
    const isWorkspaceLocal = normalized.startsWith(cwd.replace(/\/+$/, '') + path.sep);
    const looksLikeE2E = normalized.includes(`${path.sep}.snowtree_e2e`);
    if (isWorkspaceLocal && looksLikeE2E && fs.existsSync(normalized)) {
      console.log('[Global Teardown] Removing SNOWTREE_DIR:', normalized);
      fs.rmSync(normalized, { recursive: true, force: true });
    }
  } catch (e) {
    console.log('[Global Teardown] SNOWTREE_DIR cleanup skipped:', e instanceof Error ? e.message : String(e));
  }

  console.log('[Global Teardown] Teardown complete!');
}

export default globalTeardown;
