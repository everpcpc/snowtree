import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const e2eDir = path.join(__dirname, '../e2e');

const browserSpecs = fs.readdirSync(e2eDir)
  .filter(f => f.endsWith('.spec.ts') && !f.includes('.electron.'))
  .filter(f => f !== 'global-setup.ts' && f !== 'global-teardown.ts');

console.log(`Found ${browserSpecs.length} browser spec files to convert`);

for (const specFile of browserSpecs) {
  const baseName = specFile.replace('.spec.ts', '');
  const electronFile = `${baseName}.electron.spec.ts`;
  const electronPath = path.join(e2eDir, electronFile);

  const content = fs.readFileSync(path.join(e2eDir, specFile), 'utf-8');

  let electronContent = `import { test, expect } from '@playwright/test';
import { launchElectronApp, closeElectronApp } from './electron-helpers';

`;

  const lines = content.split('\n');
  let inBeforeEach = false;
  let braceCount = 0;
  let skipUntilCloseBrace = false;
  let processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('import') && line.includes('@playwright/test')) {
      continue;
    }

    if (line.trim().startsWith('test.beforeEach')) {
      inBeforeEach = true;
      braceCount = 0;
      skipUntilCloseBrace = true;
      continue;
    }

    if (skipUntilCloseBrace) {
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      if (braceCount === 0 && line.includes('});')) {
        skipUntilCloseBrace = false;
        inBeforeEach = false;
      }
      continue;
    }

    if (line.includes("test('") || line.includes('test("')) {
      processedLines.push(line.replace(
        /test\((['"])([^'"]+)\1, async \(\{ page \}\) => \{/,
        `test('$2', async () => {
    const { app, page } = await launchElectronApp();

    const firstWorktree = page.locator('.st-tree-card [role="button"]').first();
    if (await firstWorktree.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstWorktree.click();
      await page.waitForTimeout(2000);
    }

    await page.waitForSelector('[data-testid="main-layout"]', { timeout: 15000 }).catch(() => {});
`
      ));
      continue;
    }

    if (line.includes('test.skip()')) {
      continue;
    }

    if (line.trim() === '});' && processedLines.length > 0) {
      const lastNonEmpty = processedLines.findLastIndex(l => l.trim() !== '');
      if (lastNonEmpty >= 0 && !processedLines[lastNonEmpty].includes('closeElectronApp')) {
        processedLines.splice(lastNonEmpty + 1, 0, '    await closeElectronApp(app);');
      }
    }

    processedLines.push(line);
  }

  electronContent += processedLines.join('\n');

  fs.writeFileSync(electronPath, electronContent);
  console.log(`✓ Created ${electronFile}`);
}

console.log('\nConversion complete!');
