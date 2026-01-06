import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function launchElectronApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const projectRoot = path.join(__dirname, '../../..');
  const snowtreeDir = process.env.SNOWTREE_DIR || path.join(projectRoot, 'packages/ui/.snowtree_e2e');

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
      DISPLAY: ':99',
      SNOWTREE_DIR: snowtreeDir,
    },
    executablePath: process.env.CI ? undefined : undefined,
    timeout: 30000,
  });

  await app.evaluate(async ({ app }) => {
    return app.whenReady();
  });

  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  return { app, page };
}

export async function closeElectronApp(app: ElectronApplication): Promise<void> {
  await app.close();
}
