import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup-electron.ts',
  globalTeardown: './e2e/global-teardown.ts',

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

  reporter: [
    ['html'],
    ['list'],
    process.env.CI ? ['github'] : ['line']
  ],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'electron',
      testMatch: '**/*.electron.spec.ts',
    },
  ],
});
