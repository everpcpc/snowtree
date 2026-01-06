import { FullConfig } from '@playwright/test';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

let devServerProcess: any = null;

async function globalSetup(config: FullConfig) {
  console.log('[Electron Global Setup] Setting up E2E test environment...');

  // Use an isolated Snowtree directory so Electron tests are reproducible and don't
  // depend on (or mutate) the developer's real ~/.snowtree_dev data.
  process.env.SNOWTREE_DIR = process.env.SNOWTREE_DIR || path.join(process.cwd(), '.snowtree_e2e');
  if (fs.existsSync(process.env.SNOWTREE_DIR)) {
    fs.rmSync(process.env.SNOWTREE_DIR, { recursive: true, force: true });
  }

  console.log('[Electron Global Setup] Building desktop app...');
  const projectRoot = path.join(process.cwd(), '../..');
  execSync('pnpm run build:desktop', { cwd: projectRoot, stdio: 'inherit' });

  console.log('[Electron Global Setup] Starting UI dev server...');
  const devServerUrl = 'http://localhost:4521';
  let reuseExisting = false;
  try {
    execSync(`npx wait-on ${devServerUrl} -t 1500`, { stdio: 'ignore' });
    reuseExisting = true;
  } catch {
    reuseExisting = false;
  }

  if (reuseExisting) {
    console.log('[Electron Global Setup] Reusing existing dev server:', devServerUrl);
  } else {
    devServerProcess = spawn('pnpm', ['dev'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      detached: true,
    });

    console.log('[Electron Global Setup] Waiting for dev server to be ready...');
    execSync(`npx wait-on ${devServerUrl} -t 60000`, { stdio: 'inherit' });
  }

  console.log('[Electron Global Setup] Creating test repository...');
  const setupScript = path.join(process.cwd(), 'scripts/setup-e2e-repo.mjs');
  execSync(`node ${setupScript}`, { stdio: 'inherit' });

  console.log('[Electron Global Setup] Initializing app database and inserting test project...');
  const { _electron: electron } = await import('playwright');

  const testRepoPath = path.join(process.cwd(), '.e2e-test-repo');
  const app = await electron.launch({
    args: [
      path.join(projectRoot, 'packages/desktop/dist/index.js'),
      '--snowtree-dev',
      '--disable-gpu',
      '--no-sandbox',
    ],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      SNOWTREE_DIR: process.env.SNOWTREE_DIR,
    },
    timeout: 120000,
  });

  await app.evaluate(async ({ app }) => app.whenReady());
  const page = await app.waitForEvent('window', { timeout: 120000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('text=/Workspaces|Failed to Load Workspaces/i', { timeout: 30000 });

  await page.evaluate(async (repoPath) => {
    const api = (window as any).electronAPI;
    const res = await api.projects.getAll();
    if (!res?.success) throw new Error(res?.error || 'projects.getAll failed');
    const projects = Array.isArray(res.data) ? res.data : [];
    const exists = projects.some((p: any) => p?.path === repoPath);
    if (!exists) {
      const created = await api.projects.create({ name: 'E2E Test Repository', path: repoPath, active: true });
      if (!created?.success) throw new Error(created?.error || 'projects.create failed');
    }
  }, testRepoPath);

  // Force the renderer to reload so Sidebar re-fetches projects/worktrees.
  await page.reload();
  await page.waitForSelector('text=/E2E Test Repository/i', { timeout: 30000 });

  await app.close();

  console.log('[Electron Global Setup] Setup complete!');

  if (devServerProcess) {
    (global as any).__DEV_SERVER__ = devServerProcess;
  }
}

export default globalSetup;
